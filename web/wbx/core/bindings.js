import { assign, evaluate, getExpressionDeps } from '@wbx/core/evaluator.js'

export const interpolate = (text, instance, locals = {}) => {
    return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
        const value = evaluate(expression, instance, locals)
        return value == null ? '' : String(value)
    })
}

const getInterpolationExpressions = (text) => {
    return [...text.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1])
}

export const addBinding = (bindings, update, deps = []) => {
    bindings.push({ update, deps })
    update()
}

export const bindTextNodes = (root, instance, locals = {}, bindings = instance.bindings) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const textNodes = []

    while (walker.nextNode()) textNodes.push(walker.currentNode)

    for (const textNode of textNodes) {
        const templateText = textNode.textContent
        if (!templateText.includes('{{')) continue

        const update = () => {
            textNode.textContent = interpolate(templateText, instance, locals)
        }
        const deps = getInterpolationExpressions(templateText)
            .flatMap((expression) => getExpressionDeps(expression, instance))

        addBinding(bindings, update, deps)
    }
}

export const bindModels = (root, instance) => {
    const elements = root.querySelectorAll?.('[sync], [w-model]') || []

    for (const element of elements) {
        const path = element.getAttribute('sync') || element.getAttribute('w-model')
        const eventName = getSyncEventName(element)
        const update = () => {
            setElementValue(element, evaluate(path, instance))
        }

        element.addEventListener(eventName, () => {
            assign(path, getElementValue(element), instance)
        })

        addBinding(instance.bindings, update, getExpressionDeps(path, instance))
        element.removeAttribute('sync')
        element.removeAttribute('w-model')
    }
}

const getSyncEventName = (element) => {
    const tagName = element.tagName.toLowerCase()
    const type = element.type

    if (tagName === 'select' || type === 'checkbox' || type === 'radio') {
        return 'change'
    }

    return 'input'
}

const getElementValue = (element) => {
    const tagName = element.tagName.toLowerCase()

    if (element.type === 'checkbox') return element.checked
    if (element.type === 'radio') return element.value

    if (tagName === 'select' && element.multiple) {
        return [...element.selectedOptions].map((option) => option.value)
    }

    if (element.type === 'number' || element.type === 'range') {
        return element.value === '' ? null : Number(element.value)
    }

    return element.value
}

const setElementValue = (element, value) => {
    const tagName = element.tagName.toLowerCase()

    if (element.type === 'checkbox') {
        element.checked = Boolean(value)
        return
    }

    if (element.type === 'radio') {
        element.checked = element.value === String(value)
        return
    }

    if (tagName === 'select' && element.multiple) {
        const values = new Set((value || []).map(String))
        for (const option of element.options) {
            option.selected = values.has(option.value)
        }
        return
    }

    element.value = value ?? ''
}

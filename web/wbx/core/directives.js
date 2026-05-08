import { addBinding } from '@wbx/core/bindings.js'
import { evaluate, getExpressionDeps } from '@wbx/core/evaluator.js'

const keyAliases = {
    enter: 'Enter',
    esc: 'Escape',
    escape: 'Escape',
    tab: 'Tab',
    space: ' ',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    delete: 'Delete',
    backspace: 'Backspace'
}

const booleanAttributes = new Set([
    'checked',
    'disabled',
    'hidden',
    'multiple',
    'open',
    'readonly',
    'required',
    'selected'
])

const eventOptions = ['capture', 'once', 'passive']
const eventGuards = ['prevent', 'stop', 'self']
const expressionDirectives = new Set([
    'text',
    'html',
    'show',
    'class',
    'style',
    'ref',
    'effect',
    'cloak'
])

const splitDirectiveValue = (value) => {
    const [base, ...modifiers] = value.split('.')
    return {
        base,
        modifiers
    }
}

const getDirective = (attributeName, availableDirectives = {}) => {
    if (attributeName.startsWith('@')) {
        const { base, modifiers } = splitDirectiveValue(attributeName.slice(1))
        if (availableDirectives[base]) {
            return { name: base, arg: null, modifiers }
        }

        return { name: 'on', arg: base, modifiers }
    }

    if (attributeName.startsWith(':')) {
        const { base, modifiers } = splitDirectiveValue(attributeName.slice(1))
        if (expressionDirectives.has(base) || availableDirectives[base]) {
            return { name: base, arg: null, modifiers }
        }

        return { name: 'bind', arg: base, modifiers }
    }

    if (attributeName.startsWith('w-on:')) {
        const { base, modifiers } = splitDirectiveValue(attributeName.slice(5))
        return { name: 'on', arg: base, modifiers }
    }

    if (attributeName.startsWith('w-bind:')) {
        const { base, modifiers } = splitDirectiveValue(attributeName.slice(7))
        return { name: 'bind', arg: base, modifiers }
    }

    if (attributeName.startsWith('w-')) {
        const body = attributeName.slice(2)
        const colonIndex = body.indexOf(':')
        const directiveName = colonIndex >= 0 ? body.slice(0, colonIndex) : body
        const rawArg = colonIndex >= 0 ? body.slice(colonIndex + 1) : ''
        const { base, modifiers } = splitDirectiveValue(rawArg)

        return {
            name: directiveName,
            arg: base || null,
            modifiers
        }
    }

    return null
}

export const getDirectiveName = (attributeName) => {
    return getDirective(attributeName)?.name || null
}

const getDeps = (expression, instance) => {
    return expression ? getExpressionDeps(expression, instance) : []
}

const bindReactiveDirective = (instance, expression, update) => {
    addBinding(instance.bindings, () => update(evaluate(expression, instance)), getDeps(expression, instance))
}

const setAttributeValue = (el, name, value) => {
    if (name in el && name !== 'list' && name !== 'type') {
        el[name] = value
    }

    if (booleanAttributes.has(name)) {
        el.toggleAttribute(name, Boolean(value))
        return
    }

    if (value === false || value == null) {
        el.removeAttribute(name)
        return
    }

    el.setAttribute(name, String(value))
}

const normalizeClassValue = (value) => {
    if (!value) return []
    if (typeof value === 'string') return value.split(/\s+/).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(normalizeClassValue)
    if (typeof value === 'object') {
        return Object.entries(value)
            .filter(([, isEnabled]) => Boolean(isEnabled))
            .map(([className]) => className)
    }

    return []
}

const setStyleValue = (el, value) => {
    if (typeof value === 'string') {
        el.style.cssText = value
        return
    }

    if (!value || typeof value !== 'object') return

    for (const [name, nextValue] of Object.entries(value)) {
        el.style[name] = nextValue == null ? '' : String(nextValue)
    }
}

const shouldRunEvent = (event, modifiers) => {
    const keyModifiers = modifiers.filter((modifier) => keyAliases[modifier] || modifier.length === 1)

    if (keyModifiers.length && !keyModifiers.some((modifier) => {
        return event.key === (keyAliases[modifier] || modifier)
    })) {
        return false
    }

    if (modifiers.includes('self') && event.target !== event.currentTarget) return false
    if (modifiers.includes('ctrl') && !event.ctrlKey) return false
    if (modifiers.includes('shift') && !event.shiftKey) return false
    if (modifiers.includes('alt') && !event.altKey) return false
    if (modifiers.includes('meta') && !event.metaKey) return false

    return true
}

const builtInDirectives = {
    on(el, expression, ctx, { evaluate }, directive) {
        const eventName = directive.arg
        if (!eventName) return

        const options = Object.fromEntries(
            eventOptions.map((option) => [option, directive.modifiers.includes(option)])
        )

        el.addEventListener(eventName, (event) => {
            if (!shouldRunEvent(event, directive.modifiers)) return

            if (directive.modifiers.includes('prevent')) event.preventDefault()
            if (directive.modifiers.includes('stop')) event.stopPropagation()

            const result = evaluate(expression, ctx, { $event: event })
            if (typeof result === 'function') result(event)
        }, options)
    },

    click(el, expression, ctx, api) {
        builtInDirectives.on(el, expression, ctx, api, {
            arg: 'click',
            modifiers: []
        })
    },

    bind(el, expression, ctx, _api, directive) {
        if (!directive.arg) return

        if (directive.arg === 'class') {
            builtInDirectives.class(el, expression, ctx)
            return
        }

        if (directive.arg === 'style') {
            builtInDirectives.style(el, expression, ctx)
            return
        }

        bindReactiveDirective(ctx, expression, (value) => {
            setAttributeValue(el, directive.arg, value)
        })
    },

    text(el, expression, ctx) {
        bindReactiveDirective(ctx, expression, (value) => {
            el.textContent = value == null ? '' : String(value)
        })
    },

    html(el, expression, ctx) {
        bindReactiveDirective(ctx, expression, (value) => {
            el.innerHTML = value == null ? '' : String(value)
        })
    },

    show(el, expression, ctx) {
        const initialDisplay = el.style.display === 'none' ? '' : el.style.display

        bindReactiveDirective(ctx, expression, (value) => {
            el.style.display = value ? initialDisplay : 'none'
        })
    },

    class(el, expression, ctx) {
        let previousClasses = []

        bindReactiveDirective(ctx, expression, (value) => {
            for (const className of previousClasses) {
                el.classList.remove(className)
            }

            previousClasses = normalizeClassValue(value)

            for (const className of previousClasses) {
                el.classList.add(className)
            }
        })
    },

    style(el, expression, ctx) {
        bindReactiveDirective(ctx, expression, (value) => {
            setStyleValue(el, value)
        })
    },

    ref(el, expression, ctx) {
        ctx.refs ||= {}
        ctx.refs[evaluate(expression, ctx)] = el
    },

    effect(_el, expression, ctx) {
        bindReactiveDirective(ctx, expression, () => {})
    },

    cloak(el) {
        el.removeAttribute(':cloak')
        el.removeAttribute('w-cloak')
    }
}

export const loadGlobalDirectives = async () => {
    try {
        const module = await import('@directives/index.js')
        return module.default || module.directives || {}
    } catch {
        return {}
    }
}

export const bindDirectives = (root, instance, app, globalDirectives = {}) => {
    const directives = {
        ...builtInDirectives,
        ...globalDirectives,
        ...(app.directives || {})
    }
    const elements = [root, ...(root.querySelectorAll?.('*') || [])].filter(Boolean)

    for (const element of elements) {
        if (!element.attributes) continue

        for (const attribute of [...element.attributes]) {
            const directive = getDirective(attribute.name, directives)
            if (!directive) continue

            const handler = directives[directive.name]
            if (!handler) {
                console.warn(`Directive "${attribute.name}" is not registered.`)
                continue
            }

            handler(element, attribute.value, instance, { evaluate }, directive)
            element.removeAttribute(attribute.name)
        }
    }
}

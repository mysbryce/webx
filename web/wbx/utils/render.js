import getFileContent from '@wbx/utils/getFileContent.js'
import { bindModels, bindTextNodes } from '@wbx/core/bindings.js'
import { createInstance } from '@wbx/core/component.js'
import { processControlFlow } from '@wbx/core/controlFlow.js'
import { bindDirectives, loadGlobalDirectives } from '@wbx/core/directives.js'
import { reportError } from '@wbx/core/errorOverlay.js'
import { evaluate, getExpressionDeps } from '@wbx/core/evaluator.js'
import { mountInstance, registerInstanceRoots } from '@wbx/core/lifecycle.js'
import { getPropBindingsFromNode, getPropsFromNode } from '@wbx/core/props.js'
import { processScopedStyles } from '@wbx/core/styles.js'

let globalDirectives = null

const getGlobalDirectives = async () => {
    if (!globalDirectives) {
        globalDirectives = await loadGlobalDirectives()
    }

    return globalDirectives
}

const loadComponent = async (componentName) => {
    const appPath = `@components/${componentName}/app.js`
    const templatePath = `./components/${componentName}/template.html`
    const stylePath = `./components/${componentName}/style.css`
    const appModule = await import(appPath)
    const templateContent = await getFileContent(templatePath)
    const styleContent = await getFileContent(stylePath).catch(() => '')

    return {
        app: appModule.default || {},
        templateContent,
        styleContent
    }
}

const escapeRegExp = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const normalizeSelfClosingComponents = (templateContent, components) => {
    return Object.keys(components).reduce((content, selector) => {
        const pattern = new RegExp(`<(${escapeRegExp(selector)})(\\s[^>]*)?\\s/>`, 'gi')
        return content.replace(pattern, '<$1$2></$1>')
    }, templateContent)
}

const createTemplate = (templateContent, components) => {
    const normalizedContent = normalizeSelfClosingComponents(templateContent, components)
    const templateDom = new DOMParser().parseFromString(normalizedContent, 'text/html')
    const templateElement = templateDom.querySelector('template')

    if (!templateElement) {
        throw {
            title: 'WebX Template Error',
            message: 'Component template file must contain a <template> element.'
        }
    }

    const embeddedStyleContent = [...templateDom.querySelectorAll('style[scoped]')]
        .map((style) => style.textContent)
        .join('\n')

    return {
        template: templateElement.content.cloneNode(true),
        embeddedStyleContent
    }
}

const bindParentProps = (node, parentInstance, childInstance) => {
    if (!parentInstance) return

    for (const binding of getPropBindingsFromNode(node)) {
        const update = () => {
            childInstance.props[binding.name] = evaluate(binding.expression, parentInstance)
        }

        parentInstance.bindings.push({
            update,
            deps: getExpressionDeps(binding.expression, parentInstance)
        })
    }
}

const renderComponent = async (componentName, node, components, isChild, parentInstance) => {
    const { app, templateContent, styleContent } = await loadComponent(componentName)
    const props = getPropsFromNode(node, parentInstance)
    const instance = createInstance(componentName, app, props)
    bindParentProps(node, parentInstance, instance)
    const componentTemplate = createTemplate(templateContent, components)
    const template = componentTemplate.template
    const directives = await getGlobalDirectives()

    instance.classMap = processScopedStyles(
        template,
        componentName,
        [styleContent, componentTemplate.embeddedStyleContent].filter(Boolean).join('\n')
    )
    processControlFlow(template, instance)

    for (const componentRegistry in components) {
        const componentSelectors = template.querySelectorAll(componentRegistry)
        for (const componentSelector of componentSelectors) {
            await renderComponent(
                components[componentRegistry].name,
                componentSelector,
                components,
                true,
                instance
            )
        }
    }

    bindTextNodes(template, instance)
    bindModels(template, instance)
    bindDirectives(template, instance, app, directives)

    const roots = [...template.childNodes]

    if (!isChild) {
        node.appendChild(template)
        registerInstanceRoots(instance, roots)
        mountInstance(instance)
        return
    }

    node.parentNode.replaceChild(template, node)
    registerInstanceRoots(instance, roots)
    mountInstance(instance)
}

export default async function render(componentName, node, components = {}, isChild = false, parentInstance = null) {
    try {
        await renderComponent(componentName, node, components, isChild, parentInstance)
    } catch (error) {
        reportError(error)
    }
}

const installedStyles = new Set()
const classMaps = new Map()

const sanitizeComponentName = (componentName) => {
    return componentName.replace(/[^a-zA-Z0-9_-]/g, '_')
}

const getScopedClassName = (componentName, className) => {
    return `${className}__wbx_${sanitizeComponentName(componentName)}`
}

const getScopeClassName = (componentName) => {
    return `wbx-scope-${sanitizeComponentName(componentName)}`
}

const getClassMap = (componentName) => {
    if (!classMaps.has(componentName)) {
        classMaps.set(componentName, new Map())
    }

    return classMaps.get(componentName)
}

const splitSelectors = (selector) => {
    const selectors = []
    let current = ''
    let depth = 0

    for (const char of selector) {
        if (char === '(') depth += 1
        if (char === ')') depth -= 1

        if (char === ',' && depth === 0) {
            selectors.push(current.trim())
            current = ''
            continue
        }

        current += char
    }

    if (current.trim()) selectors.push(current.trim())
    return selectors
}

const registerClass = (componentName, className) => {
    const classMap = getClassMap(componentName)
    if (!classMap.has(className)) {
        classMap.set(className, getScopedClassName(componentName, className))
    }

    return classMap.get(className)
}

const rewriteClasses = (value, componentName) => {
    return value.replace(/(^|[^\w-])\.([A-Za-z_-][\w-]*)/g, (match, prefix, className) => {
        return `${prefix}.${registerClass(componentName, className)}`
    })
}

const scopeSingleSelector = (selector, componentName) => {
    if (selector.includes(':global(')) {
        return selector.replace(/:global\(([^)]+)\)/g, '$1')
    }

    const scopedSelector = rewriteClasses(selector, componentName)
    const scopeClass = getScopeClassName(componentName)
    const parts = scopedSelector.split(/(\s+|>\s*|\+\s*|~\s*)/)

    for (let index = parts.length - 1; index >= 0; index -= 1) {
        const part = parts[index].trim()
        if (!part || ['>', '+', '~'].includes(part)) continue

        const pseudoIndex = parts[index].search(/:{1,2}[A-Za-z-]/)
        if (pseudoIndex >= 0) {
            parts[index] = `${parts[index].slice(0, pseudoIndex)}.${scopeClass}${parts[index].slice(pseudoIndex)}`
        } else {
            parts[index] = `${parts[index]}.${scopeClass}`
        }

        break
    }

    return parts.join('')
}

const scopeSelector = (selector, componentName) => {
    return splitSelectors(selector)
        .map((item) => scopeSingleSelector(item, componentName))
        .join(', ')
}

const findBlockEnd = (css, startIndex) => {
    let depth = 0

    for (let index = startIndex; index < css.length; index += 1) {
        if (css[index] === '{') depth += 1
        if (css[index] === '}') depth -= 1
        if (depth === 0) return index
    }

    return css.length - 1
}

const scopeCss = (css, componentName) => {
    let output = ''
    let index = 0

    while (index < css.length) {
        const openIndex = css.indexOf('{', index)
        if (openIndex === -1) {
            output += css.slice(index)
            break
        }

        const selector = css.slice(index, openIndex).trim()
        const closeIndex = findBlockEnd(css, openIndex)
        const body = css.slice(openIndex + 1, closeIndex)

        if (selector.startsWith('@keyframes') || selector.startsWith('@font-face')) {
            output += `${selector} {${body}}`
        } else if (selector.startsWith('@media') || selector.startsWith('@supports')) {
            output += `${selector} {${scopeCss(body, componentName)}}`
        } else {
            output += `${scopeSelector(selector, componentName)} {${body}}`
        }

        index = closeIndex + 1
    }

    return output
}

const applyScopedClasses = (root, componentName) => {
    const classMap = getClassMap(componentName)
    const scopeClass = getScopeClassName(componentName)

    for (const element of root.querySelectorAll('*')) {
        element.classList.add(scopeClass)

        for (const className of [...element.classList]) {
            const scopedClassName = classMap.get(className)
            if (scopedClassName) {
                element.classList.replace(className, scopedClassName)
            }
        }
    }
}

const installStyle = (componentName, css) => {
    if (!css.trim()) return

    const key = `${componentName}:${css}`
    if (installedStyles.has(key)) return

    const style = document.createElement('style')
    style.setAttribute('data-wbx-style', componentName)
    style.textContent = css
    document.head.appendChild(style)
    installedStyles.add(key)
}

const getInlineScopedCss = (root) => {
    const scopedStyles = [...root.querySelectorAll('style[scoped]')]
    const css = scopedStyles.map((style) => style.textContent).join('\n')

    for (const style of scopedStyles) {
        style.remove()
    }

    return css
}

export const processScopedStyles = (root, componentName, css = '') => {
    const inlineCss = getInlineScopedCss(root)
    const sourceCss = [css, inlineCss].filter(Boolean).join('\n')
    if (!sourceCss.trim()) return {}

    const scopedCss = scopeCss(sourceCss, componentName)
    installStyle(componentName, scopedCss)
    applyScopedClasses(root, componentName)

    return Object.fromEntries(getClassMap(componentName))
}

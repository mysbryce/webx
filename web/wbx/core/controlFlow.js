import { bindTextNodes } from '@wbx/core/bindings.js'
import { evaluate, getExpressionDeps } from '@wbx/core/evaluator.js'

const CONTROL_TAGS = ['for', 'if', 'elseif', 'else']

const isControlTag = (node, tagName) => {
    return node?.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tagName
}

const getExpressionAttribute = (node, names) => {
    for (const name of names) {
        if (node.hasAttribute(name)) return node.getAttribute(name)
    }

    return ''
}

const getScopedClass = (instance, className) => {
    return instance.classMap?.[className] || className
}

const getTransitionConfig = (node, instance) => {
    const name = node.getAttribute('transition')
    if (!name) return null

    const activeClass = node.getAttribute('active-class') || `${name}-active`
    const offClass = node.getAttribute('off-class') || `${name}-off`

    return {
        activeClass: getScopedClass(instance, activeClass),
        offClass: getScopedClass(instance, offClass),
        duration: Number(node.getAttribute('transition-duration') || 200)
    }
}

const applyTransitionInToNodes = (nodes, transition) => {
    if (!transition) return

    for (const node of nodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            node.classList.remove(transition.activeClass)
            node.offsetWidth
            node.classList.add(transition.activeClass)
            setTimeout(() => {
                node.classList.remove(transition.activeClass)
            }, transition.duration)
        }
    }
}

const applyTransitionIn = (fragment, transition) => {
    applyTransitionInToNodes(fragment.childNodes, transition)
}

const removeRenderedNodes = (nodes, transition) => {
    for (const node of nodes) {
        if (!node.parentNode) continue

        if (transition && node.nodeType === Node.ELEMENT_NODE) {
            node.classList.remove(transition.activeClass)
            node.classList.add(transition.offClass)
            setTimeout(() => node.remove(), transition.duration)
            continue
        }

        node.remove()
    }
}

const removeRenderedItem = (item, transition) => {
    removeRenderedNodes(item.nodes, transition)
    item.marker.remove()
}

const insertFragmentBefore = (anchor, fragment) => {
    const insertedNodes = [...fragment.childNodes]
    anchor.parentNode.insertBefore(fragment, anchor)
    return insertedNodes
}

const getForConfig = (node) => {
    const inline = node.getAttribute('w-for')
    if (inline) {
        const match = inline.match(/^\s*(?:\(([^,\s]+)\s*,\s*([^)]+)\)|([^\s]+))\s+(?:in|of)\s+(.+)\s*$/)
        if (match) {
            return {
                itemName: match[1] || match[3],
                indexName: match[2] || '$index',
                sourceExpression: match[4],
                keyExpression: node.getAttribute('key')
            }
        }
    }

    return {
        itemName: node.getAttribute('as') || 'item',
        indexName: node.getAttribute('index') || '$index',
        sourceExpression: getExpressionAttribute(node, ['data', 'of', 'in']),
        keyExpression: node.getAttribute('key')
    }
}

const getItemSignature = (item) => {
    try {
        return JSON.stringify(item)
    } catch {
        return String(item)
    }
}

const getItemKey = (item, index, config, instance, locals) => {
    if (config.keyExpression) {
        return evaluate(config.keyExpression, instance, locals)
    }

    return item?.id ?? index
}

const renderForItem = (template, instance, config, item, index, transition) => {
    const itemFragment = template.cloneNode(true)
    const locals = {
        [config.itemName]: item,
        [config.indexName]: index,
        $index: index
    }
    const bindings = []

    bindTextNodes(itemFragment, instance, locals, bindings)
    applyTransitionIn(itemFragment, transition)

    return {
        key: getItemKey(item, index, config, instance, locals),
        signature: getItemSignature(item),
        locals,
        bindings,
        nodes: [...itemFragment.childNodes],
        fragment: itemFragment,
        marker: document.createComment('webx-for-item'),
        update(item, index) {
            this.locals[config.itemName] = item
            this.locals[config.indexName] = index
            this.locals.$index = index
            for (const binding of this.bindings) binding.update()
            this.signature = getItemSignature(item)
        }
    }
}

const placeItemAfter = (cursor, item) => {
    const fragment = document.createDocumentFragment()
    fragment.append(...item.nodes, item.marker)
    cursor.parentNode.insertBefore(fragment, cursor.nextSibling)
}

const renderFor = (node, instance) => {
    const template = document.createDocumentFragment()
    template.append(...[...node.childNodes].map((child) => child.cloneNode(true)))

    const startAnchor = document.createComment('webx-for-start')
    const endAnchor = document.createComment('webx-for-end')
    const parentNode = node.parentNode
    const transition = getTransitionConfig(node, instance)
    const config = getForConfig(node)
    let renderedItems = new Map()

    const update = () => {
        const items = evaluate(config.sourceExpression, instance) || []
        const nextItems = new Map()
        let cursor = startAnchor

        for (const [index, item] of [...items].entries()) {
            const locals = {
                [config.itemName]: item,
                [config.indexName]: index,
                $index: index
            }
            const key = getItemKey(item, index, config, instance, locals)
            const signature = getItemSignature(item)
            const current = renderedItems.get(key)

            if (current && current.signature === signature) {
                current.update(item, index)
                placeItemAfter(cursor, current)
                cursor = current.marker
                nextItems.set(key, current)
                continue
            }

            if (current) {
                current.update(item, index)
                applyTransitionInToNodes(current.nodes, transition)
                placeItemAfter(cursor, current)
                cursor = current.marker
                nextItems.set(key, current)
                continue
            }

            const next = renderForItem(template, instance, config, item, index, transition)
            next.fragment.appendChild(next.marker)
            cursor.parentNode.insertBefore(next.fragment, cursor.nextSibling)
            cursor = next.marker
            nextItems.set(key, next)
        }

        for (const [key, item] of renderedItems) {
            if (!nextItems.has(key)) {
                removeRenderedItem(item, transition)
            }
        }

        renderedItems = nextItems
    }

    parentNode.insertBefore(startAnchor, node)
    parentNode.replaceChild(endAnchor, node)
    instance.bindings.push({
        update,
        deps: getExpressionDeps(config.sourceExpression, instance)
    })
    update()
}

const getConditionExpression = (node) => {
    if (isControlTag(node, 'else')) return 'true'
    return getExpressionAttribute(node, ['data', 'condition', 'w-if', 'w-else-if'])
}

const collectIfChain = (node) => {
    const chain = [node]
    let next = node.nextElementSibling

    while (isControlTag(next, 'elseif') || isControlTag(next, 'else') || next?.hasAttribute?.('w-else-if') || next?.hasAttribute?.('w-else')) {
        chain.push(next)
        next = next.nextElementSibling
    }

    return chain
}

const renderIfChain = (node, instance) => {
    const chain = collectIfChain(node)
    const branches = chain.map((branch) => {
        const template = document.createDocumentFragment()
        template.append(...[...branch.childNodes].map((child) => child.cloneNode(true)))

        return {
            node: branch,
            template,
            expression: getConditionExpression(branch),
            transition: getTransitionConfig(branch, instance)
        }
    })

    const anchor = document.createComment('webx-if')
    let renderedNodes = []
    let activeTransition = null
    let activeIndex = -1

    chain[0].parentNode.insertBefore(anchor, chain[0])
    for (const branch of chain) branch.remove()

    const update = () => {
        const nextActiveIndex = branches.findIndex((branch) => {
            if (isControlTag(branch.node, 'else') || branch.node.hasAttribute('w-else')) return true
            return Boolean(evaluate(branch.expression, instance))
        })

        if (nextActiveIndex === activeIndex) return

        removeRenderedNodes(renderedNodes, activeTransition)
        renderedNodes = []
        activeTransition = null
        activeIndex = nextActiveIndex

        const activeBranch = branches[activeIndex]
        if (!activeBranch) return

        const fragment = activeBranch.template.cloneNode(true)
        bindTextNodes(fragment, instance)
        applyTransitionIn(fragment, activeBranch.transition)
        renderedNodes = insertFragmentBefore(anchor, fragment)
        activeTransition = activeBranch.transition
    }

    instance.bindings.push({
        update,
        deps: branches.flatMap((branch) => getExpressionDeps(branch.expression, instance))
    })
    update()
}

const getAllElements = (root) => {
    return [...(root.querySelectorAll?.('*') || [])]
}

export const processControlFlow = (root, instance) => {
    for (const node of getAllElements(root)) {
        if (!node.parentNode) continue

        const tagName = node.tagName.toLowerCase()
        if (tagName === 'for' || node.hasAttribute('w-for')) {
            renderFor(node, instance)
            continue
        }

        if (tagName === 'if' || node.hasAttribute('w-if')) {
            renderIfChain(node, instance)
        }

        if (CONTROL_TAGS.includes(tagName)) {
            continue
        }
    }
}

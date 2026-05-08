import { reportError } from '@wbx/core/errorOverlay.js'

const mountedInstances = new WeakSet()
const unmountedInstances = new WeakSet()
const observedRoots = new Map()
let observer = null

const normalizeHooks = (hook) => {
    if (!hook) return []
    return Array.isArray(hook) ? hook : [hook]
}

const runHook = (hook, instance) => {
    try {
        if (typeof hook === 'string') {
            instance.methods[hook]?.()
            return
        }

        if (typeof hook === 'function') {
            hook.call(instance)
        }
    } catch (error) {
        reportError({
            title: 'WebX Lifecycle Error',
            message: `Error running lifecycle hook in <${instance.name}>`,
            details: error.stack || error.message
        })
    }
}

const ensureObserver = () => {
    if (observer) return

    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.removedNodes) {
                notifyRemovedNode(node)
            }
        }
    })

    observer.observe(document.body, {
        childList: true,
        subtree: true
    })
}

const notifyRemovedNode = (removedNode) => {
    for (const [root, instance] of observedRoots) {
        if (root === removedNode || removedNode.contains?.(root)) {
            unmountInstance(instance)
        }
    }
}

export const mountInstance = (instance) => {
    if (mountedInstances.has(instance)) return

    mountedInstances.add(instance)
    window.__WEBX_INSTANCES__ ||= []
    window.__WEBX_INSTANCES__.push(instance)

    queueMicrotask(() => {
        for (const hook of normalizeHooks(instance.options.onMounted)) {
            runHook(hook, instance)
        }
    })
}

export const unmountInstance = (instance) => {
    if (unmountedInstances.has(instance)) return

    unmountedInstances.add(instance)

    for (const hook of normalizeHooks(instance.options.onUnmounted)) {
        runHook(hook, instance)
    }

    for (const disposer of instance.disposers) {
        disposer?.()
    }

    for (const root of instance.roots) {
        observedRoots.delete(root)
    }
}

export const registerInstanceRoots = (instance, roots) => {
    instance.roots = roots.filter((node) => node.nodeType === Node.ELEMENT_NODE)

    if (!instance.roots.length) return

    ensureObserver()

    for (const root of instance.roots) {
        observedRoots.set(root, instance)
    }
}

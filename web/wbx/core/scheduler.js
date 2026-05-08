const queuedInstances = new Set()
let isPending = false

const flush = () => {
    const instances = [...queuedInstances]
    queuedInstances.clear()
    isPending = false

    for (const instance of instances) {
        instance.flushUpdates()
    }
}

export const queueInstanceUpdate = (instance, changedKey = null) => {
    if (changedKey) instance.pendingKeys.add(changedKey)
    if (!changedKey) instance.needsFullUpdate = true

    queuedInstances.add(instance)

    if (!isPending) {
        isPending = true
        queueMicrotask(flush)
    }
}

const normalizeWatchHandler = (handler, instance) => {
    if (typeof handler === 'function') return handler.bind(instance)
    if (typeof handler === 'string' && instance.methods[handler]) return instance.methods[handler]
    return null
}

const runWatchers = (source, key, value, previousValue, app, instance) => {
    const watchers = app.watch || {}
    const paths = [key, `${source}.${key}`]

    for (const path of paths) {
        const handler = normalizeWatchHandler(watchers[path], instance)
        if (handler) handler(value, previousValue)
    }

    for (const watcher of instance.watchers) {
        if (paths.includes(watcher.path)) watcher.callback.call(instance, value, previousValue)
    }
}

const notifyInstance = (instance, source, key, value, previousValue, app) => {
    instance.update(key)
    runWatchers(source, key, value, previousValue, app, instance)
}

const createReactiveState = (source, state, app, instance) => {
    return new Proxy(state, {
        set(target, key, value) {
            const previousValue = target[key]
            target[key] = value

            if (previousValue !== value) {
                notifyInstance(instance, source, key, value, previousValue, app)
            }

            return true
        }
    })
}

export const createReactiveData = (data, app, instance) => {
    return createReactiveState('data', data, app, instance)
}

export const createReactiveProps = (props, app, instance) => {
    return createReactiveState('props', props, app, instance)
}

export const bindStoreToInstance = (app, instance, name, store) => {
    return store.watch((key, value, previousValue) => {
        instance.update(name)
        runWatchers(name, key, value, previousValue, app, instance)
    })
}

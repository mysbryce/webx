import { bindCfxEvents, cfx } from '@wbx/core/cfx.js'
import { bindStoreToInstance, createReactiveData, createReactiveProps } from '@wbx/core/reactivity.js'
import { queueInstanceUpdate } from '@wbx/core/scheduler.js'
import { validateProps } from '@wbx/core/props.js'

const getData = (data) => {
    if (typeof data === 'function') return data()
    return { ...(data || {}) }
}

const getMethods = (app) => ({
    ...(app.method || {}),
    ...(app.methods || {})
})

const getStores = (stores) => {
    if (typeof stores === 'function') return stores()
    return { ...(stores || {}) }
}

export const createInstance = (componentName, app, rawProps) => {
    const instance = {
        name: componentName,
        options: app,
        props: {},
        data: {},
        stores: getStores(app.stores),
        cfx,
        methods: {},
        classMap: {},
        refs: {},
        bindings: [],
        watchers: [],
        disposers: [],
        roots: [],
        pendingKeys: new Set(),
        needsFullUpdate: false,
        update(changedKey = null) {
            queueInstanceUpdate(this, changedKey)
        },
        flushUpdates() {
            for (const binding of this.bindings) {
                if (this.needsFullUpdate || !binding.deps.length || binding.deps.some((dep) => this.pendingKeys.has(dep))) {
                    binding.update()
                }
            }
            this.pendingKeys.clear()
            this.needsFullUpdate = false
        },
        watch(path, callback) {
            const watcher = { path, callback }
            this.watchers.push(watcher)

            return () => {
                this.watchers = this.watchers.filter((item) => item !== watcher)
            }
        }
    }

    instance.props = createReactiveProps(validateProps(componentName, app.props, rawProps), app, instance)
    instance.data = createReactiveData(getData(app.data), app, instance)
    instance.methods = Object.fromEntries(
        Object.entries(getMethods(app)).map(([name, method]) => [name, method.bind(instance)])
    )
    for (const [name, store] of Object.entries(instance.stores)) {
        instance[name] = store
        instance.disposers.push(bindStoreToInstance(app, instance, name, store))
    }
    instance.disposers.push(bindCfxEvents(app, instance))

    return instance
}

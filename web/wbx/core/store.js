export const createStore = (creator) => {
    const listeners = new Set()
    let store = null

    const notify = (key, value, previousValue) => {
        for (const listener of listeners) {
            listener(key, value, previousValue)
        }
    }

    const set = (partial) => {
        const nextState = typeof partial === 'function'
            ? partial(store)
            : partial

        for (const [key, value] of Object.entries(nextState || {})) {
            store[key] = value
        }
    }

    const get = () => store
    const initialState = typeof creator === 'function'
        ? creator(set, get)
        : creator

    store = new Proxy({ ...(initialState || {}) }, {
        set(target, key, value) {
            const previousValue = target[key]
            target[key] = value

            if (previousValue !== value) {
                notify(key, value, previousValue)
            }

            return true
        }
    })

    Object.defineProperties(store, {
        setState: {
            value: set
        },
        getState: {
            value: get
        },
        subscribe: {
            value(callback) {
                listeners.add(callback)
                return () => listeners.delete(callback)
            }
        },
        watch: {
            value(callback) {
                listeners.add(callback)
                return () => listeners.delete(callback)
            }
        }
    })

    return store
}

export default createStore

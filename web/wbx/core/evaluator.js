export const createScope = (instance, extra = {}) => {
    const scope = {
        props: instance.props,
        data: instance.data,
        stores: instance.stores,
        cfx: instance.cfx,
        watch: instance.watch.bind(instance),
        ...instance.stores,
        ...instance.methods,
        ...extra
    }

    return new Proxy(scope, {
        has(target, key) {
            return key in target || key in instance.data || key in instance.props || key in instance.stores
        },
        get(target, key) {
            if (key in target) return target[key]
            if (key in instance.data) return instance.data[key]
            if (key in instance.props) return instance.props[key]
            return undefined
        },
        set(target, key, value) {
            if (key in instance.data) {
                instance.data[key] = value
                return true
            }

            if (key in instance.props) {
                instance.props[key] = value
                return true
            }

            if (key in instance.stores) {
                instance.stores[key] = value
                return true
            }

            target[key] = value
            return true
        }
    })
}

export const evaluate = (expression, instance, extra = {}) => {
    const scope = createScope(instance, extra)

    try {
        return Function('scope', `with (scope) { return (${expression}) }`)(scope)
    } catch {
        try {
            return Function('scope', `with (scope) { ${expression} }`)(scope)
        } catch (error) {
            throw {
                title: 'WebX Expression Error',
                message: `Error evaluating expression "${expression}"`,
                details: error.stack || error.message
            }
        }
    }
}

export const assign = (expression, value, instance, extra = {}) => {
    const scope = createScope(instance, { ...extra, $value: value })

    try {
        return Function('scope', `with (scope) { ${expression} = $value }`)(scope)
    } catch (error) {
        throw {
            title: 'WebX Assignment Error',
            message: `Error assigning expression "${expression}"`,
            details: error.stack || error.message
        }
    }
}

export const getExpressionDeps = (expression, instance) => {
    const identifiers = expression.match(/[A-Za-z_$][\w$]*/g) || []

    return [...new Set(identifiers.filter((identifier) => {
        return identifier in instance.data || identifier in instance.props || identifier in instance.stores
    }))]
}

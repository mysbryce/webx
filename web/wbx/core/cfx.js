import { reportError } from '@wbx/core/errorOverlay.js'

const handlers = new Map()
let isListening = false

const isDevLike = () => {
    return !window.GetParentResourceName || location.protocol === 'http:' || location.protocol === 'https:'
}

export const call = async (eventName, data, mockData) => {
    if (isDevLike() && mockData !== undefined) return mockData

    const resourceName = window.GetParentResourceName
        ? window.GetParentResourceName()
        : 'nui-frame-app'

    const response = await fetch(`https://${resourceName}/${eventName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify(data)
    })

    return response.json()
}

export const fetchNui = call

export const cfx = {
    call,
    fetchNui
}

const ensureMessageListener = () => {
    if (isListening) return

    window.addEventListener('message', (event) => {
        const payload = event.data
        const eventType = payload?.type
        const eventData = payload?.data

        if (!eventType || !handlers.has(eventType)) return

        for (const handler of handlers.get(eventType)) {
            handler(eventData, payload, event)
        }
    })

    isListening = true
}

const normalizeCfxHandler = (definition, instance) => {
    if (typeof definition === 'function') {
        return {
            handler: definition.bind(instance)
        }
    }

    if (typeof definition === 'string') {
        return {
            handler: instance.methods[definition]
        }
    }

    if (definition && typeof definition === 'object') {
        const handler = typeof definition.handler === 'string'
            ? instance.methods[definition.handler]
            : definition.handler?.bind(instance)

        return {
            schema: definition.schema,
            handler
        }
    }

    return {}
}

const validateCfxData = (eventType, schema, data) => {
    if (!schema?.safeParse) return data

    const result = schema.safeParse(data)
    if (result.success) return result.data

    throw {
        title: 'WebX CFX Event Error',
        message: `Invalid payload for "${eventType}"`,
        details: result.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('\n')
    }
}

export const bindCfxEvents = (app, instance) => {
    const cfxEvents = app.onCfx || {}
    const unbinders = []

    for (const [eventType, definition] of Object.entries(cfxEvents)) {
        const { schema, handler } = normalizeCfxHandler(definition, instance)
        if (!handler) {
            console.warn(`CFX event "${eventType}" has no valid handler.`)
            continue
        }

        ensureMessageListener()

        const wrappedHandler = (data, payload, event) => {
            try {
                handler(validateCfxData(eventType, schema, data), payload, event)
            } catch (error) {
                reportError(error)
            }
        }

        if (!handlers.has(eventType)) {
            handlers.set(eventType, new Set())
        }

        handlers.get(eventType).add(wrappedHandler)
        unbinders.push(() => handlers.get(eventType)?.delete(wrappedHandler))
    }

    return () => {
        for (const unbind of unbinders) unbind()
    }
}

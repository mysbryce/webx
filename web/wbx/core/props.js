import z from 'zod'
import { evaluate } from '@wbx/core/evaluator.js'

export const parsePropValue = (value) => {
    if (value === '') return true
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null
    if (value !== '' && !Number.isNaN(Number(value))) return Number(value)

    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}

export const getPropsFromNode = (node, parentInstance) => {
    const props = {}
    if (!node?.attributes) return props

    for (const attribute of node.attributes) {
        if (attribute.name.startsWith('@') || attribute.name.startsWith('w-')) continue

        if (attribute.name.startsWith(':')) {
            props[attribute.name.slice(1)] = parentInstance
                ? evaluate(attribute.value, parentInstance)
                : parsePropValue(attribute.value)
            continue
        }

        props[attribute.name] = parsePropValue(attribute.value)
    }

    return props
}

export const getPropBindingsFromNode = (node) => {
    const bindings = []
    if (!node?.attributes) return bindings

    for (const attribute of node.attributes) {
        if (!attribute.name.startsWith(':')) continue

        bindings.push({
            name: attribute.name.slice(1),
            expression: attribute.value
        })
    }

    return bindings
}

const formatZodError = (error) => {
    return error.issues
        .map((issue) => {
            const path = issue.path.length ? issue.path.join('.') : '(root)'
            return `${path}: ${issue.message}`
        })
        .join('\n')
}

export const validateProps = (componentName, propSchema = {}, rawProps = {}) => {
    if (!propSchema) return rawProps

    const validator = typeof propSchema.safeParse === 'function'
        ? propSchema
        : z.object(propSchema)

    const result = validator.safeParse(rawProps)
    if (result.success) return result.data

    throw {
        title: 'WebX Props Error',
        message: `Invalid props for <${componentName}>`,
        details: formatZodError(result.error)
    }
}

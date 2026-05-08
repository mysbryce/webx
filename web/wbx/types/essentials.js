import z from 'zod'

export const webxSchema = z.object({
    main: z.string(),
    components: z.array(z.string()),
})
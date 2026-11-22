import { z } from 'zod'
import { DEFAULT_OPTIONS, OUTPUT_FORMATS } from '../core/index.js'

export const fileSchema = z.object({
    format: z.enum(OUTPUT_FORMATS).default(DEFAULT_OPTIONS.format),
    width: z.coerce.number().int().positive().default(DEFAULT_OPTIONS.width), 
    maxKB: z.coerce.number().positive().default(DEFAULT_OPTIONS.maxKB),
    startQuality: z.coerce.number().int().min(1).max(100).optional(),
    minQuality: z.coerce.number().int().min(1).max(100).optional(),
    // widths (several widths): leave it out for now. It comes with the zip step.
})

// The TypeScript type, generated from the schema. No need to write an interface.
export type FileSchema = z.infer<typeof fileSchema>
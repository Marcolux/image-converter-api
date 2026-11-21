import { ImageError } from './errors.js'
import { isOutputFormat, type OutputFormat } from './formats.js'

export interface ConvertOptions {
  format: OutputFormat
  /** Max output width in px. Smaller images are never enlarged. Omit to keep the original width. */
  width?: number
  /** Size budget in KB. Omit to encode once at startQuality. */
  maxKB?: number
  /** First quality tried (1–100). Kept if the result already fits maxKB. */
  startQuality: number
  /** Lowest quality allowed (1–100) while searching for maxKB. */
  minQuality: number
}

/** Same defaults as the original CLI script. */
export const DEFAULT_OPTIONS = {
  format: 'webp',
  width: 1000,
  maxKB: 400,
  startQuality: 100,
  minQuality: 60,
} as const satisfies ConvertOptions

const isQuality = (n: number) => Number.isInteger(n) && n >= 1 && n <= 100
const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0

/**
 * Last line of defence for direct callers (CLI, tests).
 * The API validates its input with zod before it reaches the core.
 */
export function assertValidOptions(options: ConvertOptions): void {
  const problems: string[] = []

  if (!isOutputFormat(options.format)) problems.push(`unknown format "${options.format}"`)
  if (!isQuality(options.startQuality)) problems.push('startQuality must be an integer from 1 to 100')
  if (!isQuality(options.minQuality)) problems.push('minQuality must be an integer from 1 to 100')
  if (options.minQuality > options.startQuality) problems.push('minQuality must not be higher than startQuality')
  if (options.width !== undefined && !isPositiveInt(options.width)) problems.push('width must be a positive integer')
  if (options.maxKB !== undefined && !(options.maxKB > 0)) problems.push('maxKB must be greater than 0')

  if (problems.length > 0) {
    throw new ImageError('INVALID_OPTIONS', `Invalid options: ${problems.join('; ')}`)
  }
}

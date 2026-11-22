import { ImageError } from './errors.js'
import { FORMATS, isOutputFormat, type OutputFormat } from './formats.js'

export interface ConvertOptions {
  format: OutputFormat
  /** Max output width in px. Smaller images are never enlarged. Omit to keep the original width. */
  width?: number
  /** Size budget in KB. Omit to encode once at startQuality. */
  maxKB?: number
  /** First quality tried (1–100). Kept if the result already fits maxKB. Omit for the format's default. */
  startQuality?: number
  /** Lowest quality allowed (1–100) while searching for maxKB. Omit for the format's default. */
  minQuality?: number
}

/**
 * Same defaults as the original CLI script.
 * Quality is left out on purpose: each format has its own default range (FORMATS[format].quality).
 */
export const DEFAULT_OPTIONS = {
  format: 'webp',
  width: 1000,
  maxKB: 400,
} as const satisfies ConvertOptions

/**
 * Fills in missing qualities from the format's defaults.
 * If only one is given, the other is adjusted so that minQuality <= startQuality still holds,
 * e.g. AVIF with minQuality 80 → startQuality 80 (the default 70 would be below it).
 */
export function resolveQuality(options: ConvertOptions): { startQuality: number; minQuality: number } {
  const defaults = FORMATS[options.format].quality
  const startQuality = options.startQuality ?? Math.max(defaults.start, options.minQuality ?? defaults.min)
  const minQuality = options.minQuality ?? Math.min(defaults.min, startQuality)
  return { startQuality, minQuality }
}

const isQuality = (n: number) => Number.isInteger(n) && n >= 1 && n <= 100
const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0

/**
 * Last line of defence for direct callers (CLI, tests).
 * The API validates its input with zod before it reaches the core.
 */
export function assertValidOptions(options: ConvertOptions): void {
  const problems: string[] = []

  if (!isOutputFormat(options.format)) {
    // Nothing else can be checked without a valid format
    throw new ImageError('INVALID_OPTIONS', `Invalid options: unknown format "${options.format}"`)
  }
  if (options.startQuality !== undefined && !isQuality(options.startQuality)) {
    problems.push('startQuality must be an integer from 1 to 100')
  }
  if (options.minQuality !== undefined && !isQuality(options.minQuality)) {
    problems.push('minQuality must be an integer from 1 to 100')
  }
  if (options.width !== undefined && !isPositiveInt(options.width)) problems.push('width must be a positive integer')
  if (options.maxKB !== undefined && !(options.maxKB > 0)) problems.push('maxKB must be greater than 0')

  if (problems.length === 0) {
    const { startQuality, minQuality } = resolveQuality(options)
    if (minQuality > startQuality) problems.push('minQuality must not be higher than startQuality')
  }

  if (problems.length > 0) {
    throw new ImageError('INVALID_OPTIONS', `Invalid options: ${problems.join('; ')}`)
  }
}

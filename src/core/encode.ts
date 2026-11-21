import sharp, { type Channels } from 'sharp'
import type { ImageSource } from './decode.js'
import { ImageError } from './errors.js'
import { FORMATS, type OutputFormat } from './formats.js'

/** Decoded, resized pixels. Encoding from these is cheap, so the quality search reuses them. */
export interface RawImage {
  data: Buffer
  info: { width: number; height: number; channels: Channels }
}

export interface EncodeResult {
  buffer: Buffer
  quality: number
  /** false when even minQuality is over maxKB. The minQuality version is returned anyway. */
  withinBudget: boolean
}

/** Resize once to raw pixels. withoutEnlargement = only shrink images wider than `width`. */
export async function resizeToRaw(source: ImageSource, width?: number): Promise<RawImage> {
  let pipeline = source.open()
  if (width !== undefined) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true })
  }

  try {
    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })
    return { data, info: { width: info.width, height: info.height, channels: info.channels } }
  } catch (error) {
    // The header was readable but the pixels weren't: usually a truncated or corrupted file
    throw new ImageError('DECODE_FAILED', 'Image could not be decoded. It may be corrupted or truncated.', {
      cause: error,
    })
  }
}

export function encodeRaw(raw: RawImage, format: OutputFormat, quality: number): Promise<Buffer> {
  // Output never carries metadata: the raw step drops EXIF/GPS, which protects privacy
  return FORMATS[format].encode(sharp(raw.data, { raw: raw.info }), quality).toBuffer()
}

/**
 * Highest quality between minQuality and startQuality whose file fits maxKB.
 *   1. Fits at startQuality → one encode, done.
 *   2. Too big → binary search (~5 encodes instead of up to 20 with -2 steps).
 *   3. Too big even at minQuality → return the minQuality version, withinBudget = false.
 */
export async function encodeWithinBudget(
  raw: RawImage,
  format: OutputFormat,
  { startQuality, minQuality, maxKB }: { startQuality: number; minQuality: number; maxKB?: number },
): Promise<EncodeResult> {
  const first = await encodeRaw(raw, format, startQuality)
  if (maxKB === undefined || fits(first, maxKB)) {
    return { buffer: first, quality: startQuality, withinBudget: true }
  }

  let low = minQuality
  let high = startQuality - 1
  let best: EncodeResult | undefined
  let atMinQuality: Buffer | undefined

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const attempt = await encodeRaw(raw, format, mid)
    if (mid === minQuality) atMinQuality = attempt

    if (fits(attempt, maxKB)) {
      best = { buffer: attempt, quality: mid, withinBudget: true }
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best) return best

  // The search only tries minQuality when everything above it was too big,
  // so atMinQuality is normally set here. Encode it if minQuality === startQuality.
  const buffer = atMinQuality ?? (minQuality === startQuality ? first : await encodeRaw(raw, format, minQuality))
  return { buffer, quality: minQuality, withinBudget: false }
}

function fits(buffer: Buffer, maxKB: number): boolean {
  return buffer.length / 1024 <= maxKB
}

import sharp, { type Metadata, type Sharp } from 'sharp'
import heicDecode from 'heic-decode'
import { ImageError } from './errors.js'

/** ~100 megapixels. Covers 48 MP phone photos; blocks decompression bombs. */
export const MAX_INPUT_PIXELS = 100_000_000

/**
 * A decoded input, ready to resize.
 * `open()` returns a fresh sharp pipeline each call, so one input can be
 * resized to several widths without decoding it again from scratch.
 */
export interface ImageSource {
  /** Format detected from the file content, not the extension (e.g. 'jpeg', 'heif') */
  inputFormat: string
  /** Width and height after EXIF orientation is applied */
  width: number
  height: number
  open: () => Sharp
}

/**
 * Reads any supported input into an ImageSource.
 * Prebuilt sharp reads HEIC headers but can't decode iPhone (HEVC) pixels,
 * so those go through heic-decode to raw RGBA instead.
 */
export async function decodeImage(input: Buffer): Promise<ImageSource> {
  let metadata: Metadata | undefined
  try {
    metadata = await sharp(input).metadata()
  } catch {
    // sharp can't read it at all: maybe HEIC sharp doesn't recognise, maybe not an image
    metadata = undefined
  }

  if (metadata) {
    assertPixelLimit(metadata.width, metadata.height)

    // AVIF is also 'heif' to sharp, but sharp decodes that one natively
    const isHeic = metadata.format === 'heif' && metadata.compression !== 'av1'
    if (!isHeic) {
      return {
        inputFormat: metadata.format,
        width: metadata.autoOrient.width,
        height: metadata.autoOrient.height,
        // autoOrient applies the EXIF orientation, so phone photos aren't sideways
        open: () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).autoOrient(),
      }
    }
  }

  return decodeHeic(input, metadata !== undefined)
}

async function decodeHeic(input: Buffer, knownHeic: boolean): Promise<ImageSource> {
  let decoded
  try {
    decoded = await heicDecode({ buffer: input })
  } catch (error) {
    // heic-decode throws a TypeError when the buffer isn't HEIC at all
    if (!knownHeic && error instanceof TypeError) {
      throw new ImageError('UNSUPPORTED_FORMAT', 'File is not a supported image format', { cause: error })
    }
    throw new ImageError('DECODE_FAILED', 'HEIC file could not be decoded. It may be corrupted.', { cause: error })
  }

  const { width, height, data } = decoded
  assertPixelLimit(width, height)
  const pixels = Buffer.from(data.buffer, data.byteOffset, data.byteLength)

  return {
    inputFormat: 'heif',
    width,
    height,
    // heic-decode always returns RGBA, but iPhone photos have no transparency.
    // Dropping the empty alpha channel saves memory and encode time.
    open: () => sharp(pixels, { raw: { width, height, channels: 4 } }).removeAlpha(),
  }
}

function assertPixelLimit(width: number | undefined, height: number | undefined): void {
  if (width && height && width * height > MAX_INPUT_PIXELS) {
    throw new ImageError(
      'TOO_MANY_PIXELS',
      `Image is ${width}×${height} px. The limit is ${MAX_INPUT_PIXELS / 1_000_000} megapixels.`,
    )
  }
}

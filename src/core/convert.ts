import { decodeImage, type ImageSource } from './decode.js'
import { encodeWithinBudget, resizeToRaw } from './encode.js'
import { FORMATS, type OutputFormat } from './formats.js'
import { assertValidOptions, type ConvertOptions } from './options.js'

export interface InputInfo {
  format: string
  bytes: number
  width: number
  height: number
}

export interface OutputImage {
  buffer: Buffer
  format: OutputFormat
  ext: string
  mime: string
  bytes: number
  width: number
  height: number
  quality: number
  withinBudget: boolean
}

export interface ConvertResult {
  input: InputInfo
  output: OutputImage
}

export interface ConvertManyResult {
  input: InputInfo
  /** One entry per distinct width, smallest first */
  outputs: OutputImage[]
}

/** Convert one image to one output. Pure: buffer in, buffer + stats out. No disk access. */
export async function convertImage(input: Buffer, options: ConvertOptions): Promise<ConvertResult> {
  assertValidOptions(options)
  const source = await decodeImage(input)

  return {
    input: { format: source.inputFormat, bytes: input.length, width: source.width, height: source.height },
    output: await convertSource(source, options, options.width),
  }
}

/**
 * Convert one image to several widths (e.g. 800, 1600, 2400 for srcset).
 * Decodes the input once. `options.width` is ignored; `widths` is used instead.
 * Widths larger than the original are clamped, so duplicates are removed.
 */
export async function convertImageToWidths(
  input: Buffer,
  widths: number[],
  options: Omit<ConvertOptions, 'width'>,
): Promise<ConvertManyResult> {
  for (const width of widths) assertValidOptions({ ...options, width })
  if (widths.length === 0) assertValidOptions(options)

  const source = await decodeImage(input)
  const targets = [...new Set(widths.map(w => Math.min(w, source.width)))].sort((a, b) => a - b)
  if (targets.length === 0) targets.push(source.width)

  // Sequential on purpose: one encode at a time keeps memory low on a small server
  const outputs: OutputImage[] = []
  for (const width of targets) {
    outputs.push(await convertSource(source, options, width))
  }

  return {
    input: { format: source.inputFormat, bytes: input.length, width: source.width, height: source.height },
    outputs,
  }
}

async function convertSource(
  source: ImageSource,
  options: Omit<ConvertOptions, 'width'>,
  width: number | undefined,
): Promise<OutputImage> {
  const raw = await resizeToRaw(source, width)
  const { buffer, quality, withinBudget } = await encodeWithinBudget(raw, options.format, options)
  const { ext, mime } = FORMATS[options.format]

  return {
    buffer,
    format: options.format,
    ext,
    mime,
    bytes: buffer.length,
    width: raw.info.width,
    height: raw.info.height,
    quality,
    withinBudget,
  }
}

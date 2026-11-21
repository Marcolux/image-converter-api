import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTIONS,
  ImageError,
  OUTPUT_FORMATS,
  convertImage,
  convertImageToWidths,
  type ConvertOptions,
} from '../src/core/index.js'
import { flatPng, noiseJpeg, rotatedJpegWithExif } from './helpers/images.js'

const base: ConvertOptions = { format: 'webp', startQuality: 90, minQuality: 40 }

async function expectImageError(promise: Promise<unknown>, code: ImageError['code']) {
  const error = await promise.catch(e => e)
  expect(error).toBeInstanceOf(ImageError)
  expect(error.code).toBe(code)
}

describe('convertImage', () => {
  it('converts a JPEG to WebP and resizes to the requested width', async () => {
    const input = await noiseJpeg(1200, 600)
    const { input: info, output } = await convertImage(input, { ...base, width: 600 })

    expect(info).toMatchObject({ format: 'jpeg', width: 1200, height: 600, bytes: input.length })
    expect(output).toMatchObject({ format: 'webp', ext: '.webp', mime: 'image/webp', width: 600, height: 300 })
    expect(output.bytes).toBe(output.buffer.length)
    expect((await sharp(output.buffer).metadata()).format).toBe('webp')
  })

  it('never enlarges a smaller image', async () => {
    const { output } = await convertImage(await flatPng(300, 200), { ...base, width: 1000 })
    expect(output).toMatchObject({ width: 300, height: 200 })
  })

  it('keeps the original size when no width is given', async () => {
    const { output } = await convertImage(await flatPng(640, 480), base)
    expect(output).toMatchObject({ width: 640, height: 480 })
  })

  it.each(OUTPUT_FORMATS)('encodes %s', async format => {
    const { output } = await convertImage(await flatPng(100, 100), { ...base, format })
    const detected = (await sharp(output.buffer).metadata()).format
    // sharp reports AVIF as 'heif'
    expect(detected).toBe(format === 'avif' ? 'heif' : format)
  })

  it('uses startQuality when there is no size budget', async () => {
    const { output } = await convertImage(await noiseJpeg(400, 400), base)
    expect(output).toMatchObject({ quality: 90, withinBudget: true })
  })

  it('lowers quality to fit maxKB', async () => {
    const input = await noiseJpeg(800, 800)
    // Budget halfway between the sizes at minQuality and startQuality, so the search must land in between
    const atMin = await convertImage(input, { ...base, startQuality: 40 })
    const atStart = await convertImage(input, base)
    const maxKB = (atMin.output.bytes + atStart.output.bytes) / 2 / 1024

    const { output } = await convertImage(input, { ...base, maxKB })

    expect(output.withinBudget).toBe(true)
    expect(output.bytes / 1024).toBeLessThanOrEqual(maxKB)
    expect(output.quality).toBeLessThan(90)
    expect(output.quality).toBeGreaterThanOrEqual(40)
  })

  it('returns the minQuality version when the budget is impossible', async () => {
    const { output } = await convertImage(await noiseJpeg(800, 800), { ...base, maxKB: 1 })
    expect(output).toMatchObject({ quality: 40, withinBudget: false })
  })

  it('applies EXIF orientation and strips metadata', async () => {
    // Stored 400×200 landscape, orientation 6 means it displays as 200×400 portrait
    const { input, output } = await convertImage(await rotatedJpegWithExif(400, 200), base)

    expect(input).toMatchObject({ width: 200, height: 400 })
    expect(output).toMatchObject({ width: 200, height: 400 })

    const meta = await sharp(output.buffer).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
  })

  it('works with the default options', async () => {
    const { output } = await convertImage(await noiseJpeg(1500, 1000), DEFAULT_OPTIONS)
    expect(output.width).toBe(1000)
    expect(output.bytes / 1024).toBeLessThanOrEqual(DEFAULT_OPTIONS.maxKB)
  })
})

describe('convertImageToWidths', () => {
  it('returns one output per distinct width, smallest first', async () => {
    const { outputs } = await convertImageToWidths(await flatPng(2000, 1000), [1600, 800, 800], base)
    expect(outputs.map(o => o.width)).toEqual([800, 1600])
    expect(outputs.map(o => o.height)).toEqual([400, 800])
  })

  it('clamps widths larger than the original and removes duplicates', async () => {
    const { outputs } = await convertImageToWidths(await flatPng(1000, 500), [800, 1600, 2400], base)
    expect(outputs.map(o => o.width)).toEqual([800, 1000])
  })

  it('keeps the original size when the list is empty', async () => {
    const { outputs } = await convertImageToWidths(await flatPng(500, 250), [], base)
    expect(outputs.map(o => o.width)).toEqual([500])
  })
})

describe('errors', () => {
  it('rejects input that is not an image', async () => {
    await expectImageError(convertImage(Buffer.from('definitely not an image'), base), 'UNSUPPORTED_FORMAT')
  })

  it('rejects a truncated image', async () => {
    const input = await noiseJpeg(800, 800)
    await expectImageError(convertImage(input.subarray(0, input.length / 2), base), 'DECODE_FAILED')
  })

  it.each<[string, Partial<ConvertOptions>]>([
    ['unknown format', { format: 'gif' as ConvertOptions['format'] }],
    ['quality over 100', { startQuality: 101 }],
    ['minQuality above startQuality', { minQuality: 95 }],
    ['zero width', { width: 0 }],
    ['negative maxKB', { maxKB: -5 }],
  ])('rejects invalid options: %s', async (_, override) => {
    await expectImageError(convertImage(await flatPng(10, 10), { ...base, ...override }), 'INVALID_OPTIONS')
  })

  it('rejects an invalid width in the widths list', async () => {
    await expectImageError(convertImageToWidths(await flatPng(10, 10), [800, -1], base), 'INVALID_OPTIONS')
  })
})

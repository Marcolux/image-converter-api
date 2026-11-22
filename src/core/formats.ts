import type { Sharp } from 'sharp'

/**
 * Output formats:
 *   webp  Best all-round: great compression, transparency, wide browser support. Default.
 *   avif  Best compression (~50% smaller than WebP). Slower to encode.
 *   jpeg  Universal compatibility, including email clients. No transparency.
 *   png   Lossless by default. Largest files. Quality reduces the colour palette,
 *         so file size is mainly controlled by resizing.
 */
export const OUTPUT_FORMATS = ['webp', 'avif', 'jpeg', 'png'] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

interface FormatConfig {
  ext: string
  mime: string
  /**
   * Default quality range when the caller doesn't set one.
   * Quality numbers aren't comparable across formats: AVIF 60 looks roughly like WebP 85.
   */
  quality: { start: number; min: number }
  encode: (image: Sharp, quality: number) => Sharp
}

export const FORMATS: Record<OutputFormat, FormatConfig> = {
  webp: {
    ext: '.webp',
    mime: 'image/webp',
    quality: { start: 100, min: 60 },
    // smartSubsample keeps colour edges sharper (~5% larger files)
    encode: (image, quality) => image.webp({ quality, alphaQuality: 100, smartSubsample: true }),
  },
  avif: {
    ext: '.avif',
    mime: 'image/avif',
    // Starting at 100 is near-lossless and very slow for AVIF; 70 already looks excellent
    quality: { start: 70, min: 40 },
    // effort 2 (default 4) encodes ~10× faster for ~5% larger files.
    // Matters because the quality search may encode several times per image.
    encode: (image, quality) => image.avif({ quality, effort: 2 }),
  },
  jpeg: {
    ext: '.jpg',
    mime: 'image/jpeg',
    quality: { start: 100, min: 60 },
    encode: (image, quality) => image.jpeg({ quality, mozjpeg: true }),
  },
  png: {
    ext: '.png',
    mime: 'image/png',
    quality: { start: 100, min: 60 },
    // Setting quality turns on palette quantisation; compressionLevel 9 = smallest, slowest
    encode: (image, quality) => image.png({ quality, compressionLevel: 9 }),
  },
}

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value)
}

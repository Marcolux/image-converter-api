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
  encode: (image: Sharp, quality: number) => Sharp
}

export const FORMATS: Record<OutputFormat, FormatConfig> = {
  webp: {
    ext: '.webp',
    mime: 'image/webp',
    // smartSubsample keeps colour edges sharper (~5% larger files)
    encode: (image, quality) => image.webp({ quality, alphaQuality: 100, smartSubsample: true }),
  },
  avif: {
    ext: '.avif',
    mime: 'image/avif',
    encode: (image, quality) => image.avif({ quality }),
  },
  jpeg: {
    ext: '.jpg',
    mime: 'image/jpeg',
    encode: (image, quality) => image.jpeg({ quality, mozjpeg: true }),
  },
  png: {
    ext: '.png',
    mime: 'image/png',
    // Setting quality turns on palette quantisation; compressionLevel 9 = smallest, slowest
    encode: (image, quality) => image.png({ quality, compressionLevel: 9 }),
  },
}

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value)
}

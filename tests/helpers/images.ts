import { randomFillSync } from 'node:crypto'
import sharp from 'sharp'

// Test images are generated in memory, so the repo needs no binary fixtures.

/** Random noise compresses badly, so it's good for testing the size budget. */
export function noiseJpeg(width: number, height: number): Promise<Buffer> {
  const pixels = randomFillSync(Buffer.alloc(width * height * 3))
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer()
}

/** Flat colour compresses to almost nothing. */
export function flatPng(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#be508f' } }).png().toBuffer()
}

/** JPEG stored landscape with EXIF orientation 6 (rotate 90°), like a phone photo taken upright. */
export function rotatedJpegWithExif(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#3a4c97' } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'test' } } })
    .toBuffer()
}

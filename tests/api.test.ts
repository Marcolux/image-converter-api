import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../src/app.js'
import { flatPng, noiseJpeg } from './helpers/images.js'

// supertest sends requests straight to the Express app: no server, no port.

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('POST /convert', () => {
  it('returns the converted image', async () => {
    const res = await request(app)
      .post('/convert')
      .attach('file', await noiseJpeg(1200, 600), 'photo.jpg')
      .field('format', 'avif')
      .field('width', '600')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/avif')
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('uses the defaults when no settings are sent', async () => {
    const res = await request(app).post('/convert').attach('file', await flatPng(100, 100), 'flat.png')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/webp')
  })
})

describe('errors', () => {
  it('400 NO_FILE when no file is sent', async () => {
    const res = await request(app).post('/convert').field('format', 'webp')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  it('400 when the file is sent under another field name', async () => {
    const res = await request(app).post('/convert').attach('image', await flatPng(10, 10), 'flat.png')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('LIMIT_UNEXPECTED_FILE')
  })

  it('400 INVALID_SETTINGS with the zod issues', async () => {
    const res = await request(app)
      .post('/convert')
      .attach('file', await flatPng(10, 10), 'flat.png')
      .field('startQuality', '500')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_SETTINGS')
    expect(res.body.error.issues[0].path).toEqual(['startQuality'])
  })

  it('400 INVALID_OPTIONS when minQuality is above startQuality (checked by the core)', async () => {
    const res = await request(app)
      .post('/convert')
      .attach('file', await flatPng(10, 10), 'flat.png')
      .field('startQuality', '50')
      .field('minQuality', '80')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_OPTIONS')
  })

  it('415 for a file that is not an image', async () => {
    const res = await request(app)
      .post('/convert')
      .attach('file', Buffer.from('just some text'), 'fake.png')

    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('UNSUPPORTED_FORMAT')
  })

  it('422 for a truncated image', async () => {
    const image = await noiseJpeg(400, 400)
    const res = await request(app)
      .post('/convert')
      .attach('file', image.subarray(0, image.length / 2), 'broken.jpg')

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('DECODE_FAILED')
  })

  it('413 for a file over the upload limit', async () => {
    const res = await request(app)
      .post('/convert')
      .attach('file', Buffer.alloc(26 * 1024 * 1024), 'huge.png')

    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  }, 30_000)

  it('404 NOT_FOUND for an unknown route', async () => {
    const res = await request(app).get('/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('404 for GET /convert (only POST exists)', async () => {
    const res = await request(app).get('/convert')
    expect(res.status).toBe(404)
  })
})

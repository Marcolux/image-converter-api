import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createCors, parseAllowedOrigins } from '../src/middleware/cors.js'

describe('parseAllowedOrigins', () => {
  it.each<[string | undefined, string[]]>([
    [undefined, []],
    ['', []],
    ['http://localhost:3000', ['http://localhost:3000']],
    ['http://localhost:3000, https://site.com', ['http://localhost:3000', 'https://site.com']],
    ['https://site.com/,https://other.com//', ['https://site.com', 'https://other.com']],
    ['https://site.com,', ['https://site.com']],
  ])('%j → %j', (input, expected) => {
    expect(parseAllowedOrigins(input)).toEqual(expected)
  })
})

describe('createCors', () => {
  // A tiny app with only the CORS middleware, so the test doesn't depend on env vars
  const app = express()
  app.use(createCors(['https://site.com']))
  app.get('/ping', (_req, res) => {
    res.json({ ok: true })
  })

  it('allows a listed origin and exposes the stats headers', async () => {
    const res = await request(app).get('/ping').set('Origin', 'https://site.com')
    expect(res.headers['access-control-allow-origin']).toBe('https://site.com')
    expect(res.headers['access-control-expose-headers']).toContain('X-Output-Bytes')
  })

  it('gives no CORS permission to other origins (the browser then blocks the response)', async () => {
    const res = await request(app).get('/ping').set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('treats www and http variants as different origins', async () => {
    for (const origin of ['https://www.site.com', 'http://site.com']) {
      const res = await request(app).get('/ping').set('Origin', origin)
      expect(res.headers['access-control-allow-origin'], origin).toBeUndefined()
    }
  })

  it('answers the browser preflight for a listed origin', async () => {
    const res = await request(app)
      .options('/ping')
      .set('Origin', 'https://site.com')
      .set('Access-Control-Request-Method', 'POST')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://site.com')
  })

  it('allows nothing when the list is empty', async () => {
    const closed = express()
    closed.use(createCors([]))
    closed.get('/ping', (_req, res) => {
      res.json({ ok: true })
    })
    const res = await request(closed).get('/ping').set('Origin', 'https://site.com')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

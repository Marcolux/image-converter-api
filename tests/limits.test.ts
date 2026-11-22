import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { createConvertRateLimit } from '../src/middleware/rateLimit.js'
import { readPositiveInt } from '../src/utils/env.js'
import { Semaphore } from '../src/utils/semaphore.js'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('Semaphore', () => {
  it('never runs more than max tasks at once', async () => {
    const slots = new Semaphore(2)
    let running = 0
    let peak = 0

    const task = async () => {
      running++
      peak = Math.max(peak, running)
      await wait(10)
      running--
    }

    await Promise.all(Array.from({ length: 6 }, () => slots.run(task)))
    expect(peak).toBe(2)
    expect(slots.running).toBe(0)
    expect(slots.pending).toBe(0)
  })

  it('runs waiting tasks in arrival order', async () => {
    const slots = new Semaphore(1)
    const order: number[] = []
    await Promise.all([1, 2, 3, 4].map(n => slots.run(async () => {
      await wait(5)
      order.push(n)
    })))
    expect(order).toEqual([1, 2, 3, 4])
  })

  it('frees the slot when a task fails', async () => {
    const slots = new Semaphore(1)
    await expect(slots.run(async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(slots.running).toBe(0)
    await expect(slots.run(async () => 'next one runs')).resolves.toBe('next one runs')
  })

  it('reports pending tasks', async () => {
    const slots = new Semaphore(1)
    const first = slots.run(() => wait(20))
    const second = slots.run(() => wait(1))
    expect(slots.running).toBe(1)
    expect(slots.pending).toBe(1)
    await Promise.all([first, second])
  })
})

describe('rate limit', () => {
  it('returns 429 RATE_LIMITED in the usual JSON shape after the limit', async () => {
    const app = express()
    app.post('/convert', createConvertRateLimit(2), (_req, res) => {
      res.json({ ok: true })
    })
    app.use(errorHandler)

    expect((await request(app).post('/convert')).status).toBe(200)
    expect((await request(app).post('/convert')).status).toBe(200)

    const blocked = await request(app).post('/convert')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
    expect(blocked.headers['retry-after']).toBeDefined()
    expect(blocked.headers['ratelimit-policy']).toBeDefined()
  })

  it('counts each visitor IP separately behind the proxy', async () => {
    const app = express()
    app.set('trust proxy', 1)
    app.post('/convert', createConvertRateLimit(1), (_req, res) => {
      res.json({ ok: true })
    })
    app.use(errorHandler)

    const from = (ip: string) => request(app).post('/convert').set('X-Forwarded-For', ip)
    expect((await from('203.0.113.1')).status).toBe(200)
    expect((await from('203.0.113.1')).status).toBe(429)
    expect((await from('203.0.113.2')).status).toBe(200) // another visitor still has their quota
  })
})

describe('readPositiveInt', () => {
  it.each<[string | undefined, number]>([
    [undefined, 5],
    ['', 5],
    ['abc', 5],
    ['0', 5],
    ['-3', 5],
    ['2.5', 5],
    ['3', 3],
  ])('%j → %d (fallback 5)', (input, expected) => {
    expect(readPositiveInt(input, 5)).toBe(expected)
  })
})

import type { RequestHandler } from 'express'
import { HttpError } from '../errors/HttpErrors.js'
import { readPositiveInt } from '../utils/env.js'
import { Semaphore } from '../utils/semaphore.js'

/**
 * How many conversions run at the same time (CONVERT_CONCURRENCY, default 1).
 * 1 fits the free Render instance (512 MB, a fraction of a CPU). Raise it on a bigger instance.
 */
export const conversionSlots = new Semaphore(readPositiveInt(process.env.CONVERT_CONCURRENCY, 1))

/**
 * How many conversions may wait in line (CONVERT_MAX_WAITING, default 10).
 * Each waiting request already holds its upload in memory, so the line can't grow forever.
 * The frontend sends 2–3 files at a time, so normal use stays far below this.
 */
const MAX_WAITING = readPositiveInt(process.env.CONVERT_MAX_WAITING, 10)

/**
 * Runs before the upload is read: when the line is full, reject right away (503)
 * instead of receiving another file the server has no room for.
 */
export const rejectWhenBusy: RequestHandler = (_req, res, next) => {
  if (conversionSlots.pending >= MAX_WAITING) {
    res.set('Retry-After', '30')
    next(new HttpError(503, 'SERVER_BUSY', 'The server is busy converting other images. Try again shortly.'))
    return
  }
  next()
}

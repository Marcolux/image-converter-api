import rateLimit from 'express-rate-limit'
import { HttpError } from '../errors/HttpErrors.js'
import { readPositiveInt } from '../utils/env.js'

const FIFTEEN_MINUTES = 15 * 60 * 1000

/**
 * Max conversions per IP per 15 minutes (RATE_LIMIT_MAX, default 60).
 * Fits several 10–15 photo batches; blocks scripts sending hundreds of requests.
 * Counts live in memory: they reset on restart/deploy and aren't shared between instances.
 */
export function createConvertRateLimit(limit = readPositiveInt(process.env.RATE_LIMIT_MAX, 60), windowMs = FIFTEEN_MINUTES) {
  return rateLimit({
    windowMs,
    limit,
    // Sends RateLimit / RateLimit-Policy headers so the frontend can show what's left
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Over the limit: hand a 429 to the error middleware so the response has our usual JSON shape.
    // express-rate-limit has already set the Retry-After header at this point.
    handler: (_req, _res, next) => {
      next(new HttpError(429, 'RATE_LIMITED', `Too many conversions. The limit is ${limit} per 15 minutes.`))
    },
  })
}

export const convertRateLimit = createConvertRateLimit()

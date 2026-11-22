import type { ErrorRequestHandler, RequestHandler } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import { ImageError, type ImageErrorCode } from '../core/index.js'
import { HttpError } from '../errors/HttpErrors.js'

// Every error response has this shape, so the frontend handles all errors the same way
interface ErrorBody {
  error: {
    code: string
    message: string
    issues?: unknown
  }
}

const IMAGE_ERROR_STATUS: Record<ImageErrorCode, number> = {
  INVALID_OPTIONS: 400,     // e.g. minQuality higher than startQuality
  UNSUPPORTED_FORMAT: 415,  // not an image we can read
  DECODE_FAILED: 422,       // readable format, but corrupted or truncated
  TOO_MANY_PIXELS: 413,     // dimensions over the limit
}

/** Runs after all routes: nothing matched, so the route doesn't exist. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`))
}

/**
 * Turns any thrown error into a JSON response.
 * Express knows this is an error handler because it has 4 parameters, so keep all 4,
 * and register it last in app.ts.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // Part of the response was already sent (e.g. a zip stream failed halfway).
  // Too late to send JSON: let Express close the connection.
  if (res.headersSent) {
    next(err)
    return
  }

  const [status, body] = toResponse(err)

  // Unexpected errors: full details in the server log (Render → Logs), generic message to the client.
  // Our own HttpErrors (e.g. 503 SERVER_BUSY) are expected, so they don't fill the log with stack traces.
  if (status >= 500 && !(err instanceof HttpError)) console.error(err)

  res.status(status).json(body)
}

function toResponse(err: unknown): [number, ErrorBody] {
  if (err instanceof HttpError) {
    return [err.status, { error: { code: err.code, message: err.message } }]
  }

  if (err instanceof ImageError) {
    return [IMAGE_ERROR_STATUS[err.code], { error: { code: err.code, message: err.message } }]
  }

  if (err instanceof ZodError) {
    return [400, { error: { code: 'INVALID_SETTINGS', message: 'Invalid settings', issues: err.issues } }]
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return [413, { error: { code: 'FILE_TOO_LARGE', message: 'File is larger than the upload limit' } }]
    }
    // e.g. LIMIT_UNEXPECTED_FILE: the file was sent under another field name than `file`
    return [400, { error: { code: err.code, message: err.message } }]
  }

  // Errors from Express or its parsers (e.g. a malformed multipart body) carry a 4xx status
  const status = (err as { status?: unknown })?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return [status, { error: { code: 'BAD_REQUEST', message: 'Malformed request' } }]
  }

  return [500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }]
}

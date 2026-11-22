import express from 'express'
import morgan from 'morgan'
import healthRoutes from './routes/health.js'
import convertImagesRoutes from './routes/convert.js'
import { createCors, parseAllowedOrigins } from './middleware/cors.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

// Sites allowed to call the API from a browser, from ALLOWED_ORIGIN (comma-separated)
const allowedSites = parseAllowedOrigins(process.env.ALLOWED_ORIGIN)
if (allowedSites.length === 0 && process.env.NODE_ENV !== 'test') {
  console.warn('ALLOWED_ORIGIN is empty: no website can call this API from a browser.')
}

// Request log line per request; skipped in tests to keep the output readable
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'))
app.use(createCors(allowedSites))

// ===== Routes ===== \\
app.use(healthRoutes)
app.use(convertImagesRoutes)

// ===== Errors (must stay last) ===== \\
app.use(notFound)
app.use(errorHandler)

export default app

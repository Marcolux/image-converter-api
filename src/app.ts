import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import healthRoutes from './routes/health.js'
import convertImagesRoutes from './routes/convert.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

// Request log line per request; skipped in tests to keep the output readable
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'))
app.use(cors())

// ===== Routes ===== \\
app.use(healthRoutes)
app.use(convertImagesRoutes)

// ===== Errors (must stay last) ===== \\
app.use(notFound)
app.use(errorHandler)

export default app

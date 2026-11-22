import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import healthRoutes from './routes/health.js'
import convertImagesRoutes from './routes/convert.js'

const app = express()

app.use(morgan('tiny'))
app.use(cors())

// ===== Routes ===== \\
app.use(healthRoutes)
app.use(convertImagesRoutes)


export default app
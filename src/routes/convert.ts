import { Router } from "express";
import convertImages from "../controllers/convertImg.controller.js";
import { rejectWhenBusy } from '../middleware/conversionQueue.js'
import { convertRateLimit } from '../middleware/rateLimit.js'
import { uploadImage } from '../middleware/upload.js'

const convertImagesRoutes = Router()

// Order matters: the cheap checks run before the upload is read into memory.
//   1. rate limit per IP  →  429
//   2. conversion line full  →  503
//   3. read the upload (multer)
//   4. validate, wait for a free slot, convert
convertImagesRoutes.post('/convert', convertRateLimit, rejectWhenBusy, uploadImage, convertImages.convert)

export default convertImagesRoutes

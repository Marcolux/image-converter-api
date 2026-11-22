import { Router } from "express";
import convertImages from "../controllers/convertImg.controller.js";
import { uploadImage } from '../middleware/upload.js'

const convertImagesRoutes = Router()

convertImagesRoutes.post('/convert', uploadImage, convertImages.convert)

export default convertImagesRoutes
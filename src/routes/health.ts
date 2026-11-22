import healthCheckController from "../controllers/healthCheck.controllers.js"
import { Router } from "express"

const healthRoutes = Router()

healthRoutes.get('/health', healthCheckController.getHealth)

export default healthRoutes
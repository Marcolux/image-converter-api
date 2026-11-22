import type { Request, Response } from "express"

const  healthCheckController = {

    getHealth : (_req: Request, res: Response) => {
        res.status(200).json({ status: "ok" })
    }
} 

export default healthCheckController
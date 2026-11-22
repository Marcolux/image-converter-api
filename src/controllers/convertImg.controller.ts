import type { Request, Response } from "express"
import { convertImage } from "../core/index.js"
import { fileSchema } from "../validation/options.validations.js"

const convertImages = {
    convert: async (req: Request, res: Response) => {

        if(!req.file) {
            res.status(400).json({error: {code: 'NO_FILE', message: 'No image uploaded'}})
            return
        }

        const parsed = fileSchema.safeParse(req.body)
        if (!parsed.success) {
            res.status(400).json({ error: { code: 'INVALID_SETTINGS', issues: parsed.error.issues } })
            return
        }

        const result = await convertImage(req.file.buffer, parsed.data)
        res.type(result.output.mime).send(result.output.buffer)
    }
}

export default convertImages
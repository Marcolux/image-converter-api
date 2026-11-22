import type { Request, Response } from "express"
import { convertImage } from "../core/index.js"
import { HttpError } from "../errors/HttpErrors.js"
import { conversionSlots } from "../middleware/conversionQueue.js"
import { fileSchema } from "../validation/options.validations.js"

// No try/catch: Express 5 sends anything thrown here (including from async code)
// to the error middleware, which picks the status and the JSON response.
const convertImages = {
    convert: async (req: Request, res: Response) => {

        if (!req.file) {
            throw new HttpError(400, 'NO_FILE', 'No image uploaded. Send it in the `file` field.')
        }

        // Throws a ZodError on invalid settings → 400 INVALID_SETTINGS
        const settings = fileSchema.parse(req.body)

        // Waits here when another conversion is running (CONVERT_CONCURRENCY at a time)
        const file = req.file
        const result = await conversionSlots.run(() => convertImage(file.buffer, settings))
        res.type(result.output.mime).send(result.output.buffer)
    }
}

export default convertImages

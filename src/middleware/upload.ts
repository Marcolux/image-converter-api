import multer from 'multer'

// 25 MB. Bigger uploads are rejected with a LIMIT_FILE_SIZE error (→ 413 later)
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const upload = multer({
  // Keep the file in memory as req.file.buffer. Nothing is written to disk.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
})

// 'file' must match the form field name the frontend (or curl -F "file=@...") uses
export const uploadImage = upload.single('file')
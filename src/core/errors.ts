// Errors the core can throw. The API layer maps each code to an HTTP status,
// so nothing in core knows about HTTP.
export type ImageErrorCode =
  | 'INVALID_OPTIONS'     // settings out of range or inconsistent
  | 'UNSUPPORTED_FORMAT'  // not an image sharp or heic-decode can read
  | 'DECODE_FAILED'       // recognised format, but the file is corrupted or truncated
  | 'TOO_MANY_PIXELS'     // dimensions over MAX_INPUT_PIXELS

export class ImageError extends Error {
  readonly code: ImageErrorCode

  constructor(code: ImageErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ImageError'
    this.code = code
  }
}

// Errors the API layer throws itself (problems with the request, not the image).
// The error middleware turns them into a JSON response with this status and code.
export type HttpErrorCode =
  | 'NO_FILE'       // request has no file in the `file` field
  | 'NOT_FOUND'     // unknown route
  | 'RATE_LIMITED'  // too many conversions from this IP (429)
  | 'SERVER_BUSY'   // conversion line is full (503)

export class HttpError extends Error {
  readonly status: number
  readonly code: HttpErrorCode

  constructor(status: number, code: HttpErrorCode, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

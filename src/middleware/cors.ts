import cors from 'cors'

/**
 * Headers the browser is allowed to read from our responses.
 * Without this list, frontend code can't see them even when CORS allows the request.
 */
const EXPOSED_HEADERS = [
  'Content-Disposition',
  'X-Original-Bytes',
  'X-Output-Bytes',
  'X-Width',
  'X-Height',
  'X-Quality',
  'X-Within-Budget',
  // Rate limit / busy responses: lets the frontend say "try again in X"
  'Retry-After',
  'RateLimit',
  'RateLimit-Policy',
]

/**
 * Turns ALLOWED_ORIGIN ("http://localhost:3000, https://site.com/") into a clean list.
 * An origin is protocol + domain (+ port) only, so trailing slashes are removed
 * and empty entries (e.g. from a trailing comma) are dropped.
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(origin => origin.length > 0)
}

/**
 * Only the listed sites may call the API from a browser.
 * An empty list allows no browser origin at all (never "allow everything").
 * Requests without an Origin header (Postman, curl, server-to-server, tests) are not
 * affected: CORS is a browser rule. Abuse protection is the rate limiter's job.
 */
export function createCors(allowedOrigins: string[]) {
  return cors({
    origin: allowedOrigins,
    exposedHeaders: EXPOSED_HEADERS,
  })
}

import type { Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'

// REPLACE_ME — add your real production origins here.
// The last two entries are what the iOS/Android Capacitor shells send as
// Origin; keep them — deleting them breaks the native builds' API calls.
const ALLOWED_ORIGINS = [
  'https://example.com',
  'https://www.example.com',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
]

/**
 * Applies CORS headers for allow-listed origins and handles preflight.
 * Returns true if the caller should stop processing (preflight handled).
 */
export function applyCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin
  if (typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return true
  }
  return false
}

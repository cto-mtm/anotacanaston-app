const FALLBACK_PROD_URL = 'https://us-central1-anotacanaston-app.cloudfunctions.net/api'
const FALLBACK_DEV_URL = 'http://127.0.0.1:5001/demo-app/us-central1/api'

// `||` so an empty VITE_API_URL= line also falls back.
const BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? FALLBACK_DEV_URL : FALLBACK_PROD_URL)

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: body?.error ? JSON.stringify(body.error) : `HTTP ${res.status}` }
    }
    return { ok: true, data: body as T }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

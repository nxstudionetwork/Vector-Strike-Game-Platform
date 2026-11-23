/**
 * Central API client.
 *
 * - The access token lives only in memory (never localStorage).
 * - The refresh token is an httpOnly cookie the browser sends to /api/auth/*.
 * - On a 401, the client refreshes once (single-flight) and retries.
 */
import type { MeUser } from './types'

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

let accessToken: string | null = null
let refreshInFlight: Promise<AuthPayload | null> | null = null
const sessionListeners = new Set<() => void>()

export interface AuthPayload {
  access: string
  user: MeUser
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Subscribe to "session expired" (refresh failed while signed in). */
export function onSessionExpired(listener: () => void) {
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string[]>

  constructor(status: number, code: string, message: string, fields: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }

  get isNetwork() {
    return this.status === 0
  }

  fieldError(name: string): string | undefined {
    return this.fields[name]?.[0]
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

async function parseError(res: Response): Promise<ApiError> {
  let data: { error?: { code?: string; message?: string; fields?: Record<string, string[]> } } = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON error */
  }
  const err = data.error ?? {}
  return new ApiError(
    res.status,
    err.code ?? 'error',
    err.message ?? (res.status >= 500 ? 'Something went wrong on our side.' : 'Request failed.'),
    err.fields ?? {},
  )
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`
  try {
    return await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'network', 'You appear to be offline. Check your connection and try again.')
  }
}

/** Exchange the refresh cookie for a new access token. Resolves null when not signed in. */
export function refreshSession(): Promise<AuthPayload | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await send('/auth/refresh/', { method: 'POST', auth: false })
      if (res.status === 204) {
        accessToken = null
        return null
      }
      if (!res.ok) {
        if (res.status === 401) {
          accessToken = null
          return null
        }
        throw await parseError(res)
      }
      const payload = (await res.json()) as AuthPayload
      accessToken = payload.access
      return payload
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)
  if (res.status === 401 && opts.auth !== false) {
    const hadSession = accessToken !== null
    const refreshed = await refreshSession().catch(() => null)
    if (refreshed) {
      res = await send(path, opts)
    } else if (hadSession) {
      sessionListeners.forEach((l) => l())
    }
  }
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

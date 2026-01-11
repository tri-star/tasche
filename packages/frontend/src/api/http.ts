export type ApiError = {
  code: string
  message: string
}

export type ApiEnvelope<T> = { data: T } | { error: ApiError }

export class HttpError extends Error {
  public readonly status: number
  public readonly apiError?: ApiError

  constructor(message: string, status: number, apiError?: ApiError) {
    super(message)
    this.status = status
    this.apiError = apiError
  }
}

type FetchOptions = {
  accessToken?: string | null
  retryOnUnauthorized?: boolean
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text()
  if (!text) return { error: { code: 'EMPTY_RESPONSE', message: 'Empty response' } }
  return JSON.parse(text) as ApiEnvelope<T>
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit,
  opts: FetchOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (opts.accessToken) {
    headers.set('Authorization', `Bearer ${opts.accessToken}`)
  }

  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  const envelope = await parseEnvelope<T>(res)

  if ('data' in envelope) return envelope.data

  if (res.status === 401 && opts.retryOnUnauthorized) {
    // TODO: /api/auth/refresh を叩いて access token を更新する（Auth0+Refresh Cookie設計）
  }

  throw new HttpError(envelope.error.message, res.status, envelope.error)
}

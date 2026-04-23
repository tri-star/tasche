import { getAuthClient } from "./authClientSingleton"

type AuthFetchConfig = {
  url: string
  method: string
  headers?: Record<string, string>
  data?: unknown
  params?: Record<string, unknown>
  signal?: AbortSignal
}

/**
 * orval の mutator 関数。
 * orval 生成クライアントの全 API 呼び出しに Authorization ヘッダ付与と 401 リトライを提供する。
 */
export async function authFetch<T>(
  config: AuthFetchConfig,
  options?: { baseURL?: string },
): Promise<T> {
  const client = getAuthClient()

  // クエリパラメータの組立
  let url = config.url
  if (config.params && Object.keys(config.params).length > 0) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    }
    const queryString = searchParams.toString()
    if (queryString) {
      url = `${url}?${queryString}`
    }
  }

  // baseURL の付与
  if (options?.baseURL && !url.startsWith("http")) {
    url = `${options.baseURL}${url}`
  }

  const headers: Record<string, string> = {
    ...config.headers,
  }

  // JSON body のシリアライズ
  let body: BodyInit | undefined
  if (config.data !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(config.data)
  }

  const res = await client.fetch(url, {
    method: config.method,
    headers,
    body,
    signal: config.signal,
  })

  // HTTP エラーの処理
  if (!res.ok) {
    let errorData: unknown
    try {
      errorData = await res.json()
    } catch {
      errorData = { error: { code: "UNKNOWN_ERROR", message: res.statusText } }
    }
    throw Object.assign(new Error(res.statusText), {
      status: res.status,
      data: errorData,
    })
  }

  // 204 / 205 / 304 は body なし
  if ([204, 205, 304].includes(res.status)) {
    return {} as T
  }

  return res.json() as Promise<T>
}

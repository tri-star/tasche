export type AuthClient = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  refresh(): Promise<void>
  logout(): Promise<void>
  setAccessToken(token: string | null): void
}

type AuthClientParams = {
  baseUrl: string
  getAccessToken: () => string | null
  setAccessToken: (t: string | null) => void
  onUnauthorized: () => void
}

/**
 * Authorization ヘッダ付与と、401 時の /api/auth/refresh 呼び出し＋再試行を行う fetch ラッパ
 *
 * 並行して複数の 401 が発生した場合でも /api/auth/refresh は1回だけ呼ばれる（Promise をキャッシュ）
 */
export function createAuthClient(params: AuthClientParams): AuthClient {
  const { baseUrl, getAccessToken, setAccessToken, onUnauthorized } = params

  // 並行 401 に対する refresh のシリアライズ用キャッシュ
  let refreshPromise: Promise<void> | null = null

  async function doRefresh(): Promise<void> {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })

    if (!res.ok) {
      setAccessToken(null)
      onUnauthorized()
      throw new Error("Refresh failed")
    }

    const json = await res.json()
    const token = (json as { data: { access_token: string } }).data.access_token
    setAccessToken(token)
  }

  async function refresh(): Promise<void> {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = getAccessToken()
    const headers = new Headers(init?.headers)

    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    const res = await fetch(input, {
      ...init,
      headers,
      credentials: "include",
    })

    if (res.status === 401) {
      try {
        await refresh()
      } catch {
        throw new Error("Unauthorized")
      }

      // 新トークンで再試行
      const newToken = getAccessToken()
      const retryHeaders = new Headers(init?.headers)
      if (newToken) {
        retryHeaders.set("Authorization", `Bearer ${newToken}`)
      }

      return fetch(input, {
        ...init,
        headers: retryHeaders,
        credentials: "include",
      })
    }

    return res
  }

  async function logout(): Promise<void> {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${getAccessToken() ?? ""}`,
      },
    })
    setAccessToken(null)
    onUnauthorized()
  }

  return {
    fetch: authFetch,
    refresh,
    logout,
    setAccessToken,
  }
}

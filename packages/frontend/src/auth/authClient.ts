export type AuthClient = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  logout(): Promise<void>
}

type AuthClientParams = {
  baseUrl: string
  onUnauthorized: () => void
}

/**
 * Cookie 認証専用の fetch ラッパ。
 * credentials: "include" で Cookie を自動送信し、Authorization ヘッダは付与しない。
 * 401 を受けたら onUnauthorized を呼んでセッション失効を通知し、再試行は行わない。
 */
export function createAuthClient(params: AuthClientParams): AuthClient {
  const { baseUrl, onUnauthorized } = params

  async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, {
      ...init,
      credentials: "include",
    })

    if (res.status === 401) {
      onUnauthorized()
      throw new Error("Unauthorized")
    }

    return res
  }

  async function logout(): Promise<void> {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
    onUnauthorized()
  }

  return {
    fetch: authFetch,
    logout,
  }
}

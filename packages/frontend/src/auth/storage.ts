const KEY = "tasche.oauth.pending"
const TTL_MS = 10 * 60 * 1000 // 10分

type PendingOAuth = {
  state: string
  codeVerifier: string
  redirectUri: string
  createdAt: number // ms epoch
}

export function savePendingOAuth(value: PendingOAuth): void {
  sessionStorage.setItem(KEY, JSON.stringify(value))
}

export function readPendingOAuth(): PendingOAuth | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PendingOAuth
    // 10分以上経過した場合は自動破棄
    if (Date.now() - parsed.createdAt > TTL_MS) {
      clearPendingOAuth()
      return null
    }
    return parsed
  } catch {
    clearPendingOAuth()
    return null
  }
}

export function clearPendingOAuth(): void {
  sessionStorage.removeItem(KEY)
}

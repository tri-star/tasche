import type { AuthClient } from "./authClient"

let _authClient: AuthClient | null = null

/**
 * AuthClient インスタンスを登録する（main.tsx で呼び出す）
 */
export function setAuthClient(client: AuthClient): void {
  _authClient = client
}

/**
 * 登録済みの AuthClient インスタンスを取得する
 * orval の mutator（authFetch）から呼び出される
 */
export function getAuthClient(): AuthClient {
  if (!_authClient) {
    throw new Error("AuthClient is not initialized. Call setAuthClient() in main.tsx before using.")
  }
  return _authClient
}

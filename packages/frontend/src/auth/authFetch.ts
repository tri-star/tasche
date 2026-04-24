import { getAuthClient } from "./authClientSingleton"

/**
 * orval の mutator 関数（fetch クライアント向け）。
 * orval は authFetch(url, init) の形式で呼び出す。
 * AuthClient 経由で Authorization ヘッダ付与と 401 自動リトライを適用し、
 * { data, status, headers } の形で返す。
 */
export async function authFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const client = getAuthClient()

  const res = await client.fetch(url, options)

  const body = [204, 205, 304].includes(res.status) ? null : await res.text()
  const data = body ? JSON.parse(body) : {}

  return { data, status: res.status, headers: res.headers } as T
}

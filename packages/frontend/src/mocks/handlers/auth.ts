import { HttpResponse, http } from "msw"
import { getMockAuthUser, setMockAuthUser } from "./authSession"

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
  return btoa(binary)
}

function fakeJwt(user: { email: string; name: string }): string {
  // 見た目だけ JWT っぽい文字列（frontend では検証しない）
  return `stub.${toBase64(JSON.stringify(user))}.sig`
}

export const authHandlers = [
  // 認可URL発行（MSW モードでは Google に飛ばさず /auth/callback に直帰する URL を返す）
  http.get("*/api/auth/google/authorize", ({ request }) => {
    const url = new URL(request.url)
    const redirectUri = url.searchParams.get("redirect_uri") ?? "/auth/callback"
    const state = "stub-state"
    // 直接 /auth/callback に戻す URL を返す（Google をバイパス）
    const fakeAuthUrl = `${redirectUri}?code=stub-code&state=${state}`
    return HttpResponse.json({ data: { authorization_url: fakeAuthUrl, state } })
  }),

  // code を受け取って JWT 発行
  http.post("*/api/auth/google/callback", async () => {
    const user = { email: "test-user@example.com", name: "テストユーザー" }
    setMockAuthUser(user)
    return HttpResponse.json({
      data: {
        access_token: fakeJwt(user),
        token_type: "Bearer",
        expires_in: 900,
      },
    })
  }),

  // refresh: currentUser がいれば成功（リロード後は未認証扱い）
  http.post("*/api/auth/refresh", () => {
    const currentUser = getMockAuthUser()
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: "INVALID_REFRESH_TOKEN", message: "リフレッシュトークンが無効です" } },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      data: {
        access_token: fakeJwt(currentUser),
        token_type: "Bearer",
        expires_in: 900,
      },
    })
  }),

  http.post("*/api/auth/logout", () => {
    setMockAuthUser(null)
    return HttpResponse.json({ data: { message: "ログアウトしました" } })
  }),

  // スタブログイン（開発・テスト用）
  http.post("*/api/auth/stub-login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; name?: string }
    const currentUser = {
      email: body.email ?? "test-user@example.com",
      name: body.name ?? "テストユーザー",
    }
    setMockAuthUser(currentUser)
    return HttpResponse.json({
      data: {
        access_token: fakeJwt(currentUser),
        token_type: "Bearer",
        expires_in: 900,
      },
    })
  }),
]

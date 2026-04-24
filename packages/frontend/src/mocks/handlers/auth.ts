import { HttpResponse, http } from "msw"

// モジュールスコープで現在のユーザー状態を管理
// ページリロードで揮発する（MSW は Service Worker として動くため、タブを閉じると消える）
let currentUser: { email: string; name: string } | null = null

function fakeJwt(user: { email: string; name: string }): string {
  // 見た目だけ JWT っぽい文字列（frontend では検証しない）
  return `stub.${btoa(JSON.stringify(user))}.sig`
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
    currentUser = { email: "test-user@example.com", name: "テストユーザー" }
    return HttpResponse.json({
      data: {
        access_token: fakeJwt(currentUser),
        token_type: "Bearer",
        expires_in: 900,
      },
    })
  }),

  // refresh: currentUser がいれば成功（リロード後は未認証扱い）
  http.post("*/api/auth/refresh", () => {
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
    currentUser = null
    return HttpResponse.json({ data: { message: "ログアウトしました" } })
  }),

  // スタブログイン（開発・テスト用）
  http.post("*/api/auth/stub-login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; name?: string }
    currentUser = {
      email: body.email ?? "test-user@example.com",
      name: body.name ?? "テストユーザー",
    }
    return HttpResponse.json({
      data: {
        access_token: fakeJwt(currentUser),
        token_type: "Bearer",
        expires_in: 900,
      },
    })
  }),
]

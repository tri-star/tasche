import { HttpResponse, http } from "msw"
import { setMockAuthUser } from "./authSession"

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

  // code を受け取ってセッションを確立し、UserResponse を返す
  // MSW では HttpOnly Cookie のラウンドトリップを再現できないため、
  // setMockAuthUser でセッション保持を代用する
  http.post("*/api/auth/google/callback", async () => {
    const user = { email: "test-user@example.com", name: "テストユーザー" }
    setMockAuthUser(user)
    return HttpResponse.json({
      data: {
        id: "usr_01HXYZ1234567890ABCDEF",
        email: user.email,
        name: user.name,
        picture: null,
        timezone: "Asia/Tokyo",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    })
  }),

  http.post("*/api/auth/logout", () => {
    setMockAuthUser(null)
    return HttpResponse.json({ data: { message: "ログアウトしました" } })
  }),

  // スタブログイン（開発・テスト用）
  // session Cookie 方式でセッションを確立し、UserResponse を返す
  // MSW では HttpOnly Cookie のラウンドトリップを再現できないため setMockAuthUser で代用する
  http.post("*/api/auth/stub-login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; name?: string }
    const currentUser = {
      email: body.email ?? "test-user@example.com",
      name: body.name ?? "テストユーザー",
    }
    setMockAuthUser(currentUser)
    return HttpResponse.json({
      data: {
        id: "usr_01HXYZ1234567890ABCDEF",
        email: currentUser.email,
        name: currentUser.name,
        picture: null,
        timezone: "Asia/Tokyo",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    })
  }),
]

import { HttpResponse, http } from "msw"

export const usersHandlers = [
  http.get("*/api/users/me", ({ request }) => {
    const auth = request.headers.get("authorization")
    if (!auth?.startsWith("Bearer ")) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      data: {
        id: "usr_01HXYZ1234567890ABCDEF",
        email: "test-user@example.com",
        name: "テストユーザー",
        picture: "https://example.com/avatar.png",
        timezone: "Asia/Tokyo",
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      },
    })
  }),
]

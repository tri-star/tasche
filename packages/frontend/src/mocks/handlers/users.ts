import { HttpResponse, http } from "msw"
import { getMockAuthUser } from "./authSession"

export const usersHandlers = [
  // MSW では HttpOnly Cookie のラウンドトリップを再現できないため、
  // getMockAuthUser() の有無で認証状態を代用する（Cookie 認証の擬似）
  http.get("*/api/users/me", () => {
    const currentUser = getMockAuthUser()
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
        { status: 401 },
      )
    }

    return HttpResponse.json({
      data: {
        id: "usr_01HXYZ1234567890ABCDEF",
        email: currentUser.email,
        name: currentUser.name,
        picture: null,
        timezone: "Asia/Tokyo",
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      },
    })
  }),
]

import { HttpResponse, http } from "msw"
import { getMockAuthUser } from "./authSession"

// MSW プロセス内のセッション状態（テスト間で reset するには resetMockSettings を呼ぶ）
let mockSettings: { timezone: string; theme: "light" | "dark" } = {
  timezone: "Asia/Tokyo",
  theme: "light",
}

export function resetMockSettings(): void {
  mockSettings = { timezone: "Asia/Tokyo", theme: "light" }
}

function unauthorized(): Response {
  return HttpResponse.json(
    { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
    { status: 401 },
  )
}

// MSW では HttpOnly Cookie のラウンドトリップを再現できないため、
// getMockAuthUser() の有無で認証状態を代用する（Cookie 認証の擬似）
function ensureAuthenticated(): "ok" | Response {
  const currentUser = getMockAuthUser()
  if (!currentUser) return unauthorized()
  return "ok"
}

const KNOWN_TZ = new Set([
  "UTC",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
])

export const settingsHandlers = [
  http.get("*/api/settings", () => {
    const auth = ensureAuthenticated()
    if (auth !== "ok") return auth
    return HttpResponse.json({ data: mockSettings })
  }),

  http.patch("*/api/settings", async ({ request }) => {
    const auth = ensureAuthenticated()
    if (auth !== "ok") return auth
    const body = (await request.json()) as { timezone?: string; theme?: "light" | "dark" }

    // 不正な timezone は 400（backend と挙動を揃える）
    if (body.timezone !== undefined && !KNOWN_TZ.has(body.timezone)) {
      return HttpResponse.json({ detail: `Invalid timezone: ${body.timezone}` }, { status: 400 })
    }

    // 部分更新でマージ
    mockSettings = {
      timezone: body.timezone ?? mockSettings.timezone,
      theme: body.theme ?? mockSettings.theme,
    }
    return HttpResponse.json({ data: mockSettings })
  }),
]

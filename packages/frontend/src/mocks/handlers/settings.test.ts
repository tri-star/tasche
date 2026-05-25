import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { server } from "@/mocks/server"
import { authHandlers } from "./auth"
import { resetMockAuthUser } from "./authSession"
import { resetMockSettings, settingsHandlers } from "./settings"

describe("MSW settings handlers", () => {
  afterEach(() => {
    server.resetHandlers()
    resetMockAuthUser()
    resetMockSettings()
  })

  beforeEach(() => {
    server.use(...authHandlers, ...settingsHandlers)
  })

  it("GET /api/settings - 未認証は 401 を返すこと", async () => {
    const response = await fetch("http://localhost/api/settings")
    expect(response.status).toBe(401)
  })

  it("GET /api/settings - 認証ありは 200 と初期値を返すこと", async () => {
    // まずスタブログインして認証トークンを取得
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "テスト" }),
    })
    const loginJson = (await loginResponse.json()) as { data: { access_token: string } }
    const token = loginJson.data.access_token

    const response = await fetch("http://localhost/api/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(200)
    const json = (await response.json()) as { data: { timezone: string; theme: string } }
    expect(json.data.timezone).toBe("Asia/Tokyo")
    expect(json.data.theme).toBe("light")
  })

  it("PATCH /api/settings - theme: 'dark' で更新されること", async () => {
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "テスト" }),
    })
    const loginJson = (await loginResponse.json()) as { data: { access_token: string } }
    const token = loginJson.data.access_token

    const patchResponse = await fetch("http://localhost/api/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme: "dark" }),
    })

    expect(patchResponse.status).toBe(200)
    const json = (await patchResponse.json()) as { data: { timezone: string; theme: string } }
    expect(json.data.theme).toBe("dark")
  })

  it("PATCH /api/settings 後に GET /api/settings で更新値が反映されること", async () => {
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "テスト" }),
    })
    const loginJson = (await loginResponse.json()) as { data: { access_token: string } }
    const token = loginJson.data.access_token

    await fetch("http://localhost/api/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme: "dark" }),
    })

    const getResponse = await fetch("http://localhost/api/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await getResponse.json()) as { data: { timezone: string; theme: string } }
    expect(json.data.theme).toBe("dark")
  })

  it("PATCH /api/settings - 不正な timezone は 400 を返すこと", async () => {
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "テスト" }),
    })
    const loginJson = (await loginResponse.json()) as { data: { access_token: string } }
    const token = loginJson.data.access_token

    const response = await fetch("http://localhost/api/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timezone: "Invalid/Zone" }),
    })

    expect(response.status).toBe(400)
  })

  it("resetMockSettings 後は初期値に戻ること", async () => {
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "テスト" }),
    })
    const loginJson = (await loginResponse.json()) as { data: { access_token: string } }
    const token = loginJson.data.access_token

    // 変更
    await fetch("http://localhost/api/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme: "dark" }),
    })

    // リセット
    resetMockSettings()

    // GET で初期値確認
    const getResponse = await fetch("http://localhost/api/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await getResponse.json()) as { data: { timezone: string; theme: string } }
    expect(json.data.theme).toBe("light")
    expect(json.data.timezone).toBe("Asia/Tokyo")
  })
})

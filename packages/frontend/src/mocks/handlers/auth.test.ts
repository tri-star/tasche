import { afterEach, describe, expect, it } from "vitest"
import { resetMockAuthUser } from "./authSession"

describe("MSW auth handlers", () => {
  afterEach(() => {
    resetMockAuthUser()
  })

  it("スタブログイン前は users/me が 401 を返す", async () => {
    const response = await fetch("http://localhost/api/users/me", {
      headers: {
        Authorization: "Bearer stub.unauth.sig",
      },
    })

    expect(response.status).toBe(401)
  })

  it("スタブログイン後は users/me が同じユーザー情報を返す", async () => {
    const email = "custom@example.com"
    const name = "カスタムユーザー"

    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name }),
    })

    expect(loginResponse.ok).toBe(true)

    const loginJson = (await loginResponse.json()) as { data: { access_token: string } }

    const meResponse = await fetch("http://localhost/api/users/me", {
      headers: {
        Authorization: `Bearer ${loginJson.data.access_token}`,
      },
    })

    expect(meResponse.ok).toBe(true)

    const meJson = (await meResponse.json()) as { data: { email: string; name: string } }
    expect(meJson.data.email).toBe(email)
    expect(meJson.data.name).toBe(name)
  })

  it("スタブログイン後は refresh が access token を返す", async () => {
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "refresh@example.com", name: "リフレッシュユーザー" }),
    })
    expect(loginResponse.ok).toBe(true)

    const refreshResponse = await fetch("http://localhost/api/auth/refresh", {
      method: "POST",
    })

    expect(refreshResponse.ok).toBe(true)
    const refreshJson = (await refreshResponse.json()) as { data: { access_token: string } }
    expect(refreshJson.data.access_token).toMatch(/^stub\..+\.sig$/)
  })

  it("スタブログイン後の refresh と users/me は同じユーザーを参照する", async () => {
    const email = "custom@example.com"
    const name = "カスタムユーザー"

    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name }),
    })
    expect(loginResponse.ok).toBe(true)

    const refreshResponse = await fetch("http://localhost/api/auth/refresh", {
      method: "POST",
    })
    expect(refreshResponse.ok).toBe(true)

    const refreshJson = (await refreshResponse.json()) as { data: { access_token: string } }
    const meResponse = await fetch("http://localhost/api/users/me", {
      headers: {
        Authorization: `Bearer ${refreshJson.data.access_token}`,
      },
    })

    expect(meResponse.ok).toBe(true)
    const meJson = (await meResponse.json()) as { data: { email: string; name: string } }
    expect(meJson.data.email).toBe(email)
    expect(meJson.data.name).toBe(name)
  })

  it("logout 後は refresh と users/me が 401 を返す", async () => {
    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "logout@example.com", name: "ログアウトユーザー" }),
    })
    expect(loginResponse.ok).toBe(true)

    const logoutResponse = await fetch("http://localhost/api/auth/logout", {
      method: "POST",
    })
    expect(logoutResponse.ok).toBe(true)

    const refreshResponse = await fetch("http://localhost/api/auth/refresh", {
      method: "POST",
    })
    expect(refreshResponse.status).toBe(401)

    const meResponse = await fetch("http://localhost/api/users/me", {
      headers: {
        Authorization: "Bearer stub.logout.sig",
      },
    })
    expect(meResponse.status).toBe(401)
  })
})

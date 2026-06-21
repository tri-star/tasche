import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { server } from "@/mocks/server"
import { authHandlers } from "./auth"
import { resetMockAuthUser } from "./authSession"
import { usersHandlers } from "./users"

describe("MSW auth handlers", () => {
  afterEach(() => {
    server.resetHandlers()
    resetMockAuthUser()
  })

  beforeEach(() => {
    server.use(...authHandlers, ...usersHandlers)
  })

  it("スタブログイン前は users/me が 401 を返す", async () => {
    // 認証なし（Cookie なし）で叩く → getMockAuthUser が null → 401
    const response = await fetch("http://localhost/api/users/me")

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

    // stub-login が setMockAuthUser した後は Cookie 不要で users/me が成功する
    const meResponse = await fetch("http://localhost/api/users/me")

    expect(meResponse.ok).toBe(true)

    const meJson = (await meResponse.json()) as { data: { email: string; name: string } }
    expect(meJson.data.email).toBe(email)
    expect(meJson.data.name).toBe(name)
  })

  it("stub-login のレスポンスにユーザー情報が含まれること", async () => {
    const email = "info@example.com"
    const name = "インフォユーザー"

    const loginResponse = await fetch("http://localhost/api/auth/stub-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    })

    expect(loginResponse.ok).toBe(true)

    const loginJson = (await loginResponse.json()) as {
      data: { email: string; name: string; id: string }
    }
    expect(loginJson.data.email).toBe(email)
    expect(loginJson.data.name).toBe(name)
    expect(loginJson.data.id).toBeTruthy()
  })

  it("logout 後は users/me が 401 を返す", async () => {
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

    const meResponse = await fetch("http://localhost/api/users/me")
    expect(meResponse.status).toBe(401)
  })
})

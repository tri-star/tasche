import { beforeEach, describe, expect, it, vi } from "vitest"

const storageKey = "tasche.msw.auth.user"

async function loadAuthSession() {
  return await import("./authSession")
}

describe("authSession", () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetModules()
  })

  it("mock user をメモリと sessionStorage に保存する", async () => {
    const { getMockAuthUser, setMockAuthUser } = await loadAuthSession()
    const user = { email: "custom@example.com", name: "カスタムユーザー" }

    setMockAuthUser(user)

    expect(getMockAuthUser()).toEqual(user)
    expect(JSON.parse(sessionStorage.getItem(storageKey) ?? "null")).toEqual(user)
  })

  it("module reload 後も sessionStorage から mock user を復元する", async () => {
    const { setMockAuthUser } = await loadAuthSession()
    const user = { email: "reload@example.com", name: "リロードユーザー" }
    setMockAuthUser(user)

    vi.resetModules()
    const { getMockAuthUser } = await loadAuthSession()

    expect(getMockAuthUser()).toEqual(user)
  })

  it("reset でメモリと sessionStorage の mock user を削除する", async () => {
    const { getMockAuthUser, resetMockAuthUser, setMockAuthUser } = await loadAuthSession()
    setMockAuthUser({ email: "logout@example.com", name: "ログアウトユーザー" })

    resetMockAuthUser()

    expect(getMockAuthUser()).toBeNull()
    expect(sessionStorage.getItem(storageKey)).toBeNull()
  })

  it("壊れた JSON は破棄して未認証として扱う", async () => {
    sessionStorage.setItem(storageKey, "{")
    const { getMockAuthUser } = await loadAuthSession()

    expect(getMockAuthUser()).toBeNull()
    expect(sessionStorage.getItem(storageKey)).toBeNull()
  })

  it("不正な shape は破棄して未認証として扱う", async () => {
    sessionStorage.setItem(storageKey, JSON.stringify({ email: 123 }))
    const { getMockAuthUser } = await loadAuthSession()

    expect(getMockAuthUser()).toBeNull()
    expect(sessionStorage.getItem(storageKey)).toBeNull()
  })
})

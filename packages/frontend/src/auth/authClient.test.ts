import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createAuthClient } from "./authClient"

describe("createAuthClient", () => {
  let getAccessToken: ReturnType<typeof vi.fn>
  let setAccessToken: ReturnType<typeof vi.fn>
  let onUnauthorized: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getAccessToken = vi.fn().mockReturnValue("initial-token")
    setAccessToken = vi.fn()
    onUnauthorized = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createClient() {
    return createAuthClient({
      baseUrl: "",
      getAccessToken,
      setAccessToken,
      onUnauthorized,
    })
  }

  it("Authorization ヘッダに access token が付与されること", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal("fetch", mockFetch)

    const client = createClient()
    await client.fetch("/api/test")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get("Authorization")).toBe("Bearer initial-token")
  })

  it("access token がない場合は Authorization ヘッダが付かないこと", async () => {
    getAccessToken.mockReturnValue(null)
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal("fetch", mockFetch)

    const client = createClient()
    await client.fetch("/api/test")

    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get("Authorization")).toBeNull()
  })

  it("401 → refresh 成功 → 再試行 200 のフロー", async () => {
    let callCount = 0
    const newToken = "new-token"

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/refresh")) {
        setAccessToken(newToken)
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: { access_token: newToken, token_type: "Bearer", expires_in: 900 },
            }),
            { status: 200 },
          ),
        )
      }

      callCount++
      if (callCount === 1) {
        return Promise.resolve(new Response("", { status: 401 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ data: "ok" }), { status: 200 }))
    })

    vi.stubGlobal("fetch", mockFetch)
    getAccessToken.mockImplementation(() => (callCount >= 1 ? newToken : "initial-token"))

    const client = createClient()
    const res = await client.fetch("/api/test")

    expect(res.status).toBe(200)
    // 1回目の呼び出し（401）+ refresh + 再試行
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it("refresh が 401 を返した場合に onUnauthorized が呼ばれること", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/refresh")) {
        return Promise.resolve(new Response("", { status: 401 }))
      }
      return Promise.resolve(new Response("", { status: 401 }))
    })

    vi.stubGlobal("fetch", mockFetch)

    const client = createClient()

    await expect(client.fetch("/api/test")).rejects.toThrow("Unauthorized")
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("並行して複数の 401 が発生しても /api/auth/refresh が1回しか呼ばれないこと", async () => {
    let refreshCallCount = 0
    const newToken = "new-token"

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/refresh")) {
        refreshCallCount++
        setAccessToken(newToken)
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: { access_token: newToken, token_type: "Bearer", expires_in: 900 },
            }),
            { status: 200 },
          ),
        )
      }
      // 最初の10回は 401 を返す、その後は 200 を返す
      if (getAccessToken() === "initial-token") {
        return Promise.resolve(new Response("", { status: 401 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ data: "ok" }), { status: 200 }))
    })

    vi.stubGlobal("fetch", mockFetch)
    getAccessToken.mockImplementation(() => (refreshCallCount > 0 ? newToken : "initial-token"))

    const client = createClient()

    // 10件並行
    await Promise.all(Array.from({ length: 10 }, () => client.fetch("/api/test")))

    expect(refreshCallCount).toBe(1)
  })
})

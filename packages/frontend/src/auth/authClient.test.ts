import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createAuthClient } from "./authClient"

describe("createAuthClient", () => {
  let onUnauthorized: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onUnauthorized = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createClient() {
    return createAuthClient({
      baseUrl: "",
      onUnauthorized,
    })
  }

  it("fetch は credentials: 'include' で呼ばれ、Authorization ヘッダを付けないこと", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal("fetch", mockFetch)

    const client = createClient()
    await client.fetch("/api/test")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    expect(init.credentials).toBe("include")
    const headers = new Headers(init?.headers)
    expect(headers.get("Authorization")).toBeNull()
  })

  it("200 のときレスポンスをそのまま返すこと", async () => {
    const mockResponse = new Response(JSON.stringify({ data: "ok" }), { status: 200 })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse))

    const client = createClient()
    const res = await client.fetch("/api/test")

    expect(res.status).toBe(200)
  })

  it("401 のとき onUnauthorized が1回呼ばれ、Unauthorized を throw すること（再 fetch しない）", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("", { status: 401 }))
    vi.stubGlobal("fetch", mockFetch)

    const client = createClient()

    await expect(client.fetch("/api/test")).rejects.toThrow("Unauthorized")
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    // リトライが発生していないこと（fetch は1回のみ）
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("logout で /api/auth/logout が { method: POST, credentials: include } で呼ばれ、onUnauthorized が呼ばれること", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", mockFetch)

    const client = createClient()
    await client.logout()

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

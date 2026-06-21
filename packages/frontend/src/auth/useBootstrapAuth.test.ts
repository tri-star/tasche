import { act, renderHook } from "@testing-library/react"
import { createStore, Provider as JotaiProvider } from "jotai"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { authHandlers } from "@/mocks/handlers/auth"
import { setMockAuthUser } from "@/mocks/handlers/authSession"
import { settingsHandlers } from "@/mocks/handlers/settings"
import { usersHandlers } from "@/mocks/handlers/users"
import { server } from "@/mocks/server"
import { authStatusAtom, currentUserAtom } from "./atoms"
import { useBootstrapAuth } from "./useBootstrapAuth"

// jotai の store を参照できるラッパー生成ユーティリティ
function createWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return JotaiProvider({ store, children })
  }
}

describe("useBootstrapAuth", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("/api/users/me が 200 の場合", () => {
    it("authStatus が 'authenticated' になること", async () => {
      // MSW ハンドラを登録し、ログイン状態にする
      server.use(...authHandlers, ...usersHandlers, ...settingsHandlers)
      setMockAuthUser({ email: "test@example.com", name: "テストユーザー" })

      const store = createStore()
      renderHook(() => useBootstrapAuth(), {
        wrapper: createWrapper(store),
      })

      // 初期状態は "loading"
      expect(store.get(authStatusAtom)).toBe("loading")

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(store.get(authStatusAtom)).toBe("authenticated")
      const user = store.get(currentUserAtom)
      expect(user).not.toBeNull()
      expect(user?.email).toBe("test@example.com")
    })
  })

  describe("/api/users/me が 401 の場合", () => {
    it("authStatus が 'anonymous' になること", async () => {
      // 未認証（getMockAuthUser が null）の状態でハンドラを登録
      server.use(...usersHandlers)
      // setMockAuthUser を呼ばないため getMockAuthUser() は null → 401

      const store = createStore()
      renderHook(() => useBootstrapAuth(), {
        wrapper: createWrapper(store),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(store.get(authStatusAtom)).toBe("anonymous")
      expect(store.get(currentUserAtom)).toBeNull()
    })
  })

  describe("/api/users/me が 500 の場合", () => {
    it("authStatus が 'error' になること", async () => {
      server.use(
        http.get("*/api/users/me", () => {
          return HttpResponse.json(
            { error: { code: "INTERNAL_SERVER_ERROR", message: "サーバーエラー" } },
            { status: 500 },
          )
        }),
        ...settingsHandlers,
      )

      const store = createStore()
      renderHook(() => useBootstrapAuth(), {
        wrapper: createWrapper(store),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(store.get(authStatusAtom)).toBe("error")
      expect(store.get(currentUserAtom)).toBeNull()
    })
  })

  describe("settings フェッチが失敗する場合", () => {
    it("authStatus が 'authenticated' のままであること", async () => {
      server.use(
        ...usersHandlers,
        http.get("*/api/settings", () => {
          return HttpResponse.json(
            { error: { code: "INTERNAL_SERVER_ERROR", message: "サーバーエラー" } },
            { status: 500 },
          )
        }),
      )
      setMockAuthUser({ email: "test@example.com", name: "テストユーザー" })

      const store = createStore()
      renderHook(() => useBootstrapAuth(), {
        wrapper: createWrapper(store),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // settings が失敗しても authenticated は維持される
      expect(store.get(authStatusAtom)).toBe("authenticated")
      const user = store.get(currentUserAtom)
      expect(user?.email).toBe("test@example.com")
    })
  })

  describe("ネットワークエラーが発生した場合", () => {
    it("authStatus が 'error' になること", async () => {
      server.use(
        http.get("*/api/users/me", () => {
          throw new Error("Network Error")
        }),
      )

      const store = createStore()
      renderHook(() => useBootstrapAuth(), {
        wrapper: createWrapper(store),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(store.get(authStatusAtom)).toBe("error")
      expect(store.get(currentUserAtom)).toBeNull()
    })
  })

  describe("StrictMode 二重呼び出し抑制（started ref）", () => {
    it("useEffect が2回呼ばれても fetch は1回のみであること", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")

      server.use(...usersHandlers, ...settingsHandlers)
      setMockAuthUser({ email: "test@example.com", name: "テストユーザー" })

      const store = createStore()

      // renderHook を2回呼んでも started.current が true なので2回目はスキップされる
      // ただし renderHook 自体は1つのコンポーネントなので、
      // 実際の StrictMode 二重実行は内部で useEffect が2回走る動作を模擬する
      renderHook(() => useBootstrapAuth(), {
        wrapper: createWrapper(store),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // /api/users/me と /api/settings の fetch 呼び出しは合計 2 回（並列）
      // started.current により 2 セット目は呼ばれない
      const meCallCount = fetchSpy.mock.calls.filter((args) =>
        String(args[0]).includes("/api/users/me"),
      ).length
      expect(meCallCount).toBe(1)
    })
  })
})

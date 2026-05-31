import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { Provider as JotaiProvider } from "jotai"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useAuth } from "./useAuth"

describe("useAuth", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("logout 時に TanStack Query cache を clear する", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(["tasks"], [{ id: "task-1", name: "前ユーザーのタスク" }])
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", mockFetch)

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <JotaiProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </JotaiProvider>
      )
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.logout()
    })

    expect(queryClient.getQueryCache().findAll()).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: "Bearer ",
      },
    })
  })
})

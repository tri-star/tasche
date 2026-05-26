import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SettingsResponse } from "@/api/generated/model"
import { useUpdateSettings } from "./useUpdateSettings"

const mockUpdateCurrentSettings = vi.fn()

vi.mock("@/api/generated/client", () => ({
  updateCurrentSettings: (...args: unknown[]) => mockUpdateCurrentSettings(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe("useUpdateSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("mutateAsync({ theme: 'dark' }) で updateCurrentSettings が正しい引数で呼ばれること", async () => {
    const mockResponse: SettingsResponse = { timezone: "Asia/Tokyo", theme: "dark" }
    mockUpdateCurrentSettings.mockResolvedValue({
      status: 200,
      data: { data: mockResponse },
    })

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({ theme: "dark" })
    })

    expect(mockUpdateCurrentSettings).toHaveBeenCalledWith({ theme: "dark" })
  })

  it("成功時に SettingsResponse を返すこと", async () => {
    const mockResponse: SettingsResponse = { timezone: "Asia/Tokyo", theme: "dark" }
    mockUpdateCurrentSettings.mockResolvedValue({
      status: 200,
      data: { data: mockResponse },
    })

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    })

    let returnValue: SettingsResponse | undefined
    await act(async () => {
      returnValue = await result.current.mutateAsync({ theme: "dark" })
    })

    expect(returnValue).toEqual(mockResponse)
  })

  it("status !== 200 の場合は reject されること", async () => {
    mockUpdateCurrentSettings.mockResolvedValue({
      status: 400,
      data: { detail: "Invalid timezone" },
    })

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await expect(result.current.mutateAsync({ timezone: "Invalid/Zone" })).rejects.toThrow()
    })
  })

  it("mutateAsync({ timezone: 'UTC' }) で timezone のみ送られること", async () => {
    const mockResponse: SettingsResponse = { timezone: "UTC", theme: "light" }
    mockUpdateCurrentSettings.mockResolvedValue({
      status: 200,
      data: { data: mockResponse },
    })

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({ timezone: "UTC" })
    })

    expect(mockUpdateCurrentSettings).toHaveBeenCalledWith({ timezone: "UTC" })
  })

  it("timezone と theme を同時に送ることができること", async () => {
    const mockResponse: SettingsResponse = { timezone: "UTC", theme: "dark" }
    mockUpdateCurrentSettings.mockResolvedValue({
      status: 200,
      data: { data: mockResponse },
    })

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({ timezone: "UTC", theme: "dark" })
    })

    expect(mockUpdateCurrentSettings).toHaveBeenCalledWith({ timezone: "UTC", theme: "dark" })
  })

  it("ネットワークエラー時に reject されること", async () => {
    mockUpdateCurrentSettings.mockRejectedValue(new Error("Network Error"))

    const { result } = renderHook(() => useUpdateSettings(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await expect(result.current.mutateAsync({ theme: "light" })).rejects.toThrow()
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

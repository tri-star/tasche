import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createStore, Provider } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { currentSettingsAtom } from "@/settings/atoms"
import type { Theme } from "@/settings/types"
import { ThemeProvider } from "@/theme/ThemeProvider"
import { ThemeSection } from "./ThemeSection"

const mockMutateAsync = vi.fn()
let mockIsPending = false

vi.mock("@/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}))

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
  }
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql))
  return mql
}

function renderThemeSection(initialTheme: Theme = "light") {
  const store = createStore()
  store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: initialTheme })

  const queryClient = new QueryClient()

  render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemeSection />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  )

  return { store }
}

describe("ThemeSection", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark")
    vi.clearAllMocks()
    mockIsPending = false
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("初期レンダリング", () => {
    it("Light / ダーク / システム のボタンが存在すること", () => {
      renderThemeSection("light")
      expect(screen.getByRole("radio", { name: "ライト" })).toBeInTheDocument()
      expect(screen.getByRole("radio", { name: "ダーク" })).toBeInTheDocument()
      expect(screen.getByRole("radio", { name: "システム" })).toBeInTheDocument()
    })

    it("theme が light の場合、ライトボタンが選択状態であること", () => {
      renderThemeSection("light")
      expect(screen.getByRole("radio", { name: "ライト" })).toHaveAttribute("data-state", "on")
      expect(screen.getByRole("radio", { name: "ダーク" })).toHaveAttribute("data-state", "off")
      expect(screen.getByRole("radio", { name: "システム" })).toHaveAttribute("data-state", "off")
    })

    it("theme が dark の場合、ダークボタンが選択状態であること", () => {
      renderThemeSection("dark")
      expect(screen.getByRole("radio", { name: "ライト" })).toHaveAttribute("data-state", "off")
      expect(screen.getByRole("radio", { name: "ダーク" })).toHaveAttribute("data-state", "on")
      expect(screen.getByRole("radio", { name: "システム" })).toHaveAttribute("data-state", "off")
    })

    it("theme が system の場合、システムボタンが選択状態であること", () => {
      renderThemeSection("system")
      expect(screen.getByRole("radio", { name: "ライト" })).toHaveAttribute("data-state", "off")
      expect(screen.getByRole("radio", { name: "ダーク" })).toHaveAttribute("data-state", "off")
      expect(screen.getByRole("radio", { name: "システム" })).toHaveAttribute("data-state", "on")
    })
  })

  describe("ボタンクリック時のAPI呼び出し", () => {
    it("ライトボタンクリックで mutateAsync が { theme: 'light' } で呼ばれること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "light" })

      renderThemeSection("dark")

      await user.click(screen.getByRole("radio", { name: "ライト" }))

      expect(mockMutateAsync).toHaveBeenCalledWith({ theme: "light" })
    })

    it("ダークボタンクリックで mutateAsync が { theme: 'dark' } で呼ばれること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "dark" })

      renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "ダーク" }))

      expect(mockMutateAsync).toHaveBeenCalledWith({ theme: "dark" })
    })

    it("システムボタンクリックで mutateAsync が { theme: 'system' } で呼ばれること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "system" })

      renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "システム" }))

      expect(mockMutateAsync).toHaveBeenCalledWith({ theme: "system" })
    })

    it("選択中のボタンを再クリックしても mutateAsync が呼ばれないこと（空値ガード）", async () => {
      const user = userEvent.setup()

      renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "ライト" }))

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  describe("API成功後の状態更新", () => {
    it("API 成功後に currentSettingsAtom.theme が dark に更新されること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "dark" })

      const { store } = renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "ダーク" }))

      await waitFor(() => {
        expect(store.get(currentSettingsAtom)?.theme).toBe("dark")
      })
    })

    it("API 成功後に currentSettingsAtom.theme が system に更新されること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "system" })

      const { store } = renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "システム" }))

      await waitFor(() => {
        expect(store.get(currentSettingsAtom)?.theme).toBe("system")
      })
    })

    it("API 成功後に <html> に dark クラスが付与されること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "dark" })

      renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "ダーク" }))

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true)
      })
    })
  })

  describe("API失敗時のロールバック", () => {
    it("API 失敗時に currentSettingsAtom.theme が元の値にロールバックされること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockRejectedValue(new Error("API Error"))

      const { store } = renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "ダーク" }))

      await waitFor(() => {
        expect(store.get(currentSettingsAtom)?.theme).toBe("light")
      })
    })

    it("API 失敗時にエラー文言が表示されること", async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockRejectedValue(new Error("API Error"))

      renderThemeSection("light")

      await user.click(screen.getByRole("radio", { name: "ダーク" }))

      await waitFor(() => {
        expect(screen.getByText("テーマの保存に失敗しました")).toBeInTheDocument()
      })
    })
  })

  describe("更新中の disabled 状態", () => {
    it("isUpdating が true のとき ToggleGroup が disabled になること", () => {
      mockIsPending = true

      renderThemeSection("light")

      const lightButton = screen.getByRole("radio", { name: "ライト" })
      const darkButton = screen.getByRole("radio", { name: "ダーク" })
      const systemButton = screen.getByRole("radio", { name: "システム" })

      expect(lightButton).toBeDisabled()
      expect(darkButton).toBeDisabled()
      expect(systemButton).toBeDisabled()
    })
  })
})

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createStore, Provider } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { currentSettingsAtom } from "@/settings/atoms"
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

function renderThemeSection(initialTheme: "light" | "dark" = "light") {
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
  })

  it("theme が light の場合、Switch が off であること", () => {
    renderThemeSection("light")
    const switchEl = screen.getByRole("switch", { name: "ダークモード切替" })
    expect(switchEl).not.toBeChecked()
  })

  it("theme が dark の場合、Switch が on であること", () => {
    renderThemeSection("dark")
    const switchEl = screen.getByRole("switch", { name: "ダークモード切替" })
    expect(switchEl).toBeChecked()
  })

  it("Switch クリックで useUpdateSettings.mutateAsync が { theme: 'dark' } で呼ばれること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "dark" })

    renderThemeSection("light")

    await user.click(screen.getByRole("switch", { name: "ダークモード切替" }))

    expect(mockMutateAsync).toHaveBeenCalledWith({ theme: "dark" })
  })

  it("API 成功後に currentSettingsAtom.theme が dark に更新されること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "dark" })

    const { store } = renderThemeSection("light")

    await user.click(screen.getByRole("switch", { name: "ダークモード切替" }))

    await waitFor(() => {
      expect(store.get(currentSettingsAtom)?.theme).toBe("dark")
    })
  })

  it("API 成功後に <html> に dark クラスが付与されること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ timezone: "Asia/Tokyo", theme: "dark" })

    renderThemeSection("light")

    await user.click(screen.getByRole("switch", { name: "ダークモード切替" }))

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })
  })

  it("API 失敗時に currentSettingsAtom.theme が元の値にロールバックされること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(new Error("API Error"))

    const { store } = renderThemeSection("light")

    await user.click(screen.getByRole("switch", { name: "ダークモード切替" }))

    await waitFor(() => {
      expect(store.get(currentSettingsAtom)?.theme).toBe("light")
    })
  })

  it("API 失敗時にエラー文言が表示されること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(new Error("API Error"))

    renderThemeSection("light")

    await user.click(screen.getByRole("switch", { name: "ダークモード切替" }))

    await waitFor(() => {
      expect(screen.getByText("テーマの保存に失敗しました")).toBeInTheDocument()
    })
  })
})

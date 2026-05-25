import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createStore, Provider } from "jotai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { currentSettingsAtom } from "@/settings/atoms"
import { TimezoneSection } from "./TimezoneSection"

// TimezoneCombobox をシンプルな select に置き換えてテストを安定化
vi.mock("./TimezoneCombobox", () => ({
  TimezoneCombobox: ({
    value,
    onChange,
    id,
  }: {
    value: string
    onChange: (v: string) => void
    id?: string
  }) => (
    <select
      id={id}
      value={value}
      aria-label="タイムゾーン"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="Asia/Tokyo">Asia/Tokyo</option>
      <option value="UTC">UTC</option>
      <option value="Europe/London">Europe/London</option>
    </select>
  ),
}))

const mockMutateAsync = vi.fn()

vi.mock("@/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

function renderTimezoneSection(initialTimezone = "Asia/Tokyo") {
  const store = createStore()
  store.set(currentSettingsAtom, { timezone: initialTimezone, theme: "light" })

  const queryClient = new QueryClient()

  render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TimezoneSection />
      </QueryClientProvider>
    </Provider>,
  )

  return { store }
}

describe("TimezoneSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("初期 timezone が表示されること（Asia/Tokyo）", () => {
    renderTimezoneSection("Asia/Tokyo")
    const select = screen.getByRole("combobox", { name: "タイムゾーン" })
    expect(select).toHaveValue("Asia/Tokyo")
  })

  it("初期状態では「保存」ボタンが disabled であること（値が変わっていない）", () => {
    renderTimezoneSection("Asia/Tokyo")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
  })

  it("Combobox で UTC に変更すると「保存」ボタンが有効になること", async () => {
    const user = userEvent.setup()
    renderTimezoneSection("Asia/Tokyo")

    await user.selectOptions(screen.getByRole("combobox", { name: "タイムゾーン" }), "UTC")
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled()
  })

  it("「保存」ボタンを押すと useUpdateSettings.mutateAsync が正しい引数で呼ばれること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ timezone: "UTC", theme: "light" })

    renderTimezoneSection("Asia/Tokyo")

    await user.selectOptions(screen.getByRole("combobox", { name: "タイムゾーン" }), "UTC")
    await user.click(screen.getByRole("button", { name: "保存" }))

    expect(mockMutateAsync).toHaveBeenCalledWith({ timezone: "UTC" })
  })

  it("保存成功で currentSettingsAtom.timezone が更新されること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ timezone: "UTC", theme: "light" })

    const { store } = renderTimezoneSection("Asia/Tokyo")

    await user.selectOptions(screen.getByRole("combobox", { name: "タイムゾーン" }), "UTC")
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => {
      expect(store.get(currentSettingsAtom)?.timezone).toBe("UTC")
    })
  })

  it("保存失敗時にエラーメッセージが表示されること", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(new Error("API Error"))

    renderTimezoneSection("Asia/Tokyo")

    await user.selectOptions(screen.getByRole("combobox", { name: "タイムゾーン" }), "UTC")
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => {
      expect(screen.getByText("タイムゾーンの保存に失敗しました")).toBeInTheDocument()
    })
  })
})

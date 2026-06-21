import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { currentUserAtom } from "@/auth/atoms"
import { currentSettingsAtom } from "@/settings/atoms"
import { SettingsPage } from "./SettingsPage"

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: null,
    startGoogleLogin: vi.fn(),
    handleCallback: vi.fn(),
    stubLogin: vi.fn(),
    logout: vi.fn(),
  }),
}))

// TimezoneCombobox をシンプルな select に置き換えてテストを安定化
vi.mock("@/components/settings/TimezoneCombobox", () => ({
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
    </select>
  ),
}))

vi.mock("@/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

function renderSettingsPage() {
  const store = createStore()
  store.set(currentUserAtom, {
    id: "user-1",
    email: "test@example.com",
    name: "テストユーザー",
    picture: null,
    timezone: "Asia/Tokyo",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  })
  store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "light" })

  const queryClient = new QueryClient()

  const router = createMemoryRouter([{ path: "/settings", element: <SettingsPage /> }], {
    initialEntries: ["/settings"],
  })

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>,
  )
}

describe("SettingsPage", () => {
  it("「設定」の見出しが表示されること", () => {
    renderSettingsPage()
    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument()
  })

  it("「タイムゾーン」セクションが表示されること", () => {
    renderSettingsPage()
    // CardTitle と label の両方に「タイムゾーン」が表示されるため getAllByText を使用
    const elements = screen.getAllByText("タイムゾーン")
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it("「テーマ」セクションが表示されること", () => {
    renderSettingsPage()
    expect(screen.getByText("テーマ")).toBeInTheDocument()
  })

  it("ログアウトボタンが存在しないこと", () => {
    renderSettingsPage()
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument()
  })
})

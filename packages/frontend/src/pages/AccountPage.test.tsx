import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createStore, Provider } from "jotai"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { currentUserAtom } from "@/auth/atoms"
import { AccountPage } from "./AccountPage"

const mockLogout = vi.fn()

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: null,
    startGoogleLogin: vi.fn(),
    handleCallback: vi.fn(),
    stubLogin: vi.fn(),
    logout: mockLogout,
  }),
}))

function renderAccountPage(options?: { picture?: string }) {
  const store = createStore()
  store.set(currentUserAtom, {
    id: "user-1",
    email: "test@example.com",
    name: "テストユーザー",
    picture: options?.picture ?? null,
    timezone: "Asia/Tokyo",
  })

  const router = createMemoryRouter([{ path: "/account", element: <AccountPage /> }], {
    initialEntries: ["/account"],
  })

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe("AccountPage", () => {
  beforeEach(() => {
    mockLogout.mockClear()
  })

  it("ユーザー名が表示されること", () => {
    renderAccountPage()
    expect(screen.getByText("テストユーザー")).toBeInTheDocument()
  })

  it("メールアドレスが表示されること", () => {
    renderAccountPage()
    expect(screen.getByText("test@example.com")).toBeInTheDocument()
  })

  it("picture がない場合に名前の頭文字アバターが表示されること", () => {
    renderAccountPage()
    // img要素はない
    expect(screen.queryByRole("img", { name: "テストユーザー" })).not.toBeInTheDocument()
    // 頭文字が表示されている
    expect(screen.getByText("テ")).toBeInTheDocument()
  })

  it("picture がある場合にアバター画像が表示されること", () => {
    renderAccountPage({ picture: "https://example.com/avatar.png" })
    const img = screen.getByRole("img", { name: "テストユーザー" })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png")
  })

  it("ログアウトボタンが表示されること", () => {
    renderAccountPage()
    expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument()
  })

  it("ログアウトボタンをクリックすると logout が呼ばれること", async () => {
    const user = userEvent.setup()
    mockLogout.mockResolvedValue(undefined)

    renderAccountPage()
    await user.click(screen.getByRole("button", { name: "ログアウト" }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})

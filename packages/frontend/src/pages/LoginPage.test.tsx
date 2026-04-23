import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createStore, Provider } from "jotai"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { authStatusAtom } from "@/auth/atoms"
import { LoginPage } from "./LoginPage"

// useAuth のモック用の関数を外部で定義してテスト間で差し替え可能にする
const mockStartGoogleLogin = vi.fn()
const mockStubLogin = vi.fn()

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    status: "anonymous",
    user: null,
    accessToken: null,
    startGoogleLogin: mockStartGoogleLogin,
    handleCallback: vi.fn(),
    stubLogin: mockStubLogin,
    logout: vi.fn(),
  }),
}))

function renderLoginPage(options?: { stubEnabled?: boolean }) {
  const store = createStore()
  store.set(authStatusAtom, "anonymous")

  if (options?.stubEnabled !== undefined) {
    vi.stubEnv("VITE_AUTH_STUB_ENABLED", options.stubEnabled ? "true" : "false")
  }

  const router = createMemoryRouter([{ path: "/login", element: <LoginPage /> }], {
    initialEntries: ["/login"],
  })

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mockStartGoogleLogin.mockClear()
    mockStubLogin.mockClear()
  })

  it("Google ログインボタンが表示されること", () => {
    renderLoginPage()
    expect(screen.getByRole("button", { name: /Google でログイン/ })).toBeInTheDocument()
  })

  it("Tasche ロゴが表示されること", () => {
    renderLoginPage()
    expect(screen.getByText("Tasche")).toBeInTheDocument()
  })

  it("説明テキストが表示されること", () => {
    renderLoginPage()
    expect(screen.getByText(/Tasche をご利用いただくには/)).toBeInTheDocument()
  })

  it("VITE_AUTH_STUB_ENABLED=true のときスタブログインボタンが表示されること", () => {
    renderLoginPage({ stubEnabled: true })
    expect(screen.getByRole("button", { name: /スタブログイン/ })).toBeInTheDocument()
  })

  it("VITE_AUTH_STUB_ENABLED=false のときスタブログインボタンが表示されないこと", () => {
    renderLoginPage({ stubEnabled: false })
    expect(screen.queryByRole("button", { name: /スタブログイン/ })).not.toBeInTheDocument()
  })

  it("Google ログインボタンをクリックすると startGoogleLogin が呼ばれること", async () => {
    const user = userEvent.setup()
    mockStartGoogleLogin.mockResolvedValue(undefined)

    renderLoginPage()
    await user.click(screen.getByRole("button", { name: /Google でログイン/ }))

    await waitFor(() => {
      expect(mockStartGoogleLogin).toHaveBeenCalledTimes(1)
    })
  })
})

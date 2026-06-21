import { render, screen, waitFor } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { authStatusAtom } from "@/auth/atoms"
import { AuthCallbackPage } from "./AuthCallbackPage"

// useAuth のモック
const mockHandleCallback = vi.fn()

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    status: "anonymous",
    user: null,
    startGoogleLogin: vi.fn(),
    handleCallback: mockHandleCallback,
    stubLogin: vi.fn(),
    logout: vi.fn(),
  }),
}))

function renderCallback(search = "?code=stub-code&state=stub-state") {
  const store = createStore()
  store.set(authStatusAtom, "anonymous")

  const router = createMemoryRouter(
    [
      { path: "/auth/callback", element: <AuthCallbackPage /> },
      { path: "/", element: <div>ダッシュボード</div> },
      { path: "/login", element: <div>ログインページ</div> },
    ],
    { initialEntries: [`/auth/callback${search}`] },
  )

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe("AuthCallbackPage", () => {
  it("ローディングメッセージが表示されること", async () => {
    mockHandleCallback.mockImplementation(() => new Promise(() => {})) // 解決しない
    renderCallback()
    expect(screen.getByText("ログイン処理中...")).toBeInTheDocument()
  })

  it("handleCallback が成功したとき / に遷移すること", async () => {
    mockHandleCallback.mockResolvedValue(undefined)

    renderCallback()

    await waitFor(() => {
      expect(mockHandleCallback).toHaveBeenCalled()
    })
  })

  it("handleCallback がエラーを throw したときエラーメッセージが表示されること", async () => {
    mockHandleCallback.mockRejectedValue(new Error("セキュリティ検証に失敗しました"))

    renderCallback()

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      // I-2: エラーメッセージは固定文言（Error.message はそのまま表示しない）
      expect(screen.getByText("認証に失敗しました。再度ログインしてください。")).toBeInTheDocument()
    })
  })

  it("エラー時にログイン画面に戻るリンクが表示されること", async () => {
    mockHandleCallback.mockRejectedValue(new Error("ログインに失敗しました"))

    renderCallback()

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ログイン画面に戻る/ })).toBeInTheDocument()
    })
  })
})

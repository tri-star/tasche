import { render, screen, waitFor } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { AuthStatus } from "@/auth/atoms"
import { authStatusAtom } from "@/auth/atoms"
import { ProtectedRoute } from "./ProtectedRoute"

function renderWithAuthStatus(status: AuthStatus) {
  const store = createStore()
  store.set(authStatusAtom, status)

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>保護されたコンテンツ</div>} />
          </Route>
          <Route path="/login" element={<div>ログインページ</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe("ProtectedRoute", () => {
  it("status が loading のときスピナーが表示されること", () => {
    renderWithAuthStatus("loading")
    expect(screen.getByText("読み込み中...")).toBeInTheDocument()
  })

  it("status が anonymous のとき /login にリダイレクトされること", async () => {
    renderWithAuthStatus("anonymous")
    await waitFor(() => {
      expect(screen.getByText("ログインページ")).toBeInTheDocument()
    })
    expect(screen.queryByText("保護されたコンテンツ")).not.toBeInTheDocument()
  })

  it("status が error のとき /login にリダイレクトされること", async () => {
    renderWithAuthStatus("error")
    await waitFor(() => {
      expect(screen.getByText("ログインページ")).toBeInTheDocument()
    })
    expect(screen.queryByText("保護されたコンテンツ")).not.toBeInTheDocument()
  })

  it("status が authenticated のとき children が描画されること", () => {
    renderWithAuthStatus("authenticated")
    expect(screen.getByText("保護されたコンテンツ")).toBeInTheDocument()
    expect(screen.queryByText("ログインページ")).not.toBeInTheDocument()
  })
})

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { StubLoginButton } from "./StubLoginButton"

describe("StubLoginButton", () => {
  it("ボタンが表示されること", () => {
    render(<StubLoginButton onLogin={vi.fn()} />)
    expect(screen.getByRole("button", { name: /スタブログイン/ })).toBeInTheDocument()
  })

  it("クリックで onLogin がデフォルトメールアドレスで呼ばれること", async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue(undefined)

    render(<StubLoginButton onLogin={onLogin} />)
    await user.click(screen.getByRole("button", { name: /スタブログイン/ }))

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith("test-user@example.com")
    })
  })

  it("defaultEmail を指定するとその値で onLogin が呼ばれること", async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue(undefined)

    render(<StubLoginButton onLogin={onLogin} defaultEmail="custom@example.com" />)
    await user.click(screen.getByRole("button", { name: /スタブログイン/ }))

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith("custom@example.com")
    })
  })
})

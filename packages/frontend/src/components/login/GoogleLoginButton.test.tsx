import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { GoogleLoginButton } from "./GoogleLoginButton"

describe("GoogleLoginButton", () => {
  it("ボタンが表示されること", () => {
    render(<GoogleLoginButton onClick={vi.fn()} />)
    expect(screen.getByRole("button", { name: /Google でログイン/ })).toBeInTheDocument()
  })

  it("クリックで onClick が発火すること", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<GoogleLoginButton onClick={onClick} />)
    await user.click(screen.getByRole("button", { name: /Google でログイン/ }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("disabled=true のときにクリックしても onClick が呼ばれないこと", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<GoogleLoginButton onClick={onClick} disabled />)
    const button = screen.getByRole("button", { name: /Google でログイン/ })

    expect(button).toBeDisabled()
    await user.click(button)

    expect(onClick).not.toHaveBeenCalled()
  })
})

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppErrorFallback } from "./AppErrorFallback"

describe("AppErrorFallback", () => {
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    reloadMock = vi.fn()
    vi.stubGlobal("location", { ...window.location, reload: reloadMock })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("エラーメッセージが表示されること", () => {
    render(<AppErrorFallback />)

    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument()
    expect(
      screen.getByText("お手数ですが、ページを再読み込みしてもう一度お試しください。"),
    ).toBeInTheDocument()
  })

  it("再読み込みボタンが表示されること", () => {
    render(<AppErrorFallback />)

    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument()
  })

  it("再読み込みボタンをクリックすると window.location.reload が呼ばれること", async () => {
    const user = userEvent.setup()
    render(<AppErrorFallback />)

    await user.click(screen.getByRole("button", { name: "再読み込み" }))

    expect(reloadMock).toHaveBeenCalledOnce()
  })
})

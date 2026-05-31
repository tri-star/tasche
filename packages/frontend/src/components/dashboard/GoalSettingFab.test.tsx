import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { GoalSettingFab } from "./GoalSettingFab"

describe("GoalSettingFab", () => {
  it("目標設定ボタンを表示する", () => {
    render(<GoalSettingFab />)

    expect(screen.getByRole("button", { name: "目標設定" })).toBeInTheDocument()
  })

  it("クリック時に onClick を呼ぶ", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<GoalSettingFab onClick={onClick} />)

    await user.click(screen.getByRole("button", { name: "目標設定" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("mobile 下部ナビを避ける responsive class を持つ", () => {
    render(<GoalSettingFab />)

    expect(screen.getByRole("button", { name: "目標設定" })).toHaveClass(
      "fixed",
      "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]",
      "md:bottom-6",
      "right-4",
      "md:right-6",
    )
  })
})

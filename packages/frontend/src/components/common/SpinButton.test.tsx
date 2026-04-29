import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SpinButton } from "./SpinButton"

describe("SpinButton", () => {
  it("初期値とaria属性を表示する", () => {
    render(<SpinButton value={1.5} onChange={vi.fn()} min={0} max={3} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    expect(spinButton).toHaveTextContent("1.5")
    expect(spinButton).toHaveAttribute("aria-valuenow", "1.5")
    expect(spinButton).toHaveAttribute("aria-valuemin", "0")
    expect(spinButton).toHaveAttribute("aria-valuemax", "3")
  })

  it("増加ボタンで0.1増える", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))

    expect(onChange).toHaveBeenCalledWith(1.6)
  })

  it("減少ボタンで0.1減る", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを減らす" }))

    expect(onChange).toHaveBeenCalledWith(1.4)
  })

  it("min未満には下がらない", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={0} onChange={onChange} min={0} ariaLabel="実績ユニット" />)

    const decrement = screen.getByRole("button", { name: "実績ユニットを減らす" })
    expect(decrement).toBeDisabled()

    await user.click(decrement)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("maxを超えて増えない", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={2} onChange={onChange} max={2} ariaLabel="実績ユニット" />)

    const increment = screen.getByRole("button", { name: "実績ユニットを増やす" })
    expect(increment).toBeDisabled()

    await user.click(increment)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("ArrowUpとArrowDownで増減する", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    spinButton.focus()
    await user.keyboard("{ArrowUp}{ArrowDown}")

    expect(onChange).toHaveBeenNthCalledWith(1, 1.6)
    expect(onChange).toHaveBeenNthCalledWith(2, 1.4)
  })

  it("HomeとEndで下限・上限へ移動する", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} min={0} max={3} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    spinButton.focus()
    await user.keyboard("{Home}{End}")

    expect(onChange).toHaveBeenNthCalledWith(1, 0)
    expect(onChange).toHaveBeenNthCalledWith(2, 3)
  })

  it("disabled時は操作できない", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} disabled ariaLabel="実績ユニット" />)

    expect(screen.getByRole("spinbutton", { name: "実績ユニット" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))

    expect(onChange).not.toHaveBeenCalled()
  })
})

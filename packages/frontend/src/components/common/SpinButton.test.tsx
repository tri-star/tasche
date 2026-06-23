import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SpinButton } from "./SpinButton"

describe("SpinButton", () => {
  it("初期値とaria属性を表示する", () => {
    render(<SpinButton value={1.5} onChange={vi.fn()} min={0} max={3} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    expect(spinButton).toHaveValue("1.5")
    expect(spinButton).toHaveAttribute("aria-valuenow", "1.5")
    expect(spinButton).toHaveAttribute("aria-valuetext", "1.5 units")
    expect(spinButton).toHaveAttribute("aria-valuemin", "0")
    expect(spinButton).toHaveAttribute("aria-valuemax", "3")
  })

  it("増加ボタンで0.5増える", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it("減少ボタンで0.5減る", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを減らす" }))

    expect(onChange).toHaveBeenCalledWith(1)
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

    expect(onChange).toHaveBeenNthCalledWith(1, 2)
    expect(onChange).toHaveBeenNthCalledWith(2, 1)
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

  it("stepが整数の場合は小数点を表示しない", () => {
    render(<SpinButton value={1} onChange={vi.fn()} step={1} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    expect(spinButton).toHaveValue("1")
    expect(spinButton).toHaveAttribute("aria-valuetext", "1 units")
  })

  it("clamp後の値が現在値と同じ場合はonChangeを呼ばない", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={0} onChange={onChange} min={0} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    spinButton.focus()
    await user.keyboard("{Home}")

    expect(onChange).not.toHaveBeenCalled()
  })

  it("指数表記のstepでも小数桁を保って増減する", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SpinButton value={0.0000001} onChange={onChange} step={1e-7} ariaLabel="実績ユニット" />,
    )

    expect(screen.getByRole("spinbutton", { name: "実績ユニット" })).toHaveValue("0.0000001")

    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))

    expect(onChange).toHaveBeenCalledWith(0.0000002)
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

  it("現在値が0.5刻みでない場合、増加ボタンで次の0.5倍数にスナップする", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={0.2} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))

    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it("現在値が0.5刻みでない場合、減少ボタンで下側の0.5倍数にスナップする", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={0.2} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを減らす" }))

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it("0.5刻みの値は増加で+0.5される", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={0.5} onChange={onChange} ariaLabel="実績ユニット" />)

    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))

    expect(onChange).toHaveBeenCalledWith(1)
  })

  it("手入力した値をonBlurで確定しonChangeを呼ぶ", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    await user.clear(spinButton)
    await user.type(spinButton, "3.5")
    await user.tab()

    expect(onChange).toHaveBeenCalledWith(3.5)
  })

  it("手入力で0.5刻みでない値も確定できる", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    await user.clear(spinButton)
    await user.type(spinButton, "0.3")
    await user.tab()

    expect(onChange).toHaveBeenCalledWith(0.3)
  })

  it("手入力が空の場合はonChangeを呼ばず現在値に戻す", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    await user.clear(spinButton)
    await user.tab()

    expect(onChange).not.toHaveBeenCalled()
    expect(spinButton).toHaveValue("1.5")
  })

  it("min/maxを超える手入力はクランプされる", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpinButton value={1.5} onChange={onChange} max={3} ariaLabel="実績ユニット" />)

    const spinButton = screen.getByRole("spinbutton", { name: "実績ユニット" })
    await user.clear(spinButton)
    await user.type(spinButton, "5")
    await user.tab()

    expect(onChange).toHaveBeenCalledWith(3)
  })
})

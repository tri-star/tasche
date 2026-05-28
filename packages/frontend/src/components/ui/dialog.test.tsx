import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"

function ControlledDialog({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        開く
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-labelledby="test-dialog-title"
          aria-describedby="test-dialog-description"
          disabled={disabled}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle id="test-dialog-title">確認ダイアログ</DialogTitle>
            <DialogDescription id="test-dialog-description">
              内容を確認してください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button">保存する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function setClosedBySupport(supported: boolean) {
  const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "closedBy")

  if (supported) {
    Object.defineProperty(HTMLDialogElement.prototype, "closedBy", {
      configurable: true,
      get() {
        return this.getAttribute("closedby") ?? "closerequest"
      },
    })
  } else if (original?.configurable !== false) {
    delete (HTMLDialogElement.prototype as { closedBy?: string }).closedBy
  }

  return () => {
    if (original) {
      Object.defineProperty(HTMLDialogElement.prototype, "closedBy", original)
    } else {
      delete (HTMLDialogElement.prototype as { closedBy?: string }).closedBy
    }
  }
}

describe("Dialog", () => {
  afterEach(() => {
    document.body.style.overflow = ""
  })

  it("open=true で native dialog を showModal し、closedby を設定する", async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal")
    const user = userEvent.setup()
    render(<ControlledDialog />)

    await user.click(screen.getByRole("button", { name: "開く" }))

    const dialog = screen.getByRole("dialog", { name: "確認ダイアログ" })
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(dialog).toHaveAttribute("closedby", "any")
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("disabled=true では native light dismiss を無効化する", async () => {
    const user = userEvent.setup()
    render(<ControlledDialog disabled />)

    await user.click(screen.getByRole("button", { name: "開く" }))

    expect(screen.getByRole("dialog", { name: "確認ダイアログ" })).toHaveAttribute(
      "closedby",
      "none",
    )
  })

  it("cancel event で閉じる", async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)

    await user.click(screen.getByRole("button", { name: "開く" }))
    const dialog = screen.getByRole("dialog", { name: "確認ダイアログ" })

    fireEvent(dialog, new Event("cancel", { cancelable: true }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "確認ダイアログ" })).not.toBeInTheDocument()
    })
  })

  it("disabled=true の cancel event は閉じない", async () => {
    const user = userEvent.setup()
    render(<ControlledDialog disabled />)

    await user.click(screen.getByRole("button", { name: "開く" }))
    const dialog = screen.getByRole("dialog", { name: "確認ダイアログ" })
    const event = new Event("cancel", { cancelable: true })

    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByRole("dialog", { name: "確認ダイアログ" })).toBeInTheDocument()
  })

  it("close event で React state も閉じる", async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)

    await user.click(screen.getByRole("button", { name: "開く" }))
    const dialog = screen.getByRole("dialog", { name: "確認ダイアログ" })

    fireEvent(dialog, new Event("close"))

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "確認ダイアログ" })).not.toBeInTheDocument()
    })
  })

  it("closedBy 未対応時は backdrop click fallback で閉じる", async () => {
    const restoreClosedBy = setClosedBySupport(false)
    const user = userEvent.setup()
    render(<ControlledDialog />)

    await user.click(screen.getByRole("button", { name: "開く" }))
    const dialog = screen.getByRole("dialog", { name: "確認ダイアログ" })
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      top: 100,
      right: 200,
      bottom: 200,
      left: 100,
      toJSON: () => {},
    })
    fireEvent.click(dialog, { clientX: 50, clientY: 50 })

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "確認ダイアログ" })).not.toBeInTheDocument()
    })
    restoreClosedBy()
  })

  it("closedBy 対応時は fallback では閉じず native light dismiss に委譲する", async () => {
    const restoreClosedBy = setClosedBySupport(true)
    const user = userEvent.setup()
    render(<ControlledDialog />)

    await user.click(screen.getByRole("button", { name: "開く" }))
    const dialog = screen.getByRole("dialog", { name: "確認ダイアログ" })
    await user.click(dialog)

    expect(screen.getByRole("dialog", { name: "確認ダイアログ" })).toBeInTheDocument()
    restoreClosedBy()
  })

  it("閉じた後に opener へ focus を戻す", async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)

    const opener = screen.getByRole("button", { name: "開く" })
    await user.click(opener)
    await user.click(screen.getByRole("button", { name: "閉じる" }))

    await waitFor(() => {
      expect(opener).toHaveFocus()
    })
  })
})

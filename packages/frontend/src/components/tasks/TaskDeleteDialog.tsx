import { useEffect, useId } from "react"
import type { TaskResponse } from "@/api/generated/model"
import { Button } from "@/components/ui/button"

type TaskDeleteDialogProps = {
  open: boolean
  task: TaskResponse | null
  isSubmitting?: boolean
  errorMessage?: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function TaskDeleteDialog({
  open,
  task,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onConfirm,
}: TaskDeleteDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isSubmitting, onClose, open])

  if (!open || !task) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-xl font-semibold text-foreground">
          タスクを削除しますか？
        </h2>
        <div id={descriptionId} className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">「{task.name}」</span>
            を削除すると、一覧から非表示になります。
          </p>
          <p>削除したタスクは一覧から非表示になります。過去の記録ではタスク名が保持されます。</p>
        </div>

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            削除する
          </Button>
        </div>
      </div>
    </div>
  )
}

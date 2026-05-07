import { type FormEvent, useEffect, useId, useState } from "react"
import type { TaskResponse } from "@/api/generated/model"
import { Button } from "@/components/ui/button"

type TaskFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  task: TaskResponse | null
  isSubmitting?: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}

export function TaskFormDialog({
  open,
  mode,
  task,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: TaskFormDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()
  const [name, setName] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }
    setName(task?.name ?? "")
  }, [open, task])

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

  if (!open) {
    return null
  }

  const heading = mode === "create" ? "タスクを追加" : "タスクを編集"
  const description =
    mode === "create"
      ? "習慣化したいタスク名を入力してください。"
      : "タスク名を更新すると、今後の一覧や目標設定に反映されます。"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 100) {
      return
    }
    await onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-emerald-950">
              {heading}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <span className="sr-only">閉じる</span>×
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="task-name" className="text-sm font-medium text-foreground">
              タスク名
            </label>
            <input
              id="task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例: 英語学習"
              maxLength={100}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">100文字以内で入力してください。</p>
          </div>

          {errorMessage ? (
            <p
              id={errorId}
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || name.trim().length > 100 || isSubmitting}
            >
              {mode === "create" ? "追加する" : "保存する"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

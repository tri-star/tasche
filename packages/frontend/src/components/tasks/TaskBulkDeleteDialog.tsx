import { useId } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type TaskBulkDeleteDialogProps = {
  open: boolean
  selectedCount: number
  isSubmitting?: boolean
  errorMessage?: string | null
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function TaskBulkDeleteDialog({
  open,
  selectedCount,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onConfirm,
}: TaskBulkDeleteDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  if (!open) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
      <AlertDialogContent
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="sm:max-w-lg"
        disabled={isSubmitting}
      >
        <AlertDialogHeader>
          <AlertDialogTitle id={titleId}>
            選択した{selectedCount}件のタスクを削除しますか？
          </AlertDialogTitle>
          <div id={descriptionId} className="space-y-2 text-sm text-muted-foreground">
            <AlertDialogDescription>
              削除したタスクは一覧から非表示になります。過去の記録ではタスク名が保持されます。
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground"
          >
            {errorMessage}
          </p>
        ) : null}

        <AlertDialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            削除する
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

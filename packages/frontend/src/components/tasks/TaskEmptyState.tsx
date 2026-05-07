import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"

type TaskEmptyStateProps = {
  onCreate: () => void
}

export function TaskEmptyState({ onCreate }: TaskEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
        <ClipboardList className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-lg font-semibold text-emerald-950">まだタスクが登録されていません</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        習慣化したいことを追加すると、この画面から一覧で確認して編集や削除ができます。
      </p>
      <Button className="mt-6" onClick={onCreate}>
        タスクを追加
      </Button>
    </div>
  )
}

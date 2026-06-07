import { Pencil, Trash2 } from "lucide-react"
import type { TaskResponse } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type TaskTableProps = {
  tasks: TaskResponse[]
  onEdit: (task: TaskResponse) => void
  onDelete: (task: TaskResponse) => void
  disabled?: boolean

  // 選択制御
  selectedIds: Set<string>
  onToggleOne: (taskId: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  allSelectedOnPage: boolean
  someSelectedOnPage: boolean
}

function formatUnits(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "")
}

export function TaskTable({
  tasks,
  onEdit,
  onDelete,
  disabled = false,
  selectedIds,
  onToggleOne,
  onToggleAll,
  allSelectedOnPage,
  someSelectedOnPage,
}: TaskTableProps) {
  const headerCheckboxState = allSelectedOnPage
    ? true
    : someSelectedOnPage
      ? "indeterminate"
      : false
  const mobileSelectAllId = "tasks-mobile-select-all"

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:hidden">
        <label htmlFor={mobileSelectAllId} className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id={mobileSelectAllId}
            checked={headerCheckboxState}
            onCheckedChange={(c) => onToggleAll(Boolean(c))}
            aria-label="表示中の全タスクを選択"
            disabled={disabled}
          />
          <div className="space-y-1 select-none">
            <p className="text-sm font-medium text-foreground">このページのタスクをまとめて選択</p>
            <p className="text-xs text-muted-foreground">選択後にバルク操作から削除できます。</p>
          </div>
        </label>
      </div>

      <div className="space-y-3 sm:hidden">
        {tasks.map((task) => {
          const mobileTaskCheckboxId = `task-mobile-select-${task.id}`

          return (
            <article
              key={task.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <label
                  htmlFor={mobileTaskCheckboxId}
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
                >
                  <Checkbox
                    id={mobileTaskCheckboxId}
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={(c) => onToggleOne(task.id, Boolean(c))}
                    aria-label={`${task.name}を選択`}
                    disabled={disabled}
                  />
                  <div className="min-w-0 space-y-2 select-none">
                    <p className="break-words text-base font-medium text-foreground">{task.name}</p>
                    {!task.is_archived ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        アクティブ
                      </span>
                    ) : null}
                  </div>
                </label>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${task.name}を編集`}
                    onClick={() => onEdit(task)}
                    disabled={disabled}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${task.name}を削除`}
                    onClick={() => onDelete(task)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3">
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">先週の消化ユニット数</dt>
                  <dd className="text-sm font-medium tabular-nums text-foreground">
                    {formatUnits(task.consumed_units_last_week)} Unit
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">累計の消化ユニット数</dt>
                  <dd className="text-sm font-medium tabular-nums text-foreground">
                    {formatUnits(task.consumed_units_total)} Unit
                  </dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={headerCheckboxState}
                  onCheckedChange={(c) => onToggleAll(Boolean(c))}
                  aria-label="表示中の全タスクを選択"
                  disabled={disabled}
                />
              </TableHead>
              <TableHead className="min-w-[240px]">タスク名</TableHead>
              <TableHead className="min-w-[120px] text-right">消化ユニット数(先週)</TableHead>
              <TableHead className="min-w-[120px] text-right">消化ユニット数(累計)</TableHead>
              <TableHead className="min-w-[100px]">状態</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={(c) => onToggleOne(task.id, Boolean(c))}
                    aria-label={`${task.name}を選択`}
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  <span className="block max-w-xl break-words">{task.name}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUnits(task.consumed_units_last_week)} Unit
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUnits(task.consumed_units_total)} Unit
                </TableCell>
                <TableCell>
                  {!task.is_archived ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      アクティブ
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${task.name}を編集`}
                      onClick={() => onEdit(task)}
                      disabled={disabled}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${task.name}を削除`}
                      onClick={() => onDelete(task)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

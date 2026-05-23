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

  return (
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
  )
}

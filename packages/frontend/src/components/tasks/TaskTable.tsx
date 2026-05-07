import { Pencil, Trash2 } from "lucide-react"
import type { TaskResponse } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
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
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function TaskTable({ tasks, onEdit, onDelete, disabled = false }: TaskTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[240px]">タスク名</TableHead>
          <TableHead className="min-w-[140px]">作成日時</TableHead>
          <TableHead className="min-w-[140px]">更新日時</TableHead>
          <TableHead className="w-[120px] text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="font-medium text-foreground">
              <span className="block max-w-xl break-words">{task.name}</span>
            </TableCell>
            <TableCell>{formatDateTime(task.created_at)}</TableCell>
            <TableCell>{formatDateTime(task.updated_at)}</TableCell>
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

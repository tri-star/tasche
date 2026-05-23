import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type TaskBulkAction = "delete"

type TaskBulkActionBarProps = {
  selectedCount: number
  disabled?: boolean
  onSelectAction: (action: TaskBulkAction) => void
}

export function TaskBulkActionBar({
  selectedCount,
  disabled = false,
  onSelectAction,
}: TaskBulkActionBarProps) {
  const [open, setOpen] = useState(false)
  const isDisabled = disabled || selectedCount === 0

  return (
    <div className="flex items-center gap-3">
      <Select
        value=""
        onValueChange={(v) => {
          onSelectAction(v as TaskBulkAction)
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={isDisabled}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="バルク操作を選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="delete">削除</SelectItem>
        </SelectContent>
      </Select>
      {selectedCount > 0 ? (
        <span className="text-sm text-muted-foreground">{selectedCount}件選択中</span>
      ) : null}
    </div>
  )
}

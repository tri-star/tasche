import { Check, Pencil, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

type TaskItemProps = {
  id: string
  name: string
  isSelected: boolean
  isNew?: boolean
  onToggle: () => void
  onEdit: (newName: string) => void
  onDelete: () => void
}

export function TaskItem({ name, isSelected, isNew, onToggle, onEdit, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(name)

  useEffect(() => {
    setDraftName(name)
  }, [name])

  const handleSave = () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setDraftName(name)
      setIsEditing(false)
      return
    }
    onEdit(trimmed)
    setIsEditing(false)
  }

  return (
    <div
      className={`rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isSelected ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={name} />
          <div className="min-w-0 flex-1">
            {isNew ? (
              <span className="inline-flex rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                new
              </span>
            ) : null}
            {isEditing ? (
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="w-full rounded-lg border border-border bg-card px-2 py-1 text-sm focus:border-ring focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={onToggle}
                className="block w-full text-left break-words text-sm font-semibold text-foreground"
              >
                {name}
              </button>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

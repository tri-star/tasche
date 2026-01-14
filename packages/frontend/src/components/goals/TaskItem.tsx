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
      return
    }
    onEdit(trimmed)
    setIsEditing(false)
  }

  return (
    <div
      className={`rounded-2xl border bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isSelected ? "border-emerald-300" : "border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            onClick={(event) => event.stopPropagation()}
          />
          <div>
            {isEditing ? (
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none"
              />
            ) : (
              <p className="text-sm font-semibold text-emerald-900">{name}</p>
            )}
            {isNew ? (
              <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                new
              </span>
            ) : null}
          </div>
        </button>
        <div className="flex items-center gap-2">
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

import { ChevronDown } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type TaskComboboxTask = {
  id: string
  name: string
}

export type TaskComboboxProps = {
  /** 候補となるタスク一覧（アーカイブ除外済みを期待） */
  tasks: TaskComboboxTask[]
  /** 現在選択されているタスクID。未選択は空文字 "" */
  value: string
  /** タスク選択時のコールバック */
  onChange: (taskId: string) => void
  /** 未選択時のプレースホルダ。デフォルト「タスクを選択...」 */
  placeholder?: string
  /** フィルタ入力欄のプレースホルダ。デフォルト「タスクを検索...」 */
  searchPlaceholder?: string
  /** 該当なしのときに表示するテキスト。デフォルト「該当するタスクがありません」 */
  emptyLabel?: string
  /** disabled 状態 */
  disabled?: boolean
  /** 外部から追加するクラス */
  className?: string
  /** aria-label（未指定時は「タスクを選択」） */
  ariaLabel?: string
}

export function TaskCombobox({
  tasks,
  value,
  onChange,
  placeholder = "タスクを選択...",
  searchPlaceholder = "タスクを検索...",
  emptyLabel = "該当するタスクがありません",
  disabled = false,
  className,
  ariaLabel,
}: TaskComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selectedTask = useMemo(() => tasks.find((t) => t.id === value), [tasks, value])

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter((t) => t.name.toLowerCase().includes(q))
  }, [tasks, query])

  // open になったときに input にフォーカスし、クエリとアクティブインデックスをリセット
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [open])

  // filteredTasks が変わったとき、activeIndex をクランプ
  useEffect(() => {
    if (filteredTasks.length === 0) {
      setActiveIndex(0)
    } else {
      setActiveIndex((prev) => Math.min(prev, filteredTasks.length - 1))
    }
  }, [filteredTasks.length])

  // 外側クリックで閉じる
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
    }
  }, [])

  // Escape キーで閉じる
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function handleSelect(taskId: string) {
    onChange(taskId)
    setOpen(false)
    setQuery("")
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, filteredTasks.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const task = filteredTasks[activeIndex]
      if (task) {
        handleSelect(task.id)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpen(true)
    }
  }

  function toggleOpen() {
    if (!disabled) {
      setOpen((prev) => !prev)
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value && selectedTask ? "" : "text-muted-foreground"}>
          {selectedTask?.name ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="border-b p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="タスク検索"
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={ariaLabel ?? "タスクを選択"}
            className="max-h-60 overflow-y-auto p-1"
          >
            {filteredTasks.length === 0 ? (
              <div role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
                {emptyLabel}
              </div>
            ) : (
              filteredTasks.map((task, idx) => (
                <div
                  key={task.id}
                  role="option"
                  aria-selected={task.id === value}
                  data-active={idx === activeIndex}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleSelect(task.id)
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-1.5 text-sm",
                    idx === activeIndex && "bg-accent text-accent-foreground",
                    task.id === value && "font-medium",
                  )}
                >
                  {task.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

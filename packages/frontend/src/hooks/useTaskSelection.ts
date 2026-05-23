import { useState } from "react"

type UseTaskSelectionParams = {
  pageItems: { id: string }[]
}

type UseTaskSelectionResult = {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggleOne: (id: string, checked: boolean) => void
  toggleAllOnPage: (checked: boolean) => void
  clear: () => void
  selectedCount: number
  allSelectedOnPage: boolean
  someSelectedOnPage: boolean
}

export function useTaskSelection({ pageItems }: UseTaskSelectionParams): UseTaskSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelected = (id: string) => selectedIds.has(id)

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        for (const item of pageItems) {
          next.add(item.id)
        }
      } else {
        for (const item of pageItems) {
          next.delete(item.id)
        }
      }
      return next
    })
  }

  const clear = () => setSelectedIds(new Set())

  const allSelectedOnPage = pageItems.length > 0 && pageItems.every((i) => selectedIds.has(i.id))
  const someSelectedOnPage = !allSelectedOnPage && pageItems.some((i) => selectedIds.has(i.id))

  return {
    selectedIds,
    isSelected,
    toggleOne,
    toggleAllOnPage,
    clear,
    selectedCount: selectedIds.size,
    allSelectedOnPage,
    someSelectedOnPage,
  }
}

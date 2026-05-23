import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useTaskSelection } from "./useTaskSelection"

const pageItems = [{ id: "tsk_1" }, { id: "tsk_2" }, { id: "tsk_3" }]

describe("useTaskSelection", () => {
  it("初期状態では何も選択されていない", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.allSelectedOnPage).toBe(false)
    expect(result.current.someSelectedOnPage).toBe(false)
  })

  it("toggleOne でタスクを選択できる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    act(() => {
      result.current.toggleOne("tsk_1", true)
    })

    expect(result.current.isSelected("tsk_1")).toBe(true)
    expect(result.current.selectedCount).toBe(1)
    expect(result.current.someSelectedOnPage).toBe(true)
    expect(result.current.allSelectedOnPage).toBe(false)
  })

  it("toggleOne で選択を解除できる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    act(() => {
      result.current.toggleOne("tsk_1", true)
    })
    act(() => {
      result.current.toggleOne("tsk_1", false)
    })

    expect(result.current.isSelected("tsk_1")).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it("toggleAllOnPage で全件を選択できる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    act(() => {
      result.current.toggleAllOnPage(true)
    })

    expect(result.current.allSelectedOnPage).toBe(true)
    expect(result.current.selectedCount).toBe(3)
    for (const item of pageItems) {
      expect(result.current.isSelected(item.id)).toBe(true)
    }
  })

  it("toggleAllOnPage で全件の選択を解除できる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    act(() => {
      result.current.toggleAllOnPage(true)
    })
    act(() => {
      result.current.toggleAllOnPage(false)
    })

    expect(result.current.allSelectedOnPage).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it("clear で全選択をリセットできる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    act(() => {
      result.current.toggleAllOnPage(true)
    })
    act(() => {
      result.current.clear()
    })

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.allSelectedOnPage).toBe(false)
  })

  it("一部選択時は someSelectedOnPage が true、allSelectedOnPage が false になる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems }))

    act(() => {
      result.current.toggleOne("tsk_1", true)
      result.current.toggleOne("tsk_2", true)
    })

    expect(result.current.someSelectedOnPage).toBe(true)
    expect(result.current.allSelectedOnPage).toBe(false)
  })

  it("pageItems が空の場合は allSelectedOnPage が false になる", () => {
    const { result } = renderHook(() => useTaskSelection({ pageItems: [] }))

    expect(result.current.allSelectedOnPage).toBe(false)
    expect(result.current.someSelectedOnPage).toBe(false)
  })

  it("pageItems が変わっても selectedIds は保持される", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: { id: string }[] }) => useTaskSelection({ pageItems: items }),
      { initialProps: { items: pageItems } },
    )

    act(() => {
      result.current.toggleOne("tsk_1", true)
    })

    // ページ切替を模擬: pageItems を別ページのアイテムに変更
    rerender({ items: [{ id: "tsk_4" }, { id: "tsk_5" }] })

    // selectedIds は保持されているが allSelectedOnPage は新しいページに対して計算される
    expect(result.current.isSelected("tsk_1")).toBe(true)
    expect(result.current.allSelectedOnPage).toBe(false)
    expect(result.current.someSelectedOnPage).toBe(false)
  })
})

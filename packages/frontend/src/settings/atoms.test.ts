import { createStore } from "jotai"
import { describe, expect, it } from "vitest"
import { currentSettingsAtom } from "./atoms"

describe("currentSettingsAtom", () => {
  it("初期値が null であること", () => {
    const store = createStore()
    expect(store.get(currentSettingsAtom)).toBeNull()
  })

  it("値を設定できること", () => {
    const store = createStore()
    store.set(currentSettingsAtom, { timezone: "UTC", theme: "dark" })
    expect(store.get(currentSettingsAtom)).toEqual({ timezone: "UTC", theme: "dark" })
  })

  it("値を null にリセットできること", () => {
    const store = createStore()
    store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "light" })
    store.set(currentSettingsAtom, null)
    expect(store.get(currentSettingsAtom)).toBeNull()
  })

  it("部分更新（スプレッド）ができること", () => {
    const store = createStore()
    store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "light" })
    const current = store.get(currentSettingsAtom)
    if (!current) throw new Error("current should not be null")
    store.set(currentSettingsAtom, { ...current, theme: "dark" })
    expect(store.get(currentSettingsAtom)).toEqual({ timezone: "Asia/Tokyo", theme: "dark" })
  })
})

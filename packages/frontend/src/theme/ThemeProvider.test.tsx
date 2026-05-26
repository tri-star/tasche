import { act, render } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { beforeEach, describe, expect, it } from "vitest"
import { currentSettingsAtom } from "@/settings/atoms"
import { ThemeProvider } from "./ThemeProvider"

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark")
  })

  it("theme が dark の場合、<html> に dark クラスが付与されること", () => {
    const store = createStore()
    store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "dark" })

    render(
      <Provider store={store}>
        <ThemeProvider>
          <div>content</div>
        </ThemeProvider>
      </Provider>,
    )

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("theme が light の場合、<html> から dark クラスが除去されること", () => {
    document.documentElement.classList.add("dark")
    const store = createStore()
    store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "light" })

    render(
      <Provider store={store}>
        <ThemeProvider>
          <div>content</div>
        </ThemeProvider>
      </Provider>,
    )

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("currentSettingsAtom が null の場合、dark クラスが付与されないこと（light 扱い）", () => {
    document.documentElement.classList.add("dark")
    const store = createStore()
    store.set(currentSettingsAtom, null)

    render(
      <Provider store={store}>
        <ThemeProvider>
          <div>content</div>
        </ThemeProvider>
      </Provider>,
    )

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("currentSettingsAtom が null から dark に更新されると dark クラスが付与されること", async () => {
    const store = createStore()
    store.set(currentSettingsAtom, null)

    render(
      <Provider store={store}>
        <ThemeProvider>
          <div>content</div>
        </ThemeProvider>
      </Provider>,
    )

    expect(document.documentElement.classList.contains("dark")).toBe(false)

    await act(async () => {
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "dark" })
    })

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})

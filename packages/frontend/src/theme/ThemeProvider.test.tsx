import { act, render } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { currentSettingsAtom } from "@/settings/atoms"
import { ThemeProvider } from "./ThemeProvider"

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) =>
      listeners.add(cb),
    ),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) =>
      listeners.delete(cb),
    ),
    _emit: (next: boolean) => {
      mql.matches = next
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent))
    },
  }
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql))
  return mql
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("light / dark テーマ", () => {
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

    it("theme が dark のとき matchMedia の値に依存せず dark クラスが付くこと", () => {
      mockMatchMedia(false) // OS はライトモード
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

    it("theme が light のとき matchMedia の値に依存せず dark クラスが外れること", () => {
      mockMatchMedia(true) // OS はダークモード
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
  })

  describe("system テーマ", () => {
    it("theme が system かつ OS がダークモードのとき <html> に dark クラスが付くこと", () => {
      mockMatchMedia(true)
      const store = createStore()
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "system" })

      render(
        <Provider store={store}>
          <ThemeProvider>
            <div>content</div>
          </ThemeProvider>
        </Provider>,
      )

      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("theme が system かつ OS がライトモードのとき <html> から dark クラスが外れること", () => {
      document.documentElement.classList.add("dark")
      mockMatchMedia(false)
      const store = createStore()
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "system" })

      render(
        <Provider store={store}>
          <ThemeProvider>
            <div>content</div>
          </ThemeProvider>
        </Provider>,
      )

      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("theme が system のとき OS 変更イベントを発火すると dark クラスが更新されること", async () => {
      const mql = mockMatchMedia(false)
      const store = createStore()
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "system" })

      render(
        <Provider store={store}>
          <ThemeProvider>
            <div>content</div>
          </ThemeProvider>
        </Provider>,
      )

      expect(document.documentElement.classList.contains("dark")).toBe(false)

      // OS がダークモードに変更
      await act(async () => {
        mql._emit(true)
      })

      expect(document.documentElement.classList.contains("dark")).toBe(true)

      // OS がライトモードに変更
      await act(async () => {
        mql._emit(false)
      })

      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("theme が system のとき addEventListener が呼ばれること", () => {
      const mql = mockMatchMedia(false)
      const store = createStore()
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "system" })

      render(
        <Provider store={store}>
          <ThemeProvider>
            <div>content</div>
          </ThemeProvider>
        </Provider>,
      )

      expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function))
    })

    it("アンマウント時に removeEventListener が呼ばれること（リスナリーク防止）", () => {
      const mql = mockMatchMedia(false)
      const store = createStore()
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "system" })

      const container = document.createElement("div")
      document.body.appendChild(container)

      const { unmount } = render(
        <Provider store={store}>
          <ThemeProvider>
            <div>content</div>
          </ThemeProvider>
        </Provider>,
        { container },
      )

      unmount()

      expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))

      document.body.removeChild(container)
    })

    it("theme が light のとき addEventListener が呼ばれないこと", () => {
      const mql = mockMatchMedia(true)
      const store = createStore()
      store.set(currentSettingsAtom, { timezone: "Asia/Tokyo", theme: "light" })

      render(
        <Provider store={store}>
          <ThemeProvider>
            <div>content</div>
          </ThemeProvider>
        </Provider>,
      )

      expect(mql.addEventListener).not.toHaveBeenCalled()
    })
  })
})

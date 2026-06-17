import type { Theme } from "@/settings/types"

/**
 * OS の prefers-color-scheme がダークモードかどうかを返す。
 * SSR / jsdom 環境で window.matchMedia が未定義の場合は false を返す。
 */
export function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * theme 設定値を元に、実際にダークモードにすべきかどうかを返す。
 * - "dark" → true
 * - "light" → false
 * - "system" → OS の設定 (prefersDark()) に従う
 */
export function resolveIsDark(theme: Theme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return prefersDark()
}

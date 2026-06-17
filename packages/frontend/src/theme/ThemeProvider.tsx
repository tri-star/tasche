import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { currentSettingsAtom } from "@/settings/atoms"
import type { Theme } from "@/settings/types"
import { resolveIsDark } from "@/theme/resolveSystemTheme"

type ThemeProviderProps = { children: React.ReactNode }

const VALID_THEMES: Theme[] = ["light", "dark", "system"]
function parseTheme(raw: string | null): Theme | null {
  return VALID_THEMES.includes(raw as Theme) ? (raw as Theme) : null
}

/**
 * currentSettingsAtom.theme を購読し、<html> の dark クラスを副作用で同期する Provider。
 * DB が真実のソースだが、起動時フラッシュを防ぐため localStorage をキャッシュとして使用する。
 * theme === "system" のとき OS の prefers-color-scheme に追従し、変更イベントを購読する。
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const settings = useAtomValue(currentSettingsAtom)

  useEffect(() => {
    let cachedTheme: Theme | null = null
    try {
      cachedTheme = parseTheme(localStorage.getItem("theme"))
    } catch {
      // localStorage が利用不可の場合（プライベートブラウジング等）はフォールバック
    }
    const theme: Theme = settings?.theme ?? cachedTheme ?? "light"

    const apply = (isDark: boolean) => {
      document.documentElement.classList.toggle("dark", isDark)
    }

    apply(resolveIsDark(theme))

    if (settings?.theme) {
      try {
        localStorage.setItem("theme", settings.theme)
      } catch {
        // localStorage が利用不可の場合は無視
      }
    }

    // system のときのみ OS テーマ変更に追従する
    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const listener = (e: MediaQueryListEvent) => apply(e.matches)
      mql.addEventListener("change", listener)
      return () => mql.removeEventListener("change", listener)
    }
  }, [settings?.theme])

  return <>{children}</>
}

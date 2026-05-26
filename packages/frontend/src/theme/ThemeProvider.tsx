import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { currentSettingsAtom } from "@/settings/atoms"

type ThemeProviderProps = { children: React.ReactNode }

/**
 * currentSettingsAtom.theme を購読し、<html> の dark クラスを副作用で同期する Provider。
 * DB が真実のソースだが、起動時フラッシュを防ぐため localStorage をキャッシュとして使用する。
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const settings = useAtomValue(currentSettingsAtom)

  useEffect(() => {
    const cachedTheme = localStorage.getItem("theme")
    const theme = settings?.theme ?? cachedTheme ?? "light"
    const isDark = theme === "dark"
    document.documentElement.classList.toggle("dark", isDark)

    if (settings?.theme) {
      localStorage.setItem("theme", settings.theme)
    }
  }, [settings?.theme])

  return <>{children}</>
}

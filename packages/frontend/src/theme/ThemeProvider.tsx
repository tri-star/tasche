import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { currentSettingsAtom } from "@/settings/atoms"

type ThemeProviderProps = { children: React.ReactNode }

/**
 * currentSettingsAtom.theme を購読し、<html> の dark クラスを副作用で同期する Provider。
 * 状態の唯一の真実は currentSettingsAtom（jotai）。
 * LocalStorage は使用しない（DB が真実のため）。
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const settings = useAtomValue(currentSettingsAtom)

  useEffect(() => {
    const isDark = settings?.theme === "dark"
    document.documentElement.classList.toggle("dark", isDark)
  }, [settings?.theme])

  return <>{children}</>
}

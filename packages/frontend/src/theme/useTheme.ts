import { useAtom } from "jotai"
import { useState } from "react"
import { useUpdateSettings } from "@/hooks/useUpdateSettings"
import { currentSettingsAtom } from "@/settings/atoms"
import type { Theme } from "@/settings/types"
import { DEFAULT_SETTINGS } from "@/settings/types"
import { resolveIsDark } from "@/theme/resolveSystemTheme"

type UseThemeResult = {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => Promise<void>
  toggleTheme: () => Promise<void>
  isUpdating: boolean
  error: Error | null
}

/**
 * ダークモード切替アクションを提供するフック。
 * ThemeSection から呼ばれる。
 * 楽観更新: setTheme 呼出時に currentSettingsAtom を即座に更新し、API 失敗時にロールバックする。
 */
export function useTheme(): UseThemeResult {
  const [settings, setSettings] = useAtom(currentSettingsAtom)
  const updateSettings = useUpdateSettings()
  const [error, setError] = useState<Error | null>(null)

  const theme: Theme = settings?.theme ?? "light"
  const isDark = resolveIsDark(theme)

  async function setTheme(next: Theme): Promise<void> {
    const previous = settings

    // 楽観更新: 即座に UI に反映
    const optimistic = previous
      ? { ...previous, theme: next }
      : { ...DEFAULT_SETTINGS, theme: next }
    setSettings(optimistic)
    setError(null)

    try {
      const updated = await updateSettings.mutateAsync({ theme: next })
      // サーバーから返ってきた権威ある値で全置換
      setSettings({ timezone: updated.timezone, theme: updated.theme })
    } catch (err) {
      // ロールバック
      setSettings(previous)
      setError(err instanceof Error ? err : new Error("テーマの更新に失敗しました"))
    }
  }

  // isDark（OSまたは明示設定による現在の表示状態）を基準にトグルする。
  // system 選択中に呼ぶと system 設定が light/dark に上書きされる点に注意。
  async function toggleTheme(): Promise<void> {
    await setTheme(isDark ? "light" : "dark")
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    isUpdating: updateSettings.isPending,
    error,
  }
}

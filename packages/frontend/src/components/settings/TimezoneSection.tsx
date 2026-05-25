import { useAtom } from "jotai"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUpdateSettings } from "@/hooks/useUpdateSettings"
import { currentSettingsAtom } from "@/settings/atoms"
import { TimezoneCombobox } from "./TimezoneCombobox"

/**
 * タイムゾーン設定セクション。
 * TimezoneCombobox + 「保存」ボタン + 状態表示。
 * フォームは1項目のみなので react-hook-form ではなく useState で管理。
 */
export function TimezoneSection() {
  const [settings, setSettings] = useAtom(currentSettingsAtom)
  const initial = settings?.timezone ?? "Asia/Tokyo"
  const [draft, setDraft] = useState(initial)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const updateSettings = useUpdateSettings()

  const isDirty = draft !== initial

  async function handleSave() {
    setErrorMessage(null)
    try {
      const updated = await updateSettings.mutateAsync({ timezone: draft })
      // 権威ある値で settings を再同期（全置換）
      setSettings({ timezone: updated.timezone, theme: updated.theme })
    } catch {
      setErrorMessage("タイムゾーンの保存に失敗しました")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>タイムゾーン</CardTitle>
        <CardDescription>表示・記録に使用するタイムゾーンを選択します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <label htmlFor="timezone-select" className="text-sm text-tasche-text">
            タイムゾーン
          </label>
          <TimezoneCombobox id="timezone-select" value={draft} onChange={setDraft} />
          <Button onClick={handleSave} disabled={!isDirty || updateSettings.isPending}>
            保存
          </Button>
        </div>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      </CardContent>
    </Card>
  )
}

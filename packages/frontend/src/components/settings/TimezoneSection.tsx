import { useAtom } from "jotai"
import { useEffect, useState } from "react"
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
  const [draft, setDraft] = useState(settings?.timezone ?? "Asia/Tokyo")
  const [initialized, setInitialized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const updateSettings = useUpdateSettings()

  // settings が async でロードされた際に draft を初期化する
  useEffect(() => {
    if (settings && !initialized) {
      setDraft(settings.timezone)
      setInitialized(true)
    }
  }, [settings, initialized])

  // settings 未取得時はフォームを表示しない（null のまま保存するとDB値を上書きするリスクがある）
  if (!settings) return null

  const isDirty = draft !== settings.timezone

  async function handleSave() {
    setErrorMessage(null)
    try {
      const updated = await updateSettings.mutateAsync({ timezone: draft })
      setSettings({ timezone: updated.timezone, theme: updated.theme })
      setDraft(updated.timezone)
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
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Theme } from "@/settings/types"
import { useTheme } from "@/theme/useTheme"

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
  { value: "system", label: "システム" },
]

/**
 * テーマ選択 ToggleGroup UI。Light / Dark / System の3択。サーバー保存 + 楽観更新。
 */
export function ThemeSection() {
  const { theme, setTheme, isUpdating, error } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>テーマ</CardTitle>
        <CardDescription>
          画面の配色を切り替えます。「システム」を選択するとOSの設定に自動追従します。設定はアカウントに保存され、他の端末でも同じ表示になります。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          type="single"
          variant="outline"
          value={theme}
          disabled={isUpdating}
          onValueChange={(next) => {
            if (next) void setTheme(next as Theme)
          }}
          aria-label="テーマを選択"
        >
          {THEME_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              aria-label={opt.label}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {error && <p className="mt-2 text-sm text-destructive">テーマの保存に失敗しました</p>}
      </CardContent>
    </Card>
  )
}

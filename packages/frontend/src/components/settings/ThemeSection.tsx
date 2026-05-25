import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/theme/useTheme"

/**
 * ダークモード Switch UI。サーバー保存 + 楽観更新。
 */
export function ThemeSection() {
  const { isDark, setTheme, isUpdating, error } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>ダークモード</CardTitle>
        <CardDescription>
          画面の配色を切り替えます。設定はアカウントに保存され、他の端末でも同じ表示になります。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <label htmlFor="dark-mode-switch" className="text-sm text-tasche-text">
            ダークモードを有効にする
          </label>
          <Switch
            id="dark-mode-switch"
            checked={isDark}
            disabled={isUpdating}
            onCheckedChange={(checked) => {
              void setTheme(checked ? "dark" : "light")
            }}
            aria-label="ダークモード切替"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">テーマの保存に失敗しました</p>}
      </CardContent>
    </Card>
  )
}

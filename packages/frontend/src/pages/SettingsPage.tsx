import { useAtomValue } from "jotai"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ThemeSection } from "@/components/settings/ThemeSection"
import { TimezoneSection } from "@/components/settings/TimezoneSection"
import { currentSettingsAtom } from "@/settings/atoms"

export function SettingsPage() {
  const settings = useAtomValue(currentSettingsAtom)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">設定</h1>
        {!settings ? (
          <p className="text-sm text-destructive">
            設定情報の取得に失敗しました。ページを再読み込みしてください。
          </p>
        ) : (
          <>
            <TimezoneSection />
            <ThemeSection />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

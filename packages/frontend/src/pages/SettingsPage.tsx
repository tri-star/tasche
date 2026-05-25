import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ThemeSection } from "@/components/settings/ThemeSection"
import { TimezoneSection } from "@/components/settings/TimezoneSection"

export function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-tasche-text">設定</h1>
        <TimezoneSection />
        <ThemeSection />
      </div>
    </DashboardLayout>
  )
}

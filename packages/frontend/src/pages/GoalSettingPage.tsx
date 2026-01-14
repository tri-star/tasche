import { GoalWizard } from "@/components/goals/GoalWizard"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

export function GoalSettingPage() {
  return (
    <DashboardLayout>
      <div className="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 p-6 shadow-sm md:p-10">
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative space-y-8">
          <div className="space-y-2 text-left">
            <p className="text-sm font-semibold text-emerald-700">Weekly Goal Setup</p>
            <h1 className="text-3xl font-bold text-emerald-900">
              今週の目標を、やさしく設定しましょう
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              小さな一歩を積み重ねるためのウィザードです。気軽に、楽しく進めてください。
            </p>
          </div>

          <GoalWizard />
        </div>
      </div>
    </DashboardLayout>
  )
}

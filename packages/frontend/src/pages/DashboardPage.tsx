import { useEffect, useState } from "react"
import {
  getDashboardApiDashboardGet,
  updateRecordApiWeeksCurrentRecordsDayTaskIdPut,
} from "@/api/generated/client"
import type { DashboardResponse } from "@/api/generated/model"
import { GoalSettingFab } from "@/components/dashboard/GoalSettingFab"
import { RecordWidget } from "@/components/dashboard/RecordWidget"
import { TodayGoalsWidget } from "@/components/dashboard/TodayGoalsWidget"
import { WeeklyMatrix } from "@/components/dashboard/WeeklyMatrix"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

function formatDate(dateStr: string, dayOfWeek: string): string {
  const date = new Date(dateStr)
  const dayLabels: Record<string, string> = {
    monday: "月",
    tuesday: "火",
    wednesday: "水",
    thursday: "木",
    friday: "金",
    saturday: "土",
    sunday: "日",
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${dayLabels[dayOfWeek]}）`
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await getDashboardApiDashboardGet()
        if (response.status === 200) {
          setDashboard(response.data.data)
        }
      } catch (err) {
        setError("データの取得に失敗しました")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const handleRecord = async (day: string, taskId: string, units: number) => {
    try {
      await updateRecordApiWeeksCurrentRecordsDayTaskIdPut(
        day as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
        taskId,
        { actual_units: units },
      )
      const response = await getDashboardApiDashboardGet()
      if (response.status === 200) {
        setDashboard(response.data.data)
      }
    } catch (err) {
      console.error("記録に失敗しました", err)
    }
  }

  const handleGoalSetting = () => {
    window.location.href = "/goals"
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <p>読み込み中...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !dashboard) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-destructive">{error || "エラーが発生しました"}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <TodayGoalsWidget
            date={formatDate(dashboard.current_date, dashboard.current_day_of_week)}
            goals={dashboard.today_goals}
          />
          <RecordWidget
            currentDay={dashboard.current_day_of_week}
            tasks={dashboard.today_goals}
            onRecord={handleRecord}
          />
        </div>
        <WeeklyMatrix data={dashboard.weekly_matrix} currentDay={dashboard.current_day_of_week} />
      </div>
      <GoalSettingFab onClick={handleGoalSetting} />
    </DashboardLayout>
  )
}

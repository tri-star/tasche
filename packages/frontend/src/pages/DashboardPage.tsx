import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  createRecordApiWeeksCurrentRecordsPost,
  getDashboardApiDashboardGet,
  getTasksApiTasksGet,
} from "@/api/generated/client"
import type { DashboardResponse, DayOfWeek } from "@/api/generated/model"
import { GoalSettingFab } from "@/components/dashboard/GoalSettingFab"
import { NoGoalsEmptyState } from "@/components/dashboard/NoGoalsEmptyState"
import { RecordWidget } from "@/components/dashboard/RecordWidget"
import { TodayGoalsWidget } from "@/components/dashboard/TodayGoalsWidget"
import { WeeklyMatrix } from "@/components/dashboard/WeeklyMatrix"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

function formatDate(dateStr: string, dayOfWeek: DayOfWeek): string {
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
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [dashboardRes, tasksRes] = await Promise.all([
          getDashboardApiDashboardGet(),
          getTasksApiTasksGet({ include_archived: false }),
        ])
        if (dashboardRes.status === 200) {
          setDashboard(dashboardRes.data.data)
        }
        if (tasksRes.status === 200) {
          setTasks(tasksRes.data.data.items.map((t) => ({ id: t.id, name: t.name })))
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

  const handleRecord = async (day: DayOfWeek, taskId: string, units: number) => {
    try {
      await createRecordApiWeeksCurrentRecordsPost({
        day_of_week: day,
        task_id: taskId,
        actual_units: units,
      })
      const response = await getDashboardApiDashboardGet()
      if (response.status === 200) {
        setDashboard(response.data.data)
      }
    } catch (err) {
      console.error("記録に失敗しました", err)
    }
  }

  const handleGoalSetting = () => {
    navigate("/goals")
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
      {dashboard.has_goals_configured ? (
        <div className="min-w-0 space-y-4 md:space-y-6">
          <div className="grid min-w-0 gap-4 md:gap-6 md:grid-cols-2">
            <TodayGoalsWidget
              date={formatDate(dashboard.current_date, dashboard.current_day_of_week)}
              goals={dashboard.today_goals}
            />
            <RecordWidget
              currentDay={dashboard.current_day_of_week}
              weekStartDate={dashboard.week.start_date}
              tasks={tasks}
              onRecord={handleRecord}
            />
          </div>
          <WeeklyMatrix data={dashboard.weekly_matrix} currentDay={dashboard.current_day_of_week} />
        </div>
      ) : (
        <NoGoalsEmptyState onClickGoalSetting={handleGoalSetting} />
      )}
      <GoalSettingFab onClick={handleGoalSetting} />
    </DashboardLayout>
  )
}

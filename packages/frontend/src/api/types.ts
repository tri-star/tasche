export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type Task = {
  id: string
  name: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type DashboardResponse = {
  current_date: string
  current_day_of_week: DayOfWeek
  week: {
    id: string
    start_date: string
    end_date: string
    unit_duration_minutes: number
  }
  today_goals: Array<{
    task_id: string
    task_name: string
    target_units: number
    actual_units: number
    completion_rate: number | null
  }>
  weekly_matrix: Array<{
    task_id: string
    task_name: string
    daily_data: Record<
      DayOfWeek,
      {
        target_units: number
        actual_units: number
        completion_rate: number | null
      }
    >
  }>
  has_goals_configured: boolean
}

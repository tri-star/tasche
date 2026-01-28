import { useState } from "react"
import type { DayOfWeek, TodayGoal } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const DAYS_OF_WEEK = [
  { value: "monday", label: "月" },
  { value: "tuesday", label: "火" },
  { value: "wednesday", label: "水" },
  { value: "thursday", label: "木" },
  { value: "friday", label: "金" },
  { value: "saturday", label: "土" },
  { value: "sunday", label: "日" },
] as const

type RecordWidgetProps = {
  currentDay: DayOfWeek
  tasks: TodayGoal[]
  onRecord?: (day: DayOfWeek, taskId: string, units: number) => void
}

export function RecordWidget({ currentDay, tasks, onRecord }: RecordWidgetProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(currentDay)
  const [selectedTask, setSelectedTask] = useState<string>("")
  const [units, setUnits] = useState<number>(1.5)

  const handleDecrement = () => {
    setUnits((prev) => Math.max(0, +(prev - 0.5).toFixed(1)))
  }

  const handleIncrement = () => {
    setUnits((prev) => +(prev + 0.5).toFixed(1))
  }

  const handleRecord = () => {
    if (selectedTask) {
      onRecord?.(selectedDay, selectedTask, units)
    }
  }

  return (
    <Card className="relative overflow-hidden" role="region" aria-label="実績を記録">
      {/* 右上イラスト */}
      <img
        src="/images/dashboard/dashboard-widget-illust2.png"
        alt=""
        className="absolute right-2 top-2 h-12 w-12 object-contain"
        aria-hidden="true"
      />

      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <img
          src="/images/dashboard/dashboard-widget-icon2.png"
          alt=""
          className="h-6 w-6 object-contain"
        />
        <CardTitle className="text-lg">実績を記録</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative z-10 space-y-4">
          {/* 曜日セレクタ */}
          <ToggleGroup
            type="single"
            value={selectedDay}
            onValueChange={(value) => value && setSelectedDay(value as DayOfWeek)}
            className="justify-start gap-1"
          >
            {DAYS_OF_WEEK.map((day) => (
              <ToggleGroupItem
                key={day.value}
                value={day.value}
                className="w-9 h-9 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {day.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* タスク選択 */}
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger>
              <SelectValue placeholder="タスクを選択..." />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.task_id} value={task.task_id}>
                  {task.task_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ユニット数入力 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={units <= 0}
              className="h-9 w-9"
            >
              −
            </Button>
            <span className="w-16 text-center text-xl font-medium">{units}</span>
            <Button variant="outline" size="icon" onClick={handleIncrement} className="h-9 w-9">
              +
            </Button>
            <span className="text-sm text-muted-foreground">units</span>
          </div>

          {/* 記録ボタン */}
          <Button
            onClick={handleRecord}
            disabled={!selectedTask}
            className="w-full bg-primary hover:bg-primary/90"
          >
            記録する
          </Button>
        </div>
      </CardContent>

      {/* 右下の植物イラスト（背景） */}
      <img
        src="/images/dashboard/widget-background.png"
        alt=""
        className="absolute bottom-0 right-4 h-12 w-12 object-contain opacity-80"
        aria-hidden="true"
      />
    </Card>
  )
}

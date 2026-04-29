import { useState } from "react"
import type { DayOfWeek } from "@/api/generated/model"
import { DaySelector } from "@/components/common/DaySelector"
import { SpinButton } from "@/components/common/SpinButton"
import { TaskCombobox } from "@/components/common/TaskCombobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RecordWidgetProps = {
  currentDay: DayOfWeek
  weekStartDate: string
  tasks: { id: string; name: string }[]
  onRecord?: (day: DayOfWeek, taskId: string, units: number) => void
}

export function RecordWidget({ currentDay, weekStartDate, tasks, onRecord }: RecordWidgetProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(currentDay)
  const [selectedTask, setSelectedTask] = useState<string>("")
  const [units, setUnits] = useState<number>(1.5)

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
          <DaySelector
            weekStartDate={weekStartDate}
            currentDay={currentDay}
            value={selectedDay}
            onChange={setSelectedDay}
          />

          {/* タスク選択 */}
          <TaskCombobox tasks={tasks} value={selectedTask} onChange={setSelectedTask} />

          {/* ユニット数入力 */}
          <SpinButton
            value={units}
            onChange={setUnits}
            step={0.1}
            min={0}
            ariaLabel="実績ユニット"
          />

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

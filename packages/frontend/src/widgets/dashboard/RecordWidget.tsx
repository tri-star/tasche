import { useMemo, useState } from 'react'

import { Card } from '@/shared/ui/Card'
import { SpinButton } from '@/widgets/dashboard/SpinButton'

type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

const days: Array<{ key: Day; label: string }> = [
  { key: 'monday', label: '月' },
  { key: 'tuesday', label: '火' },
  { key: 'wednesday', label: '水' },
  { key: 'thursday', label: '木' },
  { key: 'friday', label: '金' },
  { key: 'saturday', label: '土' },
  { key: 'sunday', label: '日' },
]

const sampleTasks = [
  { id: 'tsk_1', name: '英語学習' },
  { id: 'tsk_2', name: '個人開発' },
  { id: 'tsk_3', name: '読書' },
]

export function RecordWidget() {
  const [day, setDay] = useState<Day>('wednesday')
  const [taskId, setTaskId] = useState(sampleTasks[0].id)
  const [units, setUnits] = useState(0.0)

  const selectedTask = useMemo(() => sampleTasks.find((t) => t.id === taskId), [taskId])

  return (
    <Card title="実績登録">
      <div className="space-y-4">
        <div className="flex gap-1">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDay(d.key)}
              className={
                day === d.key
                  ? 'rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white'
                  : 'rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <div className="text-xs text-slate-500">タスク</div>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {sampleTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <div className="text-xs text-slate-500">ユニット数（0.1刻み）</div>
            <SpinButton value={units} onChange={setUnits} />
          </label>

          <button
            type="button"
            className="rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700"
            onClick={() => {
              alert(`保存（仮）: day=${day}, task=${selectedTask?.name}, units=${units.toFixed(1)}`)
              setUnits(0)
            }}
          >
            記録
          </button>

          <div className="text-xs text-slate-500">
            APIは `PUT /api/weeks/current/records/:day/:taskId` を想定。
          </div>
        </div>
      </div>
    </Card>
  )
}

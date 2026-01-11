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

type Cell = {
  targetUnits: number
  actualUnits: number
  completionRate: number | null
}

type Row = {
  taskName: string
  daily: Record<Day, Cell>
}

const sample: Row[] = [
  {
    taskName: '英語学習',
    daily: {
      monday: { targetUnits: 2, actualUnits: 2.5, completionRate: 125 },
      tuesday: { targetUnits: 1, actualUnits: 1, completionRate: 100 },
      wednesday: { targetUnits: 2, actualUnits: 1.5, completionRate: 75 },
      thursday: { targetUnits: 1, actualUnits: 0, completionRate: 0 },
      friday: { targetUnits: 2, actualUnits: 0, completionRate: 0 },
      saturday: { targetUnits: 0, actualUnits: 0, completionRate: null },
      sunday: { targetUnits: 0, actualUnits: 0, completionRate: null },
    },
  },
  {
    taskName: '個人開発',
    daily: {
      monday: { targetUnits: 2, actualUnits: 2, completionRate: 100 },
      tuesday: { targetUnits: 2, actualUnits: 1.5, completionRate: 75 },
      wednesday: { targetUnits: 0, actualUnits: 0, completionRate: null },
      thursday: { targetUnits: 2, actualUnits: 0, completionRate: 0 },
      friday: { targetUnits: 0, actualUnits: 0, completionRate: null },
      saturday: { targetUnits: 4, actualUnits: 0, completionRate: 0 },
      sunday: { targetUnits: 4, actualUnits: 0, completionRate: 0 },
    },
  },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function rateToBg(rate: number | null) {
  if (rate === null) return 'rgba(148,163,184,0.25)'
  const r = clamp(rate, 0, 100)
  const hue = 120 * (r / 100) // 0=red, 120=green
  return `hsl(${hue} 70% 45% / 0.25)`
}

export function WeeklyMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              タスク
            </th>
            {days.map((d) => (
              <th
                key={d.key}
                className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sample.map((row) => (
            <tr key={row.taskName}>
              <td className="sticky left-0 z-10 border-t border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-800 dark:bg-slate-900">
                {row.taskName}
              </td>
              {days.map((d) => {
                const cell = row.daily[d.key]
                return (
                  <td
                    key={d.key}
                    className="border-t border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <div
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ background: rateToBg(cell.completionRate) }}
                      title={
                        cell.completionRate === null
                          ? '目標なし'
                          : `${cell.completionRate.toFixed(0)}% (目標 ${cell.targetUnits}, 実績 ${cell.actualUnits})`
                      }
                    >
                      {cell.completionRate === null ? '-' : `${cell.completionRate.toFixed(0)}%`}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 text-xs text-slate-500">
        後で `/api/dashboard` の weekly_matrix を表示します。
      </div>
    </div>
  )
}

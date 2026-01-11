import { useState } from 'react'

import { Card } from '@/shared/ui/Card'

type UnitDuration = 10 | 30 | 60 | 120

const unitOptions: Array<{ label: string; value: UnitDuration }> = [
  { label: '10分', value: 10 },
  { label: '30分', value: 30 },
  { label: '1時間', value: 60 },
  { label: '2時間', value: 120 },
]

export function GoalsPage() {
  const [unitDuration, setUnitDuration] = useState<UnitDuration>(30)

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">目標設定（ウィザード）</h1>

      <Card title="Step 1: ユニット時間選択">
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            1ユニットの時間を選んでください。
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {unitOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900/60"
              >
                <input
                  type="radio"
                  name="unitDuration"
                  value={opt.value}
                  checked={unitDuration === opt.value}
                  onChange={() => setUnitDuration(opt.value)}
                />
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              type="button"
              onClick={() => {
                // TODO: Step2以降を実装（タスク選択→配分→確認→保存）
                alert(`選択: ${unitDuration}分 (この先は未実装)`)
              }}
            >
              次へ
            </button>
          </div>
        </div>
      </Card>

      <div className="text-sm text-slate-600 dark:text-slate-300">
        Step 2〜4 は次の実装対象です（タスク選択→曜日別配分→確認）。
      </div>
    </div>
  )
}

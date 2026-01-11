import { useMemo, useState } from 'react'

import { Card } from '@/shared/ui/Card'

type Task = {
  id: string
  name: string
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'tsk_1', name: '英語学習' },
    { id: 'tsk_2', name: '個人開発' },
    { id: 'tsk_3', name: '読書' },
  ])
  const [newName, setNewName] = useState('')
  const canAdd = useMemo(() => newName.trim().length > 0, [newName])

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">タスク管理</h1>

      <Card title="新規タスク">
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="タスク名"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lime-400 dark:border-slate-800 dark:bg-slate-900"
          />
          <button
            className="rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700 disabled:opacity-40"
            type="button"
            disabled={!canAdd}
            onClick={() => {
              const name = newName.trim()
              if (!name) return
              setTasks((prev) => [{ id: `tsk_${Date.now()}`, name }, ...prev])
              setNewName('')
            }}
          >
            追加
          </button>
        </div>
      </Card>

      <Card title="タスク一覧（仮）">
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-white px-4 py-3 dark:bg-slate-900"
            >
              <div className="text-sm font-medium">{t.name}</div>
              <button
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                type="button"
                onClick={() => {
                  if (!confirm(`タスク「${t.name}」を削除しますか？（仮）`)) return
                  setTasks((prev) => prev.filter((x) => x.id !== t.id))
                }}
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          API連携（GET/POST/PUT/DELETE /api/tasks）は次の段階で繋ぎます。
        </div>
      </Card>
    </div>
  )
}

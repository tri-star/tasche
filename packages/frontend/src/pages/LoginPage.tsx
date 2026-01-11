import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-yellow-50 to-orange-50 px-6 py-16 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Tasche</div>
          <div className="mt-1 text-sm text-slate-600">
            1週間の目標を配分して、毎日の実績を記録する習慣化サポート。
          </div>
        </div>

        <div className="space-y-3">
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => {
              login({ provider: 'google' })
              navigate('/')
            }}
            type="button"
          >
            Googleでログイン（仮）
          </button>
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => {
              login({ provider: 'github' })
              navigate('/')
            }}
            type="button"
          >
            GitHubでログイン（仮）
          </button>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Auth0連携は後で実装します。いまは画面・状態管理の雛形を先に作っています。
        </div>
      </div>
    </div>
  )
}

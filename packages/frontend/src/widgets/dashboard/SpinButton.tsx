import { useMemo } from 'react'

type Props = {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
}

function roundTo1Decimal(x: number) {
  return Math.round(x * 10) / 10
}

export function SpinButton({ value, onChange, step = 0.1, min = 0 }: Props) {
  const display = useMemo(() => roundTo1Decimal(value).toFixed(1), [value])

  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <input
        value={display}
        inputMode="decimal"
        className="w-full px-3 py-2 text-sm outline-none"
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isNaN(next)) return
          onChange(Math.max(min, roundTo1Decimal(next)))
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(roundTo1Decimal(Math.max(min, value + step)))
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(roundTo1Decimal(Math.max(min, value - step)))
          }
        }}
      />
      <div className="flex flex-col border-l border-slate-200 dark:border-slate-800">
        <button
          type="button"
          className="px-3 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="increment"
          onClick={() => onChange(roundTo1Decimal(value + step))}
        >
          ▲
        </button>
        <button
          type="button"
          className="px-3 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="decrement"
          onClick={() => onChange(roundTo1Decimal(Math.max(min, value - step)))}
        >
          ▼
        </button>
      </div>
    </div>
  )
}

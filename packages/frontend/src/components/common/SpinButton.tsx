import { Minus, Plus } from "lucide-react"
import type { KeyboardEvent } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SpinButtonProps = {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  disabled?: boolean
  ariaLabel?: string
  unitLabel?: string
  className?: string
}

function getDecimalPlaces(value: number): number {
  const valueText = value.toString().toLowerCase()
  if (valueText.includes("e-")) {
    const [coefficient, exponent] = valueText.split("e-")
    const [, fraction = ""] = coefficient.split(".")
    return Number(exponent) + fraction.length
  }

  const [, fraction = ""] = valueText.split(".")
  return fraction.length
}

function normalize(value: number, step: number): number {
  const decimalPlaces = getDecimalPlaces(step)
  return Number(value.toFixed(decimalPlaces))
}

function clamp(value: number, min: number, max?: number): number {
  const minClamped = Math.max(min, value)
  return max === undefined ? minClamped : Math.min(max, minClamped)
}

function isMultipleOfStep(value: number, step: number): boolean {
  return Math.abs(value / step - Math.round(value / step)) < 1e-9
}

function snapUp(value: number, step: number): number {
  if (isMultipleOfStep(value, step)) {
    return value + step
  }
  return Math.floor(value / step) * step + step
}

function snapDown(value: number, step: number): number {
  if (isMultipleOfStep(value, step)) {
    return value - step
  }
  return Math.floor(value / step) * step
}

export function SpinButton({
  value,
  onChange,
  step = 0.5,
  min = 0,
  max,
  disabled = false,
  ariaLabel = "ユニット数",
  unitLabel = "units",
  className,
}: SpinButtonProps) {
  const normalizedValue = normalize(clamp(value, min, max), step)
  const formattedValue = normalizedValue.toFixed(getDecimalPlaces(step))

  const [draft, setDraft] = useState<string>(formattedValue)
  const [isFocused, setIsFocused] = useState(false)

  const parsedDraft = Number(draft)
  const currentValue =
    isFocused && draft.trim() !== "" && !Number.isNaN(parsedDraft) && Number.isFinite(parsedDraft)
      ? parsedDraft
      : normalizedValue

  const displayValue = isFocused ? draft : formattedValue

  function update(nextValue: number) {
    if (disabled) return
    const newValue = normalize(clamp(nextValue, min, max), step)
    setDraft(newValue.toFixed(getDecimalPlaces(step)))
    if (newValue !== normalizedValue) {
      onChange(newValue)
    }
  }

  function commit(raw: string) {
    const parsed = Number(raw)
    if (raw.trim() === "" || Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      // 無効な入力は現在値に戻す
      setDraft(formattedValue)
      return
    }
    // step の倍数へのスナップはしない（手入力の端数を許容）が、表示桁数（step の小数桁）で丸める
    const clamped = clamp(parsed, min, max)
    // 表示桁で正規化（step の小数桁）
    const committed = normalize(clamped, step)
    setDraft(committed.toFixed(getDecimalPlaces(step)))
    if (committed !== normalizedValue) {
      onChange(committed)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(true)
    setDraft(formattedValue)
    e.target.select()
  }

  function handleBlur() {
    setIsFocused(false)
    commit(draft)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return

    if (event.key === "ArrowUp") {
      event.preventDefault()
      update(snapUp(currentValue, step))
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      update(snapDown(currentValue, step))
    } else if (event.key === "Home") {
      event.preventDefault()
      update(min)
    } else if (event.key === "End" && max !== undefined) {
      event.preventDefault()
      update(max)
    } else if (event.key === "Enter") {
      event.currentTarget.blur()
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => update(snapDown(normalizedValue, step))}
        disabled={disabled || normalizedValue <= min}
        className="h-9 w-9"
        aria-label={`${ariaLabel}を減らす`}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label={ariaLabel}
        aria-valuenow={normalizedValue}
        aria-valuetext={`${formattedValue} ${unitLabel}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 min-w-20 items-center justify-center rounded-md border border-input bg-background px-3",
          "text-center text-xl font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => update(snapUp(normalizedValue, step))}
        disabled={disabled || (max !== undefined && normalizedValue >= max)}
        className="h-9 w-9"
        aria-label={`${ariaLabel}を増やす`}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">{unitLabel}</span>
    </div>
  )
}

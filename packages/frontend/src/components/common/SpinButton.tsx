import { Minus, Plus } from "lucide-react"
import type { KeyboardEvent } from "react"
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

export function SpinButton({
  value,
  onChange,
  step = 0.1,
  min = 0,
  max,
  disabled = false,
  ariaLabel = "ユニット数",
  unitLabel = "units",
  className,
}: SpinButtonProps) {
  const normalizedValue = normalize(clamp(value, min, max), step)
  const formattedValue = normalizedValue.toFixed(getDecimalPlaces(step))

  function update(nextValue: number) {
    if (disabled) return
    const newValue = normalize(clamp(nextValue, min, max), step)
    if (newValue !== normalizedValue) {
      onChange(newValue)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return

    if (event.key === "ArrowUp") {
      event.preventDefault()
      update(normalizedValue + step)
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      update(normalizedValue - step)
    } else if (event.key === "Home") {
      event.preventDefault()
      update(min)
    } else if (event.key === "End" && max !== undefined) {
      event.preventDefault()
      update(max)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => update(normalizedValue - step)}
        disabled={disabled || normalizedValue <= min}
        className="h-9 w-9"
        aria-label={`${ariaLabel}を減らす`}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuenow={normalizedValue}
        aria-valuetext={`${formattedValue} ${unitLabel}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 min-w-20 items-center justify-center rounded-md border border-input bg-background px-3",
          "text-center text-xl font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {formattedValue}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => update(normalizedValue + step)}
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

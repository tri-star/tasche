import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type StepIndicatorProps = {
  currentStep: number
  steps: { number: number; label: string }[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const currentStepData = steps.find((s) => s.number === currentStep)
  const progressPercent = (currentStep / steps.length) * 100

  return (
    <>
      {/* モバイル: 進捗バー + 現在ステップ表示 */}
      <div data-testid="step-indicator-mobile" className="md:hidden">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
          <span>
            Step {currentStep} / {steps.length}
          </span>
          <span>{currentStepData?.label}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-warning transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* デスクトップ: ピル一覧 */}
      <div
        data-testid="step-indicator-desktop"
        className="hidden flex-wrap items-center gap-3 md:flex"
      >
        {steps.map((step) => {
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          return (
            <div
              key={step.number}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                isActive
                  ? "border-warning bg-warning-soft text-warning-soft-foreground"
                  : isCompleted
                    ? "border-success bg-success-soft text-success-soft-foreground"
                    : "border-border bg-card/70 text-muted-foreground",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground">
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </span>
              <span>{step.label}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

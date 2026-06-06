import { Check } from "lucide-react"

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
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-emerald-900">
          <span>
            Step {currentStep} / {steps.length}
          </span>
          <span>{currentStepData?.label}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-amber-300 transition-all"
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
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                isActive
                  ? "border-amber-300 bg-amber-200/70 text-amber-900"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                    : "border-muted bg-white/70 text-muted-foreground"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-emerald-700">
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

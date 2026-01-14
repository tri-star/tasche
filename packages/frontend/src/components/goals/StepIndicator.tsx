import { Check } from "lucide-react"

type StepIndicatorProps = {
  currentStep: number
  steps: { number: number; label: string }[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
  )
}

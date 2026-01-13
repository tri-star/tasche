import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Step1Props = {
  value: number | null;
  onChange: (minutes: number) => void;
  onNext: () => void;
  onCancel: () => void;
};

const options = [
  {
    minutes: 10,
    title: "10分",
    description: "For short tasks",
    icon: "/images/goals/step1-option-1.png",
  },
  {
    minutes: 30,
    title: "30分",
    description: "Standard work block",
    icon: "/images/goals/step1-option-2.png",
  },
  {
    minutes: 60,
    title: "1時間",
    description: "Focused session",
    icon: "/images/goals/step1-option-3.png",
  },
  {
    minutes: 120,
    title: "2時間",
    description: "Deep work",
    icon: "/images/goals/step1-option-4.png",
  },
];

export function Step1UnitDuration({ value, onChange, onNext, onCancel }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/images/goals/step1-illust.png"
          alt=""
          className="h-28 w-auto"
          aria-hidden="true"
        />
        <h2 className="text-2xl font-bold text-emerald-900">1ユニットの時間を選んでください</h2>
        <p className="text-sm text-muted-foreground">
          あなたのペースに合わせて、今週のリズムを決めましょう。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const isSelected = value === option.minutes;
          return (
            <button
              key={option.minutes}
              type="button"
              onClick={() => onChange(option.minutes)}
              className={`group relative flex w-full items-center gap-4 rounded-2xl border bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                isSelected ? "border-emerald-400 bg-emerald-50" : "border-transparent"
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                <img src={option.icon} alt="" className="h-10 w-10" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold text-emerald-900">{option.title}</span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-400 text-white"
                    : "border-muted bg-white text-muted-foreground"
                }`}
              >
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={onNext} disabled={value === null}>
          次へ →
        </Button>
      </div>
    </div>
  );
}

import type { DailyTargets } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import type { GoalTask } from "./types";

const dayLabels = [
  { key: "monday", label: "月" },
  { key: "tuesday", label: "火" },
  { key: "wednesday", label: "水" },
  { key: "thursday", label: "木" },
  { key: "friday", label: "金" },
  { key: "saturday", label: "土" },
  { key: "sunday", label: "日" },
] as const;

type Step4Props = {
  unitDurationMinutes: number;
  tasks: GoalTask[];
  weeklyTargets: Record<string, DailyTargets>;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
};

export function Step4Confirmation({
  unitDurationMinutes,
  tasks,
  weeklyTargets,
  onSave,
  onBack,
  isSaving,
  errorMessage,
}: Step4Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-emerald-900">設定内容を確認</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ここまでの内容でよければ保存してください。
        </p>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">1ユニットの時間</p>
          <p className="text-lg font-semibold text-emerald-900">{unitDurationMinutes}分</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-2 text-left">タスク</th>
                {dayLabels.map((day) => (
                  <th key={day.key} className="px-2 py-2 text-center">
                    {day.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-center">合計</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const targets = weeklyTargets[task.id];
                const total = dayLabels.reduce((sum, day) => sum + (targets?.[day.key] ?? 0), 0);
                return (
                  <tr key={task.id} className="border-t border-dashed border-emerald-100">
                    <td className="px-2 py-3 font-semibold text-emerald-900">{task.name}</td>
                    {dayLabels.map((day) => (
                      <td key={day.key} className="px-2 py-3 text-center">
                        {(targets?.[day.key] ?? 0).toFixed(1)}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center font-semibold">{total.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}

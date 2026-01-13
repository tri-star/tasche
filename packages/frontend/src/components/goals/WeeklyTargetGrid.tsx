import type { DailyTargets } from "@/api/generated/model";
import type { GoalTask } from "./types";

const days = [
  { key: "monday", label: "月" },
  { key: "tuesday", label: "火" },
  { key: "wednesday", label: "水" },
  { key: "thursday", label: "木" },
  { key: "friday", label: "金" },
  { key: "saturday", label: "土" },
  { key: "sunday", label: "日" },
] as const;

type DayKey = (typeof days)[number]["key"];

type WeeklyTargetGridProps = {
  tasks: GoalTask[];
  weeklyTargets: Record<string, DailyTargets>;
  onUpdateTargets: (taskId: string, targets: DailyTargets) => void;
};

export function WeeklyTargetGrid({ tasks, weeklyTargets, onUpdateTargets }: WeeklyTargetGridProps) {
  const totalsByDay = days.reduce(
    (acc, day) => {
      acc[day.key] = tasks.reduce((sum, task) => sum + (weeklyTargets[task.id]?.[day.key] ?? 0), 0);
      return acc;
    },
    {} as Record<DayKey, number>,
  );

  return (
    <div className="overflow-x-auto rounded-3xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
      <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-2 text-left">タスク</th>
            {days.map((day) => (
              <th key={day.key} className="px-2 text-center font-semibold">
                {day.label}
              </th>
            ))}
            <th className="px-2 text-center">合計</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const targets = weeklyTargets[task.id];
            const rowTotal = days.reduce((sum, day) => sum + (targets?.[day.key] ?? 0), 0);
            return (
              <tr key={task.id} className="rounded-2xl bg-amber-50/40">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/dashboard/task-icon.png"
                      alt=""
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-emerald-900">{task.name}</span>
                  </div>
                </td>
                {days.map((day) => (
                  <td key={day.key} className="px-2 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={targets?.[day.key] ?? 0}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        onUpdateTargets(task.id, {
                          ...(targets ?? {
                            monday: 0,
                            tuesday: 0,
                            wednesday: 0,
                            thursday: 0,
                            friday: 0,
                            saturday: 0,
                            sunday: 0,
                          }),
                          [day.key]: Number.isFinite(nextValue) ? nextValue : 0,
                        });
                      }}
                      className="w-16 rounded-lg border border-emerald-100 bg-white px-2 py-1 text-center text-sm focus:border-emerald-300 focus:outline-none"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-semibold text-emerald-800">
                  {rowTotal.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-emerald-50/80 font-semibold text-emerald-900">
            <td className="px-2 py-3">合計</td>
            {days.map((day) => (
              <td key={day.key} className="px-2 py-3 text-center">
                {totalsByDay[day.key].toFixed(1)}
              </td>
            ))}
            <td className="px-2 py-3 text-center">
              {days.reduce((sum, day) => sum + totalsByDay[day.key], 0).toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

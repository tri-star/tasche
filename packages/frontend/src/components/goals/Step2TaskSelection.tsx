import { Plus } from "lucide-react";
import { useState } from "react";
import type { TaskResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { TaskItem } from "./TaskItem";
import type { NewTask } from "./types";

type Step2Props = {
  tasks: TaskResponse[];
  selectedTaskIds: string[];
  newTasks: NewTask[];
  onToggleTask: (taskId: string) => void;
  onAddNewTask: (name: string) => void;
  onEditTask: (taskId: string, newName: string) => void;
  onDeleteTask: (taskId: string) => void;
  onNext: () => void;
  onBack: () => void;
};

export function Step2TaskSelection({
  tasks,
  selectedTaskIds,
  newTasks,
  onToggleTask,
  onAddNewTask,
  onEditTask,
  onDeleteTask,
  onNext,
  onBack,
}: Step2Props) {
  const [newTaskName, setNewTaskName] = useState("");

  const hasSelection = selectedTaskIds.length > 0;

  const handleAdd = () => {
    const trimmed = newTaskName.trim();
    if (!trimmed) {
      return;
    }
    onAddNewTask(trimmed);
    setNewTaskName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/images/goals/step-2-illust.png"
          alt=""
          className="h-28 w-auto"
          aria-hidden="true"
        />
        <h2 className="text-2xl font-bold text-emerald-900">今週取り組むタスクを選んでください</h2>
        <p className="text-sm text-muted-foreground">気になることから、ゆるっと選んで大丈夫。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            id={task.id}
            name={task.name}
            isSelected={selectedTaskIds.includes(task.id)}
            onToggle={() => onToggleTask(task.id)}
            onEdit={(newName) => onEditTask(task.id, newName)}
            onDelete={() => onDeleteTask(task.id)}
          />
        ))}
        {newTasks.map((task) => (
          <TaskItem
            key={task.tempId}
            id={task.tempId}
            name={task.name}
            isSelected={selectedTaskIds.includes(task.tempId)}
            isNew
            onToggle={() => onToggleTask(task.tempId)}
            onEdit={(newName) => onEditTask(task.tempId, newName)}
            onDelete={() => onDeleteTask(task.tempId)}
          />
        ))}
        <div className="flex flex-col justify-between rounded-2xl border-2 border-dashed border-emerald-200 bg-white/70 p-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-semibold">新しいタスクを追加</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">ひとつずつ増やしていきましょう。</p>
          </div>
          <div className="mt-4 space-y-2">
            <input
              value={newTaskName}
              onChange={(event) => setNewTaskName(event.target.value)}
              placeholder="例: ストレッチ"
              className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none"
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleAdd}
              disabled={!newTaskName.trim()}
            >
              追加する
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onNext} disabled={!hasSelection}>
          次へ →
        </Button>
      </div>
    </div>
  );
}

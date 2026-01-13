import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type GoalSettingFabProps = {
  onClick?: () => void;
};

export function GoalSettingFab({ onClick }: GoalSettingFabProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-12 gap-2 rounded-full bg-primary px-5 shadow-lg hover:bg-primary/90"
    >
      <Plus className="h-5 w-5" />
      <span>目標設定</span>
    </Button>
  );
}

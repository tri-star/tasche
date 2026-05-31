import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type GoalSettingFabProps = {
  onClick?: () => void
}

export function GoalSettingFab({ onClick }: GoalSettingFabProps) {
  return (
    <Button
      onClick={onClick}
      aria-label="目標設定"
      className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 h-11 gap-2 rounded-full bg-primary px-4 shadow-lg hover:bg-primary/90 md:bottom-6 md:right-6 md:h-12 md:px-5"
    >
      <Plus className="h-5 w-5" />
      <span>目標設定</span>
    </Button>
  )
}

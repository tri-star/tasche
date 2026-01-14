import { useEffect, useMemo, useState } from "react"
import {
  deleteTaskApiTasksTaskIdDelete,
  getCurrentGoalsApiWeeksCurrentGoalsGet,
  getTasksApiTasksGet,
  updateCurrentGoalsApiWeeksCurrentGoalsPut,
  updateTaskApiTasksTaskIdPut,
} from "@/api/generated/client"
import type { DailyTargets, TaskResponse } from "@/api/generated/model"
import { Step1UnitDuration } from "./Step1UnitDuration"
import { Step2TaskSelection } from "./Step2TaskSelection"
import { Step3WeeklyTargets } from "./Step3WeeklyTargets"
import { Step4Confirmation } from "./Step4Confirmation"
import { StepIndicator } from "./StepIndicator"
import type { GoalTask, NewTask, WizardStep } from "./types"
import { createEmptyTargets } from "./types"

const steps = [
  { number: 1, label: "1. ユニット時間選択" },
  { number: 2, label: "2. タスク選択" },
  { number: 3, label: "3. 曜日別目標設定" },
  { number: 4, label: "4. 確認" },
]

const buildTargetsMap = (goals: { task_id: string; daily_targets: DailyTargets }[]) => {
  return goals.reduce<Record<string, DailyTargets>>((acc, goal) => {
    acc[goal.task_id] = goal.daily_targets
    return acc
  }, {})
}

export function GoalWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [unitDurationMinutes, setUnitDurationMinutes] = useState<number | null>(null)
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [newTasks, setNewTasks] = useState<NewTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, DailyTargets>>({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchInitialData() {
      setLoading(true)
      setErrorMessage(null)

      try {
        const [tasksResponse, goalsResponse] = await Promise.all([
          getTasksApiTasksGet(),
          getCurrentGoalsApiWeeksCurrentGoalsGet(),
        ])

        const fetchedTasks = tasksResponse.status === 200 ? tasksResponse.data.data.tasks : []
        const filteredTasks = fetchedTasks.filter((task) => !task.is_archived)

        if (goalsResponse.status === 200) {
          const goalsData = goalsResponse.data.data
          const taskMap = new Map(filteredTasks.map((task) => [task.id, task]))
          goalsData.goals.forEach((goal) => {
            if (!taskMap.has(goal.task_id)) {
              taskMap.set(goal.task_id, {
                id: goal.task_id,
                name: goal.task_name,
                is_archived: false,
                created_at: "",
                updated_at: "",
              })
            }
          })

          if (isMounted) {
            setTasks(Array.from(taskMap.values()))
            setUnitDurationMinutes(goalsData.unit_duration_minutes)
            setSelectedTaskIds(goalsData.goals.map((goal) => goal.task_id))
            setWeeklyTargets(buildTargetsMap(goalsData.goals))
          }
        } else if (isMounted) {
          setTasks(filteredTasks)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setErrorMessage("データの取得に失敗しました。")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  const taskLookup = useMemo(() => {
    const lookup = new Map<string, GoalTask>()
    for (const task of tasks) {
      lookup.set(task.id, { id: task.id, name: task.name })
    }
    for (const task of newTasks) {
      lookup.set(task.tempId, { id: task.tempId, name: task.name, isNew: true })
    }
    return lookup
  }, [tasks, newTasks])

  const selectedTasks = useMemo(() => {
    return selectedTaskIds
      .map((id) => taskLookup.get(id))
      .filter((task): task is GoalTask => Boolean(task))
  }, [selectedTaskIds, taskLookup])

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId)
      }
      return [...prev, taskId]
    })
    setWeeklyTargets((prev) => {
      if (prev[taskId]) {
        return prev
      }
      return { ...prev, [taskId]: createEmptyTargets() }
    })
  }

  const handleAddNewTask = (name: string) => {
    const tempId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setNewTasks((prev) => [...prev, { tempId, name }])
    setSelectedTaskIds((prev) => [...prev, tempId])
    setWeeklyTargets((prev) => ({ ...prev, [tempId]: createEmptyTargets() }))
  }

  const handleEditTask = async (taskId: string, newName: string) => {
    const isNew = newTasks.some((task) => task.tempId === taskId)

    if (isNew) {
      setNewTasks((prev) =>
        prev.map((task) => (task.tempId === taskId ? { ...task, name: newName } : task)),
      )
      return
    }

    try {
      await updateTaskApiTasksTaskIdPut(taskId, { name: newName })
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, name: newName } : task)),
      )
    } catch (error) {
      console.error("タスク名の更新に失敗しました", error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const isNew = newTasks.some((task) => task.tempId === taskId)

    if (isNew) {
      setNewTasks((prev) => prev.filter((task) => task.tempId !== taskId))
    } else {
      try {
        await deleteTaskApiTasksTaskIdDelete(taskId)
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
      } catch (error) {
        console.error("タスク削除に失敗しました", error)
        return
      }
    }

    setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId))
    setWeeklyTargets((prev) => {
      const nextTargets = { ...prev }
      delete nextTargets[taskId]
      return nextTargets
    })
  }

  const handleUpdateTargets = (taskId: string, targets: DailyTargets) => {
    setWeeklyTargets((prev) => ({ ...prev, [taskId]: targets }))
  }

  const handleSave = async () => {
    if (!unitDurationMinutes) {
      setErrorMessage("ユニット時間を選択してください。")
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const payload = {
        unit_duration_minutes: unitDurationMinutes,
        goals: selectedTasks.map((task) => {
          const dailyTargets = weeklyTargets[task.id] ?? createEmptyTargets()
          if (task.isNew) {
            return {
              task_id: null,
              new_task_name: task.name,
              daily_targets: dailyTargets,
            }
          }
          return {
            task_id: task.id,
            daily_targets: dailyTargets,
          }
        }),
      }

      const response = await updateCurrentGoalsApiWeeksCurrentGoalsPut(payload)
      if (response.status === 200) {
        window.location.href = "/"
        return
      }
      setErrorMessage("保存に失敗しました。")
    } catch (error) {
      console.error(error)
      setErrorMessage("保存に失敗しました。")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (errorMessage && tasks.length === 0) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
        {errorMessage}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={currentStep} steps={steps} />

      <div className="rounded-[32px] border border-emerald-100 bg-white/90 p-6 shadow-md">
        {currentStep === 1 ? (
          <Step1UnitDuration
            value={unitDurationMinutes}
            onChange={setUnitDurationMinutes}
            onNext={() => setCurrentStep(2)}
            onCancel={() => {
              window.location.href = "/"
            }}
          />
        ) : null}

        {currentStep === 2 ? (
          <Step2TaskSelection
            tasks={tasks}
            selectedTaskIds={selectedTaskIds}
            newTasks={newTasks}
            onToggleTask={handleToggleTask}
            onAddNewTask={handleAddNewTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        ) : null}

        {currentStep === 3 ? (
          <Step3WeeklyTargets
            tasks={selectedTasks}
            weeklyTargets={weeklyTargets}
            onUpdateTargets={handleUpdateTargets}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        ) : null}

        {currentStep === 4 ? (
          <Step4Confirmation
            unitDurationMinutes={unitDurationMinutes ?? 0}
            tasks={selectedTasks}
            weeklyTargets={weeklyTargets}
            onSave={handleSave}
            onBack={() => setCurrentStep(3)}
            isSaving={isSaving}
            errorMessage={errorMessage}
          />
        ) : null}
      </div>
    </div>
  )
}

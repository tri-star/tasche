import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  deleteTaskApiTasksTaskIdDelete,
  getCurrentGoalsApiWeeksCurrentGoalsGet,
  getTasksApiTasksGet,
  updateCurrentGoalsApiWeeksCurrentGoalsPut,
  updateTaskApiTasksTaskIdPut,
} from "@/api/generated/client"
import type {
  DailyAvailableUnits,
  DailyTargets,
  DayOfWeek,
  TaskResponse,
} from "@/api/generated/model"
import { DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"
import { Step1UnitDuration } from "./Step1UnitDuration"
import { Step2AvailableUnits } from "./Step2AvailableUnits"
import { Step2TaskSelection } from "./Step2TaskSelection"
import { Step3WeeklyTargets } from "./Step3WeeklyTargets"
import { Step4Confirmation } from "./Step4Confirmation"
import { StepIndicator } from "./StepIndicator"
import type { GoalTask, NewTask, WizardStep } from "./types"
import { createEmptyDailyAvailableUnits, createEmptyTargets } from "./types"

const steps = [
  { number: 1, label: "ユニット時間選択" },
  { number: 2, label: "確保可能ユニット" },
  { number: 3, label: "タスク選択" },
  { number: 4, label: "曜日別目標設定" },
  { number: 5, label: "確認" },
]

const buildTargetsMap = (goals: { task_id: string; daily_targets: DailyTargets }[]) => {
  return goals.reduce<Record<string, DailyTargets>>((acc, goal) => {
    acc[goal.task_id] = goal.daily_targets
    return acc
  }, {})
}

const normalizeDailyAvailableUnits = (
  availableUnits?: DailyAvailableUnits,
): DailyAvailableUnits => {
  const emptyUnits = createEmptyDailyAvailableUnits()
  return DAYS_OF_WEEK_ORDER.reduce<DailyAvailableUnits>((acc, day) => {
    acc[day] = availableUnits?.[day] ?? emptyUnits[day]
    return acc
  }, emptyUnits)
}

export function GoalWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [unitDurationMinutes, setUnitDurationMinutes] = useState<number | null>(null)
  const [dailyAvailableUnits, setDailyAvailableUnits] = useState<DailyAvailableUnits>(
    createEmptyDailyAvailableUnits,
  )
  const [weekStartDate, setWeekStartDate] = useState("")
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [newTasks, setNewTasks] = useState<NewTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, DailyTargets>>({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUsingPreviousGoals, setIsUsingPreviousGoals] = useState(false)

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

        const fetchedTasks = tasksResponse.status === 200 ? tasksResponse.data.data.items : []
        const filteredTasks = fetchedTasks.filter((task) => !task.is_archived)

        if (goalsResponse.status === 200) {
          const goalsData = goalsResponse.data.data
          const hasCurrent = goalsData.has_current_goals

          const taskMap = new Map(filteredTasks.map((task) => [task.id, task]))

          if (hasCurrent) {
            goalsData.goals.forEach((goal) => {
              if (!taskMap.has(goal.task_id)) {
                taskMap.set(goal.task_id, {
                  id: goal.task_id,
                  name: goal.task_name,
                  is_archived: false,
                  consumed_units_last_week: 0,
                  consumed_units_total: 0,
                  created_at: "",
                  updated_at: "",
                })
              }
            })
          } else if (goalsData.previous_goals) {
            goalsData.previous_goals.goals.forEach((goal) => {
              if (!taskMap.has(goal.task_id)) {
                taskMap.set(goal.task_id, {
                  id: goal.task_id,
                  name: goal.task_name,
                  is_archived: false,
                  consumed_units_last_week: 0,
                  consumed_units_total: 0,
                  created_at: "",
                  updated_at: "",
                })
              }
            })
          }

          if (isMounted) {
            setTasks(Array.from(taskMap.values()))
            // weekStartDate は常に当週を使う（保存先は当週のため）
            setWeekStartDate(goalsData.week_start_date)

            if (hasCurrent) {
              setUnitDurationMinutes(goalsData.unit_duration_minutes)
              setDailyAvailableUnits(normalizeDailyAvailableUnits(goalsData.daily_available_units))
              setSelectedTaskIds(goalsData.goals.map((goal) => goal.task_id))
              setWeeklyTargets(buildTargetsMap(goalsData.goals))
            } else if (goalsData.previous_goals) {
              const prev = goalsData.previous_goals
              setUnitDurationMinutes(prev.unit_duration_minutes)
              setDailyAvailableUnits(normalizeDailyAvailableUnits(prev.daily_available_units))
              setSelectedTaskIds(prev.goals.map((goal) => goal.task_id))
              setWeeklyTargets(buildTargetsMap(prev.goals))
              setIsUsingPreviousGoals(true)
            }
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
      lookup.set(task.tempId, {
        id: task.tempId,
        name: task.name,
        isNew: true,
      })
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

  const handleUpdateAvailableUnits = (day: DayOfWeek, value: number) => {
    setDailyAvailableUnits((prev) => ({ ...prev, [day]: value }))
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
        daily_available_units: dailyAvailableUnits,
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
        navigate("/")
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

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
        {errorMessage}
      </div>
    )
  }

  return (
    <section className="space-y-8" aria-label="目標設定ウィザード">
      <StepIndicator currentStep={currentStep} steps={steps} />

      {isUsingPreviousGoals && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          直近の目標設定をデフォルト値として読み込みました。内容を確認して保存してください。
        </div>
      )}

      <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-md">
        {currentStep === 1 ? (
          <Step1UnitDuration
            value={unitDurationMinutes}
            onChange={setUnitDurationMinutes}
            onNext={() => setCurrentStep(2)}
            onCancel={() => {
              navigate("/")
            }}
          />
        ) : null}

        {currentStep === 2 ? (
          <Step2AvailableUnits
            availableUnits={dailyAvailableUnits}
            unitDurationMinutes={unitDurationMinutes ?? 0}
            weekStartDate={weekStartDate}
            onChange={handleUpdateAvailableUnits}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        ) : null}

        {currentStep === 3 ? (
          <Step2TaskSelection
            tasks={tasks}
            selectedTaskIds={selectedTaskIds}
            newTasks={newTasks}
            onToggleTask={handleToggleTask}
            onAddNewTask={handleAddNewTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        ) : null}

        {currentStep === 4 ? (
          <Step3WeeklyTargets
            tasks={selectedTasks}
            weeklyTargets={weeklyTargets}
            dailyAvailableUnits={dailyAvailableUnits}
            onUpdateTargets={handleUpdateTargets}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        ) : null}

        {currentStep === 5 ? (
          <Step4Confirmation
            unitDurationMinutes={unitDurationMinutes ?? 0}
            dailyAvailableUnits={dailyAvailableUnits}
            tasks={selectedTasks}
            weeklyTargets={weeklyTargets}
            onSave={handleSave}
            onBack={() => setCurrentStep(4)}
            isSaving={isSaving}
            errorMessage={errorMessage}
          />
        ) : null}
      </div>
    </section>
  )
}

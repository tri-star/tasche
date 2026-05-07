import { ClipboardList, Loader2, Plus, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  createTaskApiTasksPost,
  deleteTaskApiTasksTaskIdDelete,
  getTasksApiTasksGet,
  updateTaskApiTasksTaskIdPut,
} from "@/api/generated/client"
import type { TaskResponse } from "@/api/generated/model"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { TaskDeleteDialog } from "@/components/tasks/TaskDeleteDialog"
import { TaskEmptyState } from "@/components/tasks/TaskEmptyState"
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog"
import { TaskTable } from "@/components/tasks/TaskTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type TaskDialogState = { mode: "create"; task: null } | { mode: "edit"; task: TaskResponse } | null

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formDialog, setFormDialog] = useState<TaskDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskResponse | null>(null)
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getTasksApiTasksGet({ include_archived: false })
      if (response.status !== 200) {
        setErrorMessage("タスク一覧の取得に失敗しました。")
        return
      }

      setTasks(response.data.data.tasks.filter((task) => !task.is_archived))
    } catch (error) {
      console.error(error)
      setErrorMessage("タスク一覧の取得に失敗しました。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  const handleCreate = async (name: string) => {
    setIsSubmitting(true)
    setFormErrorMessage(null)

    try {
      const response = await createTaskApiTasksPost({ name })
      if (response.status !== 201) {
        setFormErrorMessage("タスクの登録に失敗しました。")
        return
      }

      setTasks((prev) => [...prev, response.data.data])
      setFormDialog(null)
    } catch (error) {
      console.error(error)
      setFormErrorMessage("タスクの登録に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (taskId: string, name: string) => {
    setIsSubmitting(true)
    setFormErrorMessage(null)

    try {
      const response = await updateTaskApiTasksTaskIdPut(taskId, { name })
      if (response.status !== 200) {
        setFormErrorMessage("タスクの更新に失敗しました。")
        return
      }

      setTasks((prev) =>
        prev
          .map((task) => (task.id === taskId ? response.data.data : task))
          .filter((task) => !task.is_archived),
      )
      setFormDialog(null)
    } catch (error) {
      console.error(error)
      setFormErrorMessage("タスクの更新に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsSubmitting(true)
    setDeleteErrorMessage(null)

    try {
      const response = await deleteTaskApiTasksTaskIdDelete(deleteTarget.id)
      if (response.status !== 200) {
        setDeleteErrorMessage("削除に失敗しました。時間をおいて再度お試しください。")
        return
      }

      setTasks((prev) => prev.filter((task) => task.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (error) {
      console.error(error)
      setDeleteErrorMessage("削除に失敗しました。時間をおいて再度お試しください。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    setFormErrorMessage(null)
    setFormDialog({ mode: "create", task: null })
  }

  const openEditDialog = (task: TaskResponse) => {
    setFormErrorMessage(null)
    setFormDialog({ mode: "edit", task })
  }

  const openDeleteDialog = (task: TaskResponse) => {
    setDeleteErrorMessage(null)
    setDeleteTarget(task)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-emerald-950">
                  タスク一覧
                </h1>
                <p className="text-sm text-muted-foreground">
                  登録したタスクを一覧で確認・管理できます。
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchTasks()}
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? "animate-spin" : undefined} />
              再読み込み
            </Button>
            <Button type="button" onClick={openCreateDialog}>
              <Plus />
              タスクを追加
            </Button>
          </div>
        </div>

        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p>読み込み中...</p>
              </div>
            ) : null}

            {!isLoading && errorMessage ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/70 px-6 py-10 text-center">
                <p className="text-sm text-rose-700">{errorMessage}</p>
                <Button type="button" variant="secondary" onClick={() => void fetchTasks()}>
                  <RefreshCw />
                  再読み込み
                </Button>
              </div>
            ) : null}

            {!isLoading && !errorMessage && tasks.length === 0 ? (
              <TaskEmptyState onCreate={openCreateDialog} />
            ) : null}

            {!isLoading && !errorMessage && tasks.length > 0 ? (
              <TaskTable
                tasks={tasks}
                disabled={isSubmitting}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        open={formDialog !== null}
        mode={formDialog?.mode ?? "create"}
        task={formDialog?.task ?? null}
        isSubmitting={isSubmitting}
        errorMessage={formErrorMessage}
        onClose={() => {
          if (isSubmitting) {
            return
          }
          setFormDialog(null)
          setFormErrorMessage(null)
        }}
        onSubmit={(name) =>
          formDialog?.mode === "edit" && formDialog.task
            ? handleUpdate(formDialog.task.id, name)
            : handleCreate(name)
        }
      />

      <TaskDeleteDialog
        open={deleteTarget !== null}
        task={deleteTarget}
        isSubmitting={isSubmitting}
        errorMessage={deleteErrorMessage}
        onClose={() => {
          if (isSubmitting) {
            return
          }
          setDeleteTarget(null)
          setDeleteErrorMessage(null)
        }}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  )
}

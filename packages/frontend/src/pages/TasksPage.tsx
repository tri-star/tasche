import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardList, Loader2, Plus, RefreshCw } from "lucide-react"
import { useState } from "react"
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
const tasksQueryKey = ["tasks", { includeArchived: false }] as const

function logTaskPageError(message: string, error: unknown) {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test") {
    return
  }

  console.error(message, error)
}

async function fetchTasks() {
  try {
    const response = await getTasksApiTasksGet({ include_archived: false })
    if (response.status !== 200) {
      throw new Error(`Unexpected status: ${response.status}`)
    }

    return response.data.data.tasks.filter((task) => !task.is_archived)
  } catch (error) {
    logTaskPageError("タスク一覧の取得に失敗しました", error)
    throw error
  }
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const [formDialog, setFormDialog] = useState<TaskDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskResponse | null>(null)
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)

  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: fetchTasks,
  })

  const createTaskMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await createTaskApiTasksPost({ name })
      if (response.status !== 201) {
        throw new Error(`Unexpected status: ${response.status}`)
      }
      return response.data.data
    },
    onSuccess: (createdTask) => {
      queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (previous = []) => [
        ...previous,
        createdTask,
      ])
      setFormDialog(null)
      setFormErrorMessage(null)
    },
    onError: (error) => {
      logTaskPageError("タスクの登録に失敗しました", error)
      setFormErrorMessage("タスクの登録に失敗しました。")
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, name }: { taskId: string; name: string }) => {
      const response = await updateTaskApiTasksTaskIdPut(taskId, { name })
      if (response.status !== 200) {
        throw new Error(`Unexpected status: ${response.status}`)
      }
      return response.data.data
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (previous = []) =>
        previous
          .map((task) => (task.id === updatedTask.id ? updatedTask : task))
          .filter((task) => !task.is_archived),
      )
      setFormDialog(null)
      setFormErrorMessage(null)
    },
    onError: (error) => {
      logTaskPageError("タスクの更新に失敗しました", error)
      setFormErrorMessage("タスクの更新に失敗しました。")
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await deleteTaskApiTasksTaskIdDelete(taskId)
      if (response.status !== 200) {
        throw new Error(`Unexpected status: ${response.status}`)
      }
      return taskId
    },
    onSuccess: (taskId) => {
      queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (previous = []) =>
        previous.filter((task) => task.id !== taskId),
      )
      setDeleteTarget(null)
      setDeleteErrorMessage(null)
    },
    onError: (error) => {
      logTaskPageError("タスクの削除に失敗しました", error)
      setDeleteErrorMessage("削除に失敗しました。時間をおいて再度お試しください。")
    },
  })

  const isSubmitting =
    createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending
  const tasks = tasksQuery.data ?? []
  const errorMessage = tasksQuery.isError ? "タスク一覧の取得に失敗しました。" : null

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

  const handleRefresh = () => {
    void tasksQuery.refetch()
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
              onClick={handleRefresh}
              disabled={tasksQuery.isFetching}
            >
              <RefreshCw className={tasksQuery.isFetching ? "animate-spin" : undefined} />
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
            {tasksQuery.isPending ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p>読み込み中...</p>
              </div>
            ) : null}

            {!tasksQuery.isPending && errorMessage ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/70 px-6 py-10 text-center">
                <p className="text-sm text-rose-700">{errorMessage}</p>
                <Button type="button" variant="secondary" onClick={handleRefresh}>
                  <RefreshCw />
                  再読み込み
                </Button>
              </div>
            ) : null}

            {!tasksQuery.isPending && !errorMessage && tasks.length === 0 ? (
              <TaskEmptyState onCreate={openCreateDialog} />
            ) : null}

            {!tasksQuery.isPending && !errorMessage && tasks.length > 0 ? (
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
            ? updateTaskMutation.mutate({ taskId: formDialog.task.id, name })
            : createTaskMutation.mutate(name)
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
        onConfirm={() =>
          deleteTarget ? deleteTaskMutation.mutate(deleteTarget.id) : Promise.resolve()
        }
      />
    </DashboardLayout>
  )
}

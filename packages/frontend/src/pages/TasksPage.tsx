import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardList, Loader2, Plus, RefreshCw } from "lucide-react"
import { useState } from "react"
import {
  bulkArchiveTasksApiTasksDelete,
  createTaskApiTasksPost,
  deleteTaskApiTasksTaskIdDelete,
  getTasksApiTasksGet,
  updateTaskApiTasksTaskIdPut,
} from "@/api/generated/client"
import type { TaskListResponse, TaskResponse } from "@/api/generated/model"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import type { TaskBulkAction } from "@/components/tasks/TaskBulkActionBar"
import { TaskBulkActionBar } from "@/components/tasks/TaskBulkActionBar"
import { TaskBulkDeleteDialog } from "@/components/tasks/TaskBulkDeleteDialog"
import { TaskDeleteDialog } from "@/components/tasks/TaskDeleteDialog"
import { TaskEmptyState } from "@/components/tasks/TaskEmptyState"
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog"
import { TaskListPagination } from "@/components/tasks/TaskListPagination"
import { TaskTable } from "@/components/tasks/TaskTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTaskSelection } from "@/hooks/useTaskSelection"

type TaskDialogState = { mode: "create"; task: null } | { mode: "edit"; task: TaskResponse } | null

const PER_PAGE = 20

function logTaskPageError(message: string, error: unknown) {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test") {
    return
  }

  console.error(message, error)
}

async function fetchTasks(page: number, perPage: number): Promise<TaskListResponse> {
  try {
    const response = await getTasksApiTasksGet({
      include_archived: false,
      page,
      per_page: perPage,
    })
    if (response.status !== 200) {
      throw new Error(`Unexpected status: ${response.status}`)
    }

    return response.data.data
  } catch (error) {
    logTaskPageError("タスク一覧の取得に失敗しました", error)
    throw error
  }
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [formDialog, setFormDialog] = useState<TaskDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskResponse | null>(null)
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteErrorMessage, setBulkDeleteErrorMessage] = useState<string | null>(null)

  const tasksQueryKey = ["tasks", { includeArchived: false, page, perPage: PER_PAGE }] as const

  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => fetchTasks(page, PER_PAGE),
    placeholderData: keepPreviousData,
  })

  const tasks = tasksQuery.data?.items ?? []
  const total = tasksQuery.data?.total ?? 0

  const selectionApi = useTaskSelection({ pageItems: tasks })

  const createTaskMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await createTaskApiTasksPost({ name })
      if (response.status !== 201) {
        throw new Error(`Unexpected status: ${response.status}`)
      }
      return response.data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setFormDialog(null)
      setFormErrorMessage(null)
      selectionApi.clear()
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setFormDialog(null)
      setFormErrorMessage(null)
      selectionApi.clear()
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setDeleteTarget(null)
      setDeleteErrorMessage(null)
      selectionApi.clear()
    },
    onError: (error) => {
      logTaskPageError("タスクの削除に失敗しました", error)
      setDeleteErrorMessage("削除に失敗しました。時間をおいて再度お試しください。")
    },
  })

  const bulkDeleteTaskMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await bulkArchiveTasksApiTasksDelete({ ids })
      if (response.status !== 200) {
        throw new Error(`Unexpected status: ${response.status}`)
      }
      return response.data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setBulkDeleteDialogOpen(false)
      setBulkDeleteErrorMessage(null)
      selectionApi.clear()
    },
    onError: (error) => {
      logTaskPageError("タスクのバルク削除に失敗しました", error)
      setBulkDeleteErrorMessage(
        "一部のタスクの削除に失敗しました。再読み込みして確認してください。",
      )
    },
  })

  const isSubmitting =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    bulkDeleteTaskMutation.isPending

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
    selectionApi.clear()
    void tasksQuery.refetch()
  }

  const handlePageChange = (nextPage: number) => {
    selectionApi.clear()
    setPage(nextPage)
  }

  const handleBulkAction = (action: TaskBulkAction) => {
    if (action === "delete") {
      setBulkDeleteErrorMessage(null)
      setBulkDeleteDialogOpen(true)
    }
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
              <div className="space-y-4">
                <TaskBulkActionBar
                  selectedCount={selectionApi.selectedCount}
                  disabled={isSubmitting}
                  onSelectAction={handleBulkAction}
                />
                <div
                  className={tasksQuery.isFetching ? "pointer-events-none opacity-60" : undefined}
                >
                  <TaskTable
                    tasks={tasks}
                    disabled={isSubmitting}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                    selectedIds={selectionApi.selectedIds}
                    onToggleOne={selectionApi.toggleOne}
                    onToggleAll={selectionApi.toggleAllOnPage}
                    allSelectedOnPage={selectionApi.allSelectedOnPage}
                    someSelectedOnPage={selectionApi.someSelectedOnPage}
                  />
                </div>
                <TaskListPagination
                  page={page}
                  perPage={PER_PAGE}
                  total={total}
                  onPageChange={handlePageChange}
                  disabled={isSubmitting || tasksQuery.isFetching}
                />
              </div>
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

      <TaskBulkDeleteDialog
        open={bulkDeleteDialogOpen}
        selectedCount={selectionApi.selectedCount}
        isSubmitting={isSubmitting}
        errorMessage={bulkDeleteErrorMessage}
        onClose={() => {
          if (isSubmitting) {
            return
          }
          setBulkDeleteDialogOpen(false)
          setBulkDeleteErrorMessage(null)
        }}
        onConfirm={() => bulkDeleteTaskMutation.mutate(Array.from(selectionApi.selectedIds))}
      />
    </DashboardLayout>
  )
}

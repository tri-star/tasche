import { HttpResponse, http } from "msw"
import type {
  APIResponseGoalsResponse,
  APIResponseGoalsUpdateResponse,
  APIResponseTaskListResponse,
  GoalsUpdate,
  GoalUpdateItem,
  TaskCreate,
  TaskUpdate,
} from "@/api/generated/model"

const mockTasks: APIResponseTaskListResponse = {
  data: {
    tasks: [
      {
        id: "tsk_01HXYZ1234567890ABCDEF",
        name: "英語学習",
        is_archived: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-05T00:00:00Z",
      },
      {
        id: "tsk_02HXYZ1234567890ABCDEF",
        name: "個人開発",
        is_archived: false,
        created_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-06T00:00:00Z",
      },
      {
        id: "tsk_03HXYZ1234567890ABCDEF",
        name: "読書",
        is_archived: false,
        created_at: "2026-01-03T00:00:00Z",
        updated_at: "2026-01-07T00:00:00Z",
      },
      {
        id: "tsk_04HXYZ1234567890ABCDEF",
        name: "筋トレ",
        is_archived: false,
        created_at: "2026-01-04T00:00:00Z",
        updated_at: "2026-01-08T00:00:00Z",
      },
      {
        id: "tsk_05HXYZ1234567890ABCDEF",
        name: "ブログ執筆",
        is_archived: false,
        created_at: "2026-01-05T00:00:00Z",
        updated_at: "2026-01-09T00:00:00Z",
      },
    ],
  },
}

const mockGoals: APIResponseGoalsResponse = {
  data: {
    week_id: "wk_01HXYZ1234567890ABCDEF",
    unit_duration_minutes: 30,
    goals: [],
  },
}

export const goalsHandlers = [
  http.get("*/api/tasks", () => HttpResponse.json(mockTasks)),
  http.post("*/api/tasks", async ({ request }) => {
    const body = (await request.json()) as TaskCreate
    return HttpResponse.json(
      {
        data: {
          id: `tsk_${Date.now()}`,
          name: body.name ?? "新しいタスク",
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  }),
  http.put("*/api/tasks/:taskId", async ({ request, params }) => {
    const body = (await request.json()) as TaskUpdate
    return HttpResponse.json({
      data: {
        id: params.taskId,
        name: body.name ?? "更新タスク",
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  }),
  http.delete("*/api/tasks/:taskId", ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.taskId,
        name: "deleted",
        is_archived: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  }),
  http.get("*/api/weeks/current/goals", () => HttpResponse.json(mockGoals)),
  http.put("*/api/weeks/current/goals", async ({ request }) => {
    const body = (await request.json()) as GoalsUpdate
    const response: APIResponseGoalsUpdateResponse = {
      data: {
        week_id: "wk_01HXYZ1234567890ABCDEF",
        unit_duration_minutes: body.unit_duration_minutes,
        goals: body.goals.map((goal: GoalUpdateItem, index: number) => ({
          task_id: goal.task_id ?? `tsk_new_${index}`,
          task_name: goal.new_task_name ?? `Task ${index + 1}`,
          daily_targets: goal.daily_targets,
        })),
        created_tasks: body.goals
          .filter((goal: GoalUpdateItem) => !goal.task_id)
          .map((goal: GoalUpdateItem, index: number) => ({
            id: `tsk_new_${index}`,
            name: goal.new_task_name ?? `Task ${index + 1}`,
          })),
      },
    }

    return HttpResponse.json(response)
  }),
]

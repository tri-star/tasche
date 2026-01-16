"""目標 API エンドポイント."""

from fastapi import APIRouter

from tasche.api.deps import CurrentUser
from tasche.schemas.common import APIResponse
from tasche.schemas.goal import (
    CreatedTask,
    DailyTargets,
    GoalResponse,
    GoalsResponse,
    GoalsUpdate,
    GoalsUpdateResponse,
)

router = APIRouter()


@router.get("", response_model=APIResponse[GoalsResponse])
async def get_current_goals(
    current_user: CurrentUser,
) -> APIResponse[GoalsResponse]:
    """今週の目標一覧を取得する."""
    # ダミーデータを返す
    goals = GoalsResponse(
        week_id="wk_01HXYZ1234567890ABCDEF",
        unit_duration_minutes=30,
        goals=[
            GoalResponse(
                task_id="tsk_01HXYZ1234567890ABCDEF",
                task_name="英語学習",
                daily_targets=DailyTargets(
                    monday=2.0,
                    tuesday=1.0,
                    wednesday=2.0,
                    thursday=1.0,
                    friday=2.0,
                    saturday=0,
                    sunday=0,
                ),
            ),
            GoalResponse(
                task_id="tsk_02HXYZ1234567890ABCDEF",
                task_name="個人開発",
                daily_targets=DailyTargets(
                    monday=2.0,
                    tuesday=2.0,
                    wednesday=0,
                    thursday=2.0,
                    friday=0,
                    saturday=4.0,
                    sunday=4.0,
                ),
            ),
        ],
    )
    return APIResponse(data=goals)


@router.put("", response_model=APIResponse[GoalsUpdateResponse])
async def update_current_goals(
    goals_update: GoalsUpdate, current_user: CurrentUser
) -> APIResponse[GoalsUpdateResponse]:
    """今週の目標を一括更新する."""
    # ダミーデータを返す
    response_goals = []
    created_tasks = []

    for goal_item in goals_update.goals:
        if goal_item.task_id is None and goal_item.new_task_name:
            # 新規タスク作成
            new_task_id = "tsk_NEW_CREATED_TASK"
            response_goals.append(
                GoalResponse(
                    task_id=new_task_id,
                    task_name=goal_item.new_task_name,
                    daily_targets=goal_item.daily_targets,
                )
            )
            created_tasks.append(CreatedTask(id=new_task_id, name=goal_item.new_task_name))
        elif goal_item.task_id:
            # 既存タスク
            response_goals.append(
                GoalResponse(
                    task_id=goal_item.task_id,
                    task_name=f"Task {goal_item.task_id}",
                    daily_targets=goal_item.daily_targets,
                )
            )

    update_response = GoalsUpdateResponse(
        week_id="wk_01HXYZ1234567890ABCDEF",
        unit_duration_minutes=goals_update.unit_duration_minutes,
        goals=response_goals,
        created_tasks=created_tasks,
    )
    return APIResponse(data=update_response)

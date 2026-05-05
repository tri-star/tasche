"""タスク API エンドポイント."""

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser, DbSession
from tasche.api.transaction import transaction
from tasche.schemas.common import APIResponse
from tasche.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from tasche.services import task as task_service

router = APIRouter()


def _build_task_response(task) -> TaskResponse:
    """Task モデルからレスポンスを組み立てる."""
    return TaskResponse.model_validate(task)


@router.get("", response_model=APIResponse[TaskListResponse])
async def get_tasks(
    db: DbSession,
    current_user: CurrentUser,
    include_archived: bool = Query(False, description="アーカイブ済みタスクを含める"),
) -> APIResponse[TaskListResponse]:
    """タスク一覧を取得する."""
    tasks = await task_service.get_tasks_by_user_id(
        db,
        user_id=current_user.id,
        include_archived=include_archived,
    )

    task_responses = [_build_task_response(task) for task in tasks]

    return APIResponse(data=TaskListResponse(tasks=task_responses))


@router.post("", response_model=APIResponse[TaskResponse], status_code=201)
async def create_task(
    task_create: TaskCreate, db: DbSession, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """新規タスクを作成する."""
    async with transaction(db):
        task = await task_service.create_task(db, current_user, task_create.name)
    return APIResponse(data=_build_task_response(task))


@router.put("/{task_id}", response_model=APIResponse[TaskResponse])
async def update_task(
    task_id: str, task_update: TaskUpdate, db: DbSession, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """既存タスクを更新する."""
    async with transaction(db):
        task = await task_service.update_task(
            db,
            current_user,
            task_id,
            task_update.name,
        )
    return APIResponse(data=_build_task_response(task))


@router.delete("/{task_id}", response_model=APIResponse[TaskResponse])
async def delete_task(
    task_id: str, db: DbSession, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """タスクを削除（アーカイブ）する."""
    async with transaction(db):
        task = await task_service.archive_task(db, current_user, task_id)
    return APIResponse(data=_build_task_response(task))

"""タスク API エンドポイント."""

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser, DbSession
from tasche.api.transaction import transaction
from tasche.models.task import Task
from tasche.schemas.common import APIResponse
from tasche.schemas.task import (
    TaskBulkArchiveRequest,
    TaskBulkArchiveResponse,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from tasche.services import task as task_service

router = APIRouter()


@router.get("", response_model=APIResponse[TaskListResponse])
async def get_tasks(
    db: DbSession,
    current_user: CurrentUser,
    include_archived: bool = Query(False, description="アーカイブ済みタスクを含める"),
    page: int = Query(1, ge=1, le=10000, description="ページ番号（1-indexed）"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたり件数（最大100）"),
) -> APIResponse[TaskListResponse]:
    """タスク一覧を取得する."""
    rows, total = await task_service.get_tasks_with_stats(
        db,
        current_user,
        include_archived=include_archived,
        page=page,
        per_page=per_page,
    )

    items = [
        _task_to_response(task, consumed_units_last_week=last_week, consumed_units_total=total_units)
        for task, last_week, total_units in rows
    ]

    return APIResponse(
        data=TaskListResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
        )
    )


@router.delete("", response_model=APIResponse[TaskBulkArchiveResponse])
async def bulk_archive_tasks(
    request: TaskBulkArchiveRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> APIResponse[TaskBulkArchiveResponse]:
    """複数タスクをまとめてアーカイブする."""
    async with transaction(db):
        archived_ids, not_found_ids = await task_service.archive_tasks(
            db, current_user, request.ids
        )
    return APIResponse(
        data=TaskBulkArchiveResponse(
            archived_ids=archived_ids,
            not_found_ids=not_found_ids,
        )
    )


def _task_to_response(
    task: Task, *, consumed_units_last_week: float = 0.0, consumed_units_total: float = 0.0
) -> TaskResponse:
    """TaskモデルをTaskResponseに変換する."""
    return TaskResponse(
        id=task.id,
        name=task.name,
        is_archived=task.is_archived,
        consumed_units_last_week=consumed_units_last_week,
        consumed_units_total=consumed_units_total,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.post("", response_model=APIResponse[TaskResponse], status_code=201)
async def create_task(
    task_create: TaskCreate, db: DbSession, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """新規タスクを作成する."""
    async with transaction(db):
        task = await task_service.create_task(db, current_user, task_create.name)
    return APIResponse(data=_task_to_response(task))


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
    return APIResponse(data=_task_to_response(task))


@router.delete("/{task_id}", response_model=APIResponse[TaskResponse])
async def delete_task(
    task_id: str, db: DbSession, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """タスクを削除（アーカイブ）する."""
    async with transaction(db):
        task = await task_service.archive_task(db, current_user, task_id)
    return APIResponse(data=_task_to_response(task))

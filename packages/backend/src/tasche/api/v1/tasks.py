"""タスク API エンドポイント."""

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser
from tasche.schemas.common import APIResponse
from tasche.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)

router = APIRouter()


@router.get("", response_model=APIResponse[TaskListResponse])
async def get_tasks(
    current_user: CurrentUser,
    include_archived: bool = Query(False, description="アーカイブ済みタスクを含める"),
) -> APIResponse[TaskListResponse]:
    """タスク一覧を取得する."""
    # ダミーデータを返す
    tasks = [
        TaskResponse(
            id="tsk_01HXYZ1234567890ABCDEF",
            name="英語学習",
            is_archived=False,
            created_at=datetime(2024, 1, 10, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 10, 9, 0, 0, tzinfo=timezone.utc),
        ),
        TaskResponse(
            id="tsk_02HXYZ1234567890ABCDEF",
            name="個人開発",
            is_archived=False,
            created_at=datetime(2024, 1, 10, 9, 5, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 10, 9, 5, 0, tzinfo=timezone.utc),
        ),
        TaskResponse(
            id="tsk_03HXYZ1234567890ABCDEF",
            name="読書",
            is_archived=False,
            created_at=datetime(2024, 1, 10, 9, 10, 0, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 10, 9, 10, 0, tzinfo=timezone.utc),
        ),
    ]

    if include_archived:
        tasks.append(
            TaskResponse(
                id="tsk_04HXYZ1234567890ABCDEF",
                name="アーカイブ済みタスク",
                is_archived=True,
                created_at=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
                updated_at=datetime(2024, 1, 5, 0, 0, 0, tzinfo=timezone.utc),
            )
        )

    return APIResponse(data=TaskListResponse(tasks=tasks))


@router.post("", response_model=APIResponse[TaskResponse], status_code=201)
async def create_task(
    task_create: TaskCreate, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """新規タスクを作成する."""
    # ダミーデータを返す
    new_task = TaskResponse(
        id="tsk_05HXYZ1234567890ABCDEF",
        name=task_create.name,
        is_archived=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return APIResponse(data=new_task)


@router.put("/{task_id}", response_model=APIResponse[TaskResponse])
async def update_task(
    task_id: str, task_update: TaskUpdate, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """既存タスクを更新する."""
    # ダミーデータを返す
    updated_task = TaskResponse(
        id=task_id,
        name=task_update.name,
        is_archived=False,
        created_at=datetime(2024, 1, 10, 9, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return APIResponse(data=updated_task)


@router.delete("/{task_id}", response_model=APIResponse[TaskResponse])
async def delete_task(
    task_id: str, current_user: CurrentUser
) -> APIResponse[TaskResponse]:
    """タスクを削除（アーカイブ）する."""
    # ダミーデータを返す
    archived_task = TaskResponse(
        id=task_id,
        name="アーカイブされたタスク",
        is_archived=True,
        created_at=datetime(2024, 1, 10, 9, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return APIResponse(data=archived_task)

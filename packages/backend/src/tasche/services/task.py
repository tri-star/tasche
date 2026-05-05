"""タスクサービス."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.exceptions import TaskNotFoundException, ValidationError
from tasche.models.task import Task
from tasche.models.user import User

TASK_NAME_MAX_LENGTH = 100


def _generate_task_id() -> str:
    """ULID 形式のタスクIDを生成する（tsk_ プレフィックス付き）."""
    return f"tsk_{ULID()}"


def _normalize_task_name(name: str) -> str:
    """タスク名を正規化する."""
    normalized_name = name.strip()
    if not normalized_name:
        raise ValidationError("task name must not be blank")
    if len(normalized_name) > TASK_NAME_MAX_LENGTH:
        raise ValidationError("task name must be 100 characters or fewer")
    return normalized_name


async def _get_active_task_for_user(db: AsyncSession, user: User, task_id: str) -> Task:
    """認証ユーザー所有のアーカイブされていないタスクを取得する."""
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == user.id,
            Task.is_archived.is_(False),
        )
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise TaskNotFoundException(task_id)
    return task


async def get_tasks_by_user(
    db: AsyncSession,
    user: User,
    include_archived: bool = False,
) -> list[Task]:
    """ユーザーのタスク一覧を取得.

    Args:
        db: DBセッション
        user: ユーザー
        include_archived: アーカイブ済みタスクを含めるか

    Returns:
        タスクのリスト（作成日時昇順）
    """
    query = select(Task).where(Task.user_id == user.id)

    if not include_archived:
        query = query.where(Task.is_archived.is_(False))

    query = query.order_by(Task.created_at)

    result = await db.execute(query)
    return list(result.scalars().all())


async def create_task(db: AsyncSession, user: User, name: str) -> Task:
    """タスクを新規作成する."""
    task = Task(
        id=_generate_task_id(),
        user_id=user.id,
        name=_normalize_task_name(name),
        is_archived=False,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, user: User, task_id: str, name: str) -> Task:
    """タスク名を更新する."""
    task = await _get_active_task_for_user(db, user, task_id)
    task.name = _normalize_task_name(name)
    await db.flush()
    await db.refresh(task)
    return task


async def archive_task(db: AsyncSession, user: User, task_id: str) -> Task:
    """タスクをアーカイブする."""
    task = await _get_active_task_for_user(db, user, task_id)
    task.is_archived = True
    await db.flush()
    await db.refresh(task)
    return task

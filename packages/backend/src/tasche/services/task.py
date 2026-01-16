"""タスクサービス."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.task import Task


async def get_tasks_by_user_id(
    db: AsyncSession,
    user_id: str,
    include_archived: bool = False,
) -> list[Task]:
    """ユーザーのタスク一覧を取得.

    Args:
        db: DBセッション
        user_id: ユーザーID
        include_archived: アーカイブ済みタスクを含めるか

    Returns:
        タスクのリスト（作成日時昇順）
    """
    query = select(Task).where(Task.user_id == user_id)

    if not include_archived:
        query = query.where(Task.is_archived.is_(False))

    query = query.order_by(Task.created_at)

    result = await db.execute(query)
    return list(result.scalars().all())

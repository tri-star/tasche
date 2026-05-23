"""タスクサービス."""

import logging
from datetime import date, datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.exceptions import TaskNotFoundException, ValidationError

logger = logging.getLogger(__name__)
from tasche.models.record import Record
from tasche.models.task import Task
from tasche.models.user import User
from tasche.models.week import Week
from tasche.services.record import (
    DEFAULT_WEEK_START_DAY,
    DEFAULT_WEEK_START_HOUR,
    calculate_current_week_start_date,
    get_current_time_utc,
)

TASK_NAME_MAX_LENGTH = 100
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


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


def _normalize_pagination(page: int, per_page: int) -> tuple[int, int]:
    """ページングパラメータを正規化する."""
    safe_page = page if page >= 1 else 1
    safe_per_page = per_page if 1 <= per_page <= MAX_PER_PAGE else DEFAULT_PER_PAGE
    return safe_page, safe_per_page


def _calculate_last_week_start_date(user: User, *, now: datetime | None = None) -> date:
    """ユーザーTZにおける「先週の開始日」を返す."""
    current_time = now or get_current_time_utc()
    current_start = calculate_current_week_start_date(
        timezone_name=user.timezone,
        now=current_time,
        week_start_day=DEFAULT_WEEK_START_DAY,
        week_start_hour=DEFAULT_WEEK_START_HOUR,
    )
    return current_start - timedelta(days=7)


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


async def get_tasks_with_stats(
    db: AsyncSession,
    user: User,
    *,
    include_archived: bool = False,
    page: int = 1,
    per_page: int = 20,
    now: datetime | None = None,
) -> tuple[list[tuple[Task, float, float]], int]:
    """ユーザーのタスク一覧（消化ユニット集計付き）とトータル件数を返す.

    Returns:
        ([(task, consumed_units_last_week, consumed_units_total), ...], total_count)
    """
    page, per_page = _normalize_pagination(page, per_page)

    last_week_start = _calculate_last_week_start_date(user, now=now)

    # 先週Weekのidをサブクエリで取得（無ければNULL）
    last_week_subq = (
        select(Week.id)
        .where(
            and_(
                Week.user_id == user.id,
                Week.start_date == last_week_start,
            )
        )
        .scalar_subquery()
    )

    # 集計値: FILTER句でnull比較の曖昧さを排除し、task_idごとにSUM
    last_week_sum = func.coalesce(
        func.sum(Record.actual_units).filter(Record.week_id == last_week_subq),
        0,
    ).label("consumed_units_last_week")
    total_sum = func.coalesce(func.sum(Record.actual_units), 0).label("consumed_units_total")

    # 件数取得用の独立クエリ（COUNT）
    count_query = select(func.count(Task.id)).where(Task.user_id == user.id)
    if not include_archived:
        count_query = count_query.where(Task.is_archived.is_(False))
    total = (await db.execute(count_query)).scalar_one()

    # 本体クエリ: LEFT JOIN records ON task.id == records.task_id, GROUP BY task.id
    query = (
        select(Task, last_week_sum, total_sum)
        .outerjoin(Record, Record.task_id == Task.id)
        .where(Task.user_id == user.id)
        .group_by(Task.id)
        .order_by(Task.created_at)
        .limit(per_page)
        .offset((page - 1) * per_page)
    )
    if not include_archived:
        query = query.where(Task.is_archived.is_(False))

    result = await db.execute(query)
    rows = [(row[0], float(row[1]), float(row[2])) for row in result.all()]
    return rows, total


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


async def archive_tasks(
    db: AsyncSession, user: User, ids: list[str]
) -> tuple[list[str], list[str]]:
    """複数タスクをまとめてアーカイブする.

    Returns:
        (archived_ids, not_found_ids)
    """
    logger.info("Archiving tasks: ids=%s, user_id=%s", ids, user.id)

    if not ids:
        return [], []

    # 重複IDは正規化（順序を保ったままユニーク化）
    seen: set[str] = set()
    unique_ids: list[str] = []
    for tid in ids:
        if tid not in seen:
            seen.add(tid)
            unique_ids.append(tid)

    # 認可: 自分の active タスクのみ取得
    result = await db.execute(
        select(Task).where(
            Task.id.in_(unique_ids),
            Task.user_id == user.id,
            Task.is_archived.is_(False),
        )
    )
    target_tasks = list(result.scalars().all())
    archivable_ids = {task.id for task in target_tasks}

    # 更新: 個別に is_archived = True にする（ORM更新で onupdate を発火させる）
    for task in target_tasks:
        task.is_archived = True
    await db.flush()

    archived_ids = [tid for tid in unique_ids if tid in archivable_ids]
    not_found_ids = [tid for tid in unique_ids if tid not in archivable_ids]
    return archived_ids, not_found_ids

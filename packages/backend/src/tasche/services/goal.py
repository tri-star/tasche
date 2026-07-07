"""目標サービス."""

import logging
from collections.abc import Iterable

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.exceptions import TaskNotFoundException, ValidationError
from tasche.models.enums import DayOfWeek
from tasche.models.goal import Goal
from tasche.models.task import Task
from tasche.models.user import User
from tasche.models.week import Week
from tasche.schemas.goal import (
    CreatedTask,
    DailyAvailableUnits,
    DailyTargets,
    GoalResponse,
    GoalsResponse,
    GoalsUpdate,
    GoalsUpdateResponse,
    PreviousGoalsResponse,
)
from tasche.services.record import DAY_OF_WEEK_FIELD_NAMES, DAY_OF_WEEK_ORDER
from tasche.services.week import ensure_current_week

logger = logging.getLogger(__name__)

ALLOWED_UNIT_DURATIONS = {10, 30, 60, 120}


def _generate_goal_id() -> str:
    """ULID形式の目標IDを生成する（gol_ プレフィックス付き）."""
    return f"gol_{ULID()}"


def _generate_task_id() -> str:
    """ULID形式のタスクIDを生成する（tsk_ プレフィックス付き）."""
    return f"tsk_{ULID()}"


def _empty_daily_targets() -> dict[str, float]:
    return {field_name: 0.0 for field_name in DAY_OF_WEEK_FIELD_NAMES.values()}


def _build_daily_available_units(week: Week) -> DailyAvailableUnits:
    # DB由来の既存値を返すため model_construct で構築する。
    # 通常のコンストラクタだと Field(le=999.9) 等の入力用バリデーションが働き、
    # 制約導入前に保存された値がある場合に GET が 500 になってしまう。
    return DailyAvailableUnits.model_construct(
        **{
            DAY_OF_WEEK_FIELD_NAMES[day]: float(
                getattr(week, f"available_units_{DAY_OF_WEEK_FIELD_NAMES[day]}")
            )
            for day in DAY_OF_WEEK_ORDER
        }
    )


def _apply_daily_available_units(week: Week, daily_available_units: DailyAvailableUnits) -> None:
    for day in DAY_OF_WEEK_ORDER:
        field_name = DAY_OF_WEEK_FIELD_NAMES[day]
        setattr(week, f"available_units_{field_name}", getattr(daily_available_units, field_name))


def _daily_targets_to_rows(daily_targets: DailyTargets) -> Iterable[tuple[DayOfWeek, float]]:
    for day in DAY_OF_WEEK_ORDER:
        field_name = DAY_OF_WEEK_FIELD_NAMES[day]
        yield day, float(getattr(daily_targets, field_name))


def _build_goal_responses(rows: Iterable[tuple[Goal, Task]]) -> list[GoalResponse]:
    grouped: dict[str, dict[str, object]] = {}

    for goal, task in rows:
        item = grouped.setdefault(
            task.id,
            {
                "task_name": task.name,
                "daily_targets": _empty_daily_targets(),
            },
        )
        day_key = DAY_OF_WEEK_FIELD_NAMES[goal.day_of_week]
        daily_targets = item["daily_targets"]
        assert isinstance(daily_targets, dict)
        daily_targets[day_key] = float(goal.target_units)

    return [
        GoalResponse(
            task_id=task_id,
            task_name=str(payload["task_name"]),
            # DB由来の既存値のため model_construct で構築する（理由は _build_daily_available_units を参照）。
            daily_targets=DailyTargets.model_construct(**payload["daily_targets"]),
        )
        for task_id, payload in grouped.items()
    ]


async def _fetch_previous_goals(
    db: AsyncSession,
    user: User,
    *,
    current_week: Week,
) -> PreviousGoalsResponse | None:
    """直近過去週の目標設定を取得する."""
    # 当週より前でアクティブなGoalが1件以上存在するWeekを最新順で1件取得
    # (Week:Goal = 1:N のため distinct() で Week 行の重複を除去)
    stmt = (
        select(Week)
        .join(Goal, Goal.week_id == Week.id)
        .join(Task, Task.id == Goal.task_id)
        .where(
            Week.user_id == user.id,
            Week.start_date < current_week.start_date,
            Task.user_id == user.id,
            Task.is_archived.is_(False),
        )
        .order_by(Week.start_date.desc())
        .limit(1)
        .distinct()
    )
    previous_week = (await db.execute(stmt)).scalars().first()
    if previous_week is None:
        logger.debug("No previous week with active goals found for user %s", user.id)
        return None

    # 過去週のGoal/Taskを取得（アーカイブ済みタスクは除外）
    result = await db.execute(
        select(Goal, Task)
        .join(Task, Task.id == Goal.task_id)
        .where(
            Goal.week_id == previous_week.id,
            Task.user_id == user.id,
            Task.is_archived.is_(False),
        )
        .order_by(Task.created_at, Goal.day_of_week)
    )
    previous_rows = list(result.all())
    if not previous_rows:
        logger.debug("Previous week %s has no active goals for user %s", previous_week.id, user.id)
        return None

    return PreviousGoalsResponse(
        week_id=previous_week.id,
        week_start_date=previous_week.start_date.isoformat(),
        unit_duration_minutes=previous_week.unit_duration_minutes,
        daily_available_units=_build_daily_available_units(previous_week),
        goals=_build_goal_responses(previous_rows),
    )


async def list_current_goals(
    db: AsyncSession,
    user: User,
) -> GoalsResponse:
    """現在の週の目標一覧を取得する."""
    week = await ensure_current_week(db, user)
    result = await db.execute(
        select(Goal, Task)
        .join(Task, Task.id == Goal.task_id)
        .where(
            Goal.week_id == week.id,
            Task.user_id == user.id,
        )
        .order_by(Task.created_at, Goal.day_of_week)
    )
    current_rows = list(result.all())
    has_current_goals = bool(current_rows)

    previous_goals = (
        None if has_current_goals else await _fetch_previous_goals(db, user, current_week=week)
    )

    return GoalsResponse(
        week_id=week.id,
        week_start_date=week.start_date.isoformat(),
        unit_duration_minutes=week.unit_duration_minutes,
        daily_available_units=_build_daily_available_units(week),
        goals=_build_goal_responses(current_rows),
        has_current_goals=has_current_goals,
        previous_goals=previous_goals,
    )


def _validate_goals_update(goals_update: GoalsUpdate) -> None:
    if goals_update.unit_duration_minutes not in ALLOWED_UNIT_DURATIONS:
        allowed = ", ".join(str(value) for value in sorted(ALLOWED_UNIT_DURATIONS))
        raise ValidationError(f"unit_duration_minutes must be one of: {allowed}")

    seen_task_ids: set[str] = set()
    seen_new_task_names: set[str] = set()
    daily_target_totals = _empty_daily_targets()
    for item in goals_update.goals:
        for day, target_units in _daily_targets_to_rows(item.daily_targets):
            daily_target_totals[DAY_OF_WEEK_FIELD_NAMES[day]] += target_units

        if item.task_id is None:
            new_task_name = (item.new_task_name or "").strip()
            if not new_task_name:
                raise ValidationError("new_task_name is required when task_id is null")
            normalized_name = new_task_name.casefold()
            if normalized_name in seen_new_task_names:
                raise ValidationError("duplicate new_task_name is not allowed")
            seen_new_task_names.add(normalized_name)
            continue

        if item.task_id in seen_task_ids:
            raise ValidationError("duplicate task_id is not allowed")
        seen_task_ids.add(item.task_id)

    for field_name, target_units in daily_target_totals.items():
        available_units = float(getattr(goals_update.daily_available_units, field_name))
        if target_units > available_units:
            raise ValidationError(
                f"daily target units for {field_name} must not exceed daily_available_units"
            )


async def _get_active_tasks_map(
    db: AsyncSession, user: User, task_ids: set[str]
) -> dict[str, Task]:
    if not task_ids:
        return {}

    result = await db.execute(
        select(Task).where(
            Task.id.in_(task_ids),
            Task.user_id == user.id,
            Task.is_archived.is_(False),
        )
    )
    tasks = {task.id: task for task in result.scalars()}
    for task_id in task_ids:
        if task_id not in tasks:
            raise TaskNotFoundException(task_id)
    return tasks


async def replace_current_goals(
    db: AsyncSession,
    user: User,
    goals_update: GoalsUpdate,
) -> GoalsUpdateResponse:
    """現在の週の目標をリクエスト内容で置き換える."""
    _validate_goals_update(goals_update)

    week = await ensure_current_week(db, user)
    week.unit_duration_minutes = goals_update.unit_duration_minutes
    _apply_daily_available_units(week, goals_update.daily_available_units)

    await db.execute(delete(Goal).where(Goal.week_id == week.id))

    response_goals: list[GoalResponse] = []
    created_tasks: list[CreatedTask] = []
    existing_task_ids = {item.task_id for item in goals_update.goals if item.task_id is not None}
    active_tasks = await _get_active_tasks_map(db, user, existing_task_ids)

    for item in goals_update.goals:
        if item.task_id is None:
            assert item.new_task_name is not None
            task = Task(
                id=_generate_task_id(),
                user_id=user.id,
                name=item.new_task_name.strip(),
                is_archived=False,
            )
            db.add(task)
            created_tasks.append(CreatedTask(id=task.id, name=task.name))
        else:
            task = active_tasks[item.task_id]

        for day, target_units in _daily_targets_to_rows(item.daily_targets):
            db.add(
                Goal(
                    id=_generate_goal_id(),
                    week_id=week.id,
                    task=task,
                    day_of_week=day,
                    target_units=target_units,
                )
            )

        response_goals.append(
            GoalResponse(
                task_id=task.id,
                task_name=task.name,
                daily_targets=item.daily_targets,
            )
        )

    await db.flush()

    return GoalsUpdateResponse(
        week_id=week.id,
        week_start_date=week.start_date.isoformat(),
        unit_duration_minutes=week.unit_duration_minutes,
        daily_available_units=_build_daily_available_units(week),
        goals=response_goals,
        created_tasks=created_tasks,
    )

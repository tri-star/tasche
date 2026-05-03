"""目標サービス."""

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
)
from tasche.services.record import DAY_OF_WEEK_FIELD_NAMES, DAY_OF_WEEK_ORDER, get_current_week

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
    return DailyAvailableUnits(
        monday=float(week.available_units_monday),
        tuesday=float(week.available_units_tuesday),
        wednesday=float(week.available_units_wednesday),
        thursday=float(week.available_units_thursday),
        friday=float(week.available_units_friday),
        saturday=float(week.available_units_saturday),
        sunday=float(week.available_units_sunday),
    )


def _apply_daily_available_units(week: Week, daily_available_units: DailyAvailableUnits) -> None:
    week.available_units_monday = daily_available_units.monday
    week.available_units_tuesday = daily_available_units.tuesday
    week.available_units_wednesday = daily_available_units.wednesday
    week.available_units_thursday = daily_available_units.thursday
    week.available_units_friday = daily_available_units.friday
    week.available_units_saturday = daily_available_units.saturday
    week.available_units_sunday = daily_available_units.sunday


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
            daily_targets=DailyTargets(**payload["daily_targets"]),
        )
        for task_id, payload in grouped.items()
    ]


async def list_current_goals(
    db: AsyncSession,
    user: User,
) -> GoalsResponse:
    """現在の週の目標一覧を取得する."""
    week = await get_current_week(db, user)
    result = await db.execute(
        select(Goal, Task)
        .join(Task, Task.id == Goal.task_id)
        .where(
            Goal.week_id == week.id,
            Task.user_id == user.id,
        )
        .order_by(Task.created_at, Goal.day_of_week)
    )

    return GoalsResponse(
        week_id=week.id,
        unit_duration_minutes=week.unit_duration_minutes,
        daily_available_units=_build_daily_available_units(week),
        goals=_build_goal_responses(result.all()),
    )


def _validate_goals_update(goals_update: GoalsUpdate) -> None:
    if goals_update.unit_duration_minutes not in ALLOWED_UNIT_DURATIONS:
        allowed = ", ".join(str(value) for value in sorted(ALLOWED_UNIT_DURATIONS))
        raise ValidationError(f"unit_duration_minutes must be one of: {allowed}")

    seen_task_ids: set[str] = set()
    seen_new_task_names: set[str] = set()
    for item in goals_update.goals:
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

    week = await get_current_week(db, user)
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
        unit_duration_minutes=week.unit_duration_minutes,
        daily_available_units=_build_daily_available_units(week),
        goals=response_goals,
        created_tasks=created_tasks,
    )

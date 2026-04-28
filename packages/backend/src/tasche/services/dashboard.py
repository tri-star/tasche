"""ダッシュボード集計サービス."""

from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.enums import DayOfWeek
from tasche.models.goal import Goal
from tasche.models.record import Record
from tasche.models.task import Task
from tasche.models.user import User
from tasche.schemas.dashboard import (
    DailyData,
    DashboardResponse,
    TodayGoal,
    WeekInfo,
    WeeklyMatrixItem,
)
from tasche.services import record as record_service


@dataclass
class _WeeklyMatrixPayload:
    task_name: str
    created_at: datetime
    daily_data: dict[DayOfWeek, DailyData]


def _calculate_completion_rate(target_units: float, actual_units: float) -> float | None:
    if target_units == 0:
        return None
    return actual_units / target_units * 100


def _get_zoneinfo(timezone_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name or record_service.DEFAULT_TIMEZONE)
    except (ValueError, ZoneInfoNotFoundError):
        return ZoneInfo(record_service.DEFAULT_TIMEZONE)


def _current_day_of_week(local_now: datetime) -> DayOfWeek:
    return record_service.DAY_OF_WEEK_ORDER[local_now.weekday()]


def _empty_daily_data() -> dict[DayOfWeek, DailyData]:
    return {
        day: DailyData(target_units=0.0, actual_units=0.0, completion_rate=None)
        for day in record_service.DAY_OF_WEEK_ORDER
    }


def _get_or_create_weekly_payload(
    grouped: dict[str, _WeeklyMatrixPayload],
    task: Task,
) -> _WeeklyMatrixPayload:
    if task.id not in grouped:
        grouped[task.id] = _WeeklyMatrixPayload(
            task_name=task.name,
            created_at=task.created_at,
            daily_data=_empty_daily_data(),
        )
    return grouped[task.id]


async def _fetch_goal_rows(
    db: AsyncSession,
    *,
    week_id: str,
    user_id: str,
) -> list[tuple[Goal, Task]]:
    result = await db.execute(
        select(Goal, Task)
        .join(Task, Task.id == Goal.task_id)
        .where(
            Goal.week_id == week_id,
            Task.user_id == user_id,
        )
        .order_by(Task.created_at, Goal.day_of_week)
    )
    return list(result.all())


async def _fetch_record_rows(
    db: AsyncSession,
    *,
    week_id: str,
    user_id: str,
) -> list[tuple[Record, Task]]:
    result = await db.execute(
        select(Record, Task)
        .join(Task, Task.id == Record.task_id)
        .where(
            Record.week_id == week_id,
            Task.user_id == user_id,
        )
        .order_by(Task.created_at, Record.day_of_week)
    )
    return list(result.all())


def _build_weekly_matrix(
    goal_rows: list[tuple[Goal, Task]],
    record_rows: list[tuple[Record, Task]],
) -> list[WeeklyMatrixItem]:
    grouped: dict[str, _WeeklyMatrixPayload] = {}

    for goal, task in goal_rows:
        item = _get_or_create_weekly_payload(grouped, task)
        day = DayOfWeek(goal.day_of_week)
        daily_data = item.daily_data
        current = daily_data[day]
        daily_data[day] = DailyData(
            target_units=float(goal.target_units),
            actual_units=current.actual_units,
            completion_rate=_calculate_completion_rate(
                float(goal.target_units), current.actual_units
            ),
        )

    for record, task in record_rows:
        item = _get_or_create_weekly_payload(grouped, task)
        day = DayOfWeek(record.day_of_week)
        daily_data = item.daily_data
        current = daily_data[day]
        daily_data[day] = DailyData(
            target_units=current.target_units,
            actual_units=float(record.actual_units),
            completion_rate=_calculate_completion_rate(
                current.target_units, float(record.actual_units)
            ),
        )

    return [
        WeeklyMatrixItem(
            task_id=task_id,
            task_name=payload.task_name,
            daily_data=payload.daily_data,
        )
        for task_id, payload in sorted(grouped.items(), key=lambda item: item[1].created_at)
    ]


def _build_today_goals(
    weekly_matrix: list[WeeklyMatrixItem],
    current_day_of_week: DayOfWeek,
) -> list[TodayGoal]:
    today_goals: list[TodayGoal] = []
    for item in weekly_matrix:
        daily_data = item.daily_data[current_day_of_week]
        if daily_data.target_units == 0:
            continue
        today_goals.append(
            TodayGoal(
                task_id=item.task_id,
                task_name=item.task_name,
                target_units=daily_data.target_units,
                actual_units=daily_data.actual_units,
                completion_rate=daily_data.completion_rate,
            )
        )
    return today_goals


async def get_dashboard(
    db: AsyncSession,
    user: User,
    *,
    timezone_name: str | None = None,
) -> DashboardResponse:
    """現在週の目標・実績からダッシュボード表示用データを集計する."""
    now = record_service.get_current_time_utc()
    timezone = _get_zoneinfo(timezone_name or user.timezone)
    local_now = now.astimezone(timezone)
    current_day = _current_day_of_week(local_now)
    week = await record_service.get_current_week(
        db,
        user,
        now=now,
        timezone_name=timezone.key,
    )

    goal_rows = await _fetch_goal_rows(db, week_id=week.id, user_id=user.id)
    record_rows = await _fetch_record_rows(db, week_id=week.id, user_id=user.id)
    weekly_matrix = _build_weekly_matrix(goal_rows, record_rows)

    return DashboardResponse(
        current_date=local_now.date(),
        current_day_of_week=current_day,
        week=WeekInfo(
            id=week.id,
            start_date=week.start_date,
            end_date=week.end_date,
            unit_duration_minutes=week.unit_duration_minutes,
        ),
        today_goals=_build_today_goals(weekly_matrix, current_day),
        weekly_matrix=weekly_matrix,
        has_goals_configured=bool(goal_rows),
    )

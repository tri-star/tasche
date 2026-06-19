"""実績サービス."""

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.exceptions import TaskNotFoundException
from tasche.models.enums import DayOfWeek
from tasche.models.record import Record
from tasche.models.task import Task
from tasche.models.user import User
from tasche.schemas.record import DailyActuals, RecordItem, RecordsResponse
from tasche.services import week as week_service
from tasche.services.week import (
    DEFAULT_TIMEZONE,
    DEFAULT_WEEK_START_DAY,
    DEFAULT_WEEK_START_HOUR,
    calculate_current_week_start_date,
    get_current_time_utc,
)

__all__ = [
    "DEFAULT_TIMEZONE",
    "DEFAULT_WEEK_START_DAY",
    "DEFAULT_WEEK_START_HOUR",
    "calculate_current_week_start_date",
    "get_current_time_utc",
]

DAY_OF_WEEK_ORDER = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
]
DAY_OF_WEEK_FIELD_NAMES = {
    DayOfWeek.MONDAY: "monday",
    DayOfWeek.TUESDAY: "tuesday",
    DayOfWeek.WEDNESDAY: "wednesday",
    DayOfWeek.THURSDAY: "thursday",
    DayOfWeek.FRIDAY: "friday",
    DayOfWeek.SATURDAY: "saturday",
    DayOfWeek.SUNDAY: "sunday",
}
WEEKDAY_INDEX = {
    DayOfWeek.MONDAY.value: 0,
    DayOfWeek.TUESDAY.value: 1,
    DayOfWeek.WEDNESDAY.value: 2,
    DayOfWeek.THURSDAY.value: 3,
    DayOfWeek.FRIDAY.value: 4,
    DayOfWeek.SATURDAY.value: 5,
    DayOfWeek.SUNDAY.value: 6,
}


def _generate_record_id() -> str:
    """ULID形式の実績IDを生成する（rec_ プレフィックス付き）."""
    return f"rec_{ULID()}"


def _empty_daily_actuals() -> dict[str, float]:
    return {field_name: 0.0 for field_name in DAY_OF_WEEK_FIELD_NAMES.values()}


def _build_record_items(rows: Iterable[tuple[Record, Task]]) -> list[RecordItem]:
    grouped: dict[str, dict[str, object]] = {}

    for record, task in rows:
        item = grouped.setdefault(
            task.id,
            {
                "task_name": task.name,
                "daily_actuals": _empty_daily_actuals(),
            },
        )
        day_key = DAY_OF_WEEK_FIELD_NAMES[DayOfWeek(record.day_of_week)]
        daily_actuals = item["daily_actuals"]
        assert isinstance(daily_actuals, dict)
        daily_actuals[day_key] = float(record.actual_units)

    return [
        RecordItem(
            task_id=task_id,
            task_name=str(payload["task_name"]),
            daily_actuals=DailyActuals(**payload["daily_actuals"]),
        )
        for task_id, payload in grouped.items()
    ]


async def list_current_records(
    db: AsyncSession,
    user: User,
    *,
    now: datetime | None = None,
) -> RecordsResponse:
    """現在の週の実績一覧を取得する."""
    week = await week_service.get_current_week(db, user, now=now)
    result = await db.execute(
        select(Record, Task)
        .join(Task, Task.id == Record.task_id)
        .where(
            Record.week_id == week.id,
            Task.user_id == user.id,
        )
        .order_by(Task.created_at, Record.day_of_week)
    )

    return RecordsResponse(
        week_id=week.id,
        unit_duration_minutes=week.unit_duration_minutes,
        records=_build_record_items(result.all()),
    )


async def upsert_current_record(
    db: AsyncSession,
    user: User,
    *,
    task_id: str,
    day_of_week: DayOfWeek,
    actual_units: float,
    now: datetime | None = None,
    flush_record: bool = True,
    refresh_record: bool = True,
) -> tuple[Record, str, bool]:
    """現在の週の実績を作成または更新する."""
    task_result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == user.id,
            Task.is_archived.is_(False),
        )
    )
    task = task_result.scalar_one_or_none()
    if task is None:
        raise TaskNotFoundException(task_id)

    week = await week_service.get_current_week(db, user, now=now)
    record_result = await db.execute(
        select(Record).where(
            Record.week_id == week.id,
            Record.task_id == task.id,
            Record.day_of_week == day_of_week,
        )
    )
    record = record_result.scalar_one_or_none()
    created = record is None

    if record is None:
        record = Record(
            id=_generate_record_id(),
            week_id=week.id,
            task_id=task.id,
            day_of_week=day_of_week,
            actual_units=actual_units,
        )
        db.add(record)
    else:
        record.actual_units = actual_units

    if flush_record or refresh_record:
        await db.flush()
    if refresh_record:
        await db.refresh(record)

    return record, task.name, created

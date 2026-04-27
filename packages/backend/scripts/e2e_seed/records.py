"""E2E テスト用 record seed."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.models.enums import DayOfWeek
from tasche.models.record import Record
from tasche.models.week import Week

from .constants import E2E_RECORDS


def _generate_record_id() -> str:
    return f"rec_{ULID()}"


async def seed_records(session: AsyncSession, week: Week) -> None:
    """E2E 用実績を作成または更新する."""
    for record_data in E2E_RECORDS:
        task_id = record_data["task_id"]
        daily_actuals: dict[DayOfWeek, float] = record_data["daily_actuals"]

        for day_of_week, actual_units in daily_actuals.items():
            day_of_week_value = day_of_week.value
            result = await session.execute(
                select(Record).where(
                    Record.week_id == week.id,
                    Record.task_id == task_id,
                    Record.day_of_week == day_of_week_value,
                )
            )
            record = result.scalar_one_or_none()

            if record is None:
                session.add(
                    Record(
                        id=_generate_record_id(),
                        week_id=week.id,
                        task_id=task_id,
                        day_of_week=day_of_week_value,
                        actual_units=actual_units,
                    )
                )
            else:
                record.actual_units = actual_units

    await session.flush()
    print("✓ Seeded E2E records")

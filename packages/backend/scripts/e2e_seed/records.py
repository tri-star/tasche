"""E2E テスト用 record seed."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.models.enums import DayOfWeek
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
            record_id_result = await session.execute(
                text(
                    """
                    SELECT id
                    FROM records
                    WHERE week_id = :week_id
                      AND task_id = :task_id
                      AND day_of_week = CAST(:day_of_week AS day_of_week_enum)
                    """
                ),
                {
                    "week_id": week.id,
                    "task_id": task_id,
                    "day_of_week": day_of_week_value,
                },
            )
            record_id = record_id_result.scalar_one_or_none() or _generate_record_id()

            await session.execute(
                text(
                    """
                    INSERT INTO records (id, week_id, task_id, day_of_week, actual_units)
                    VALUES (
                        :id,
                        :week_id,
                        :task_id,
                        CAST(:day_of_week AS day_of_week_enum),
                        :actual_units
                    )
                    ON CONFLICT (week_id, task_id, day_of_week)
                    DO UPDATE SET actual_units = EXCLUDED.actual_units
                    """
                ),
                {
                    "id": record_id,
                    "week_id": week.id,
                    "task_id": task_id,
                    "day_of_week": day_of_week_value,
                    "actual_units": actual_units,
                },
            )

    await session.flush()
    print("✓ Seeded E2E records")

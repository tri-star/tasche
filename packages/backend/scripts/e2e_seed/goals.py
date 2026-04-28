"""E2E テスト用 goal seed."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.models.enums import DayOfWeek
from tasche.models.week import Week

from .constants import E2E_GOALS


def _generate_goal_id() -> str:
    return f"gol_{ULID()}"


async def seed_goals(session: AsyncSession, week: Week) -> None:
    """E2E 用目標を作成または更新する."""
    for goal_data in E2E_GOALS:
        task_id = goal_data["task_id"]
        daily_targets: dict[DayOfWeek, float] = goal_data["daily_targets"]

        for day_of_week, target_units in daily_targets.items():
            day_of_week_value = day_of_week.value
            goal_id_result = await session.execute(
                text(
                    """
                    SELECT id
                    FROM goals
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
            goal_id = goal_id_result.scalar_one_or_none() or _generate_goal_id()

            await session.execute(
                text(
                    """
                    INSERT INTO goals (id, week_id, task_id, day_of_week, target_units)
                    VALUES (
                        :id,
                        :week_id,
                        :task_id,
                        CAST(:day_of_week AS day_of_week_enum),
                        :target_units
                    )
                    ON CONFLICT (week_id, task_id, day_of_week)
                    DO UPDATE SET target_units = EXCLUDED.target_units
                    """
                ),
                {
                    "id": goal_id,
                    "week_id": week.id,
                    "task_id": task_id,
                    "day_of_week": day_of_week_value,
                    "target_units": target_units,
                },
            )

    await session.flush()
    print("✓ Seeded E2E goals")

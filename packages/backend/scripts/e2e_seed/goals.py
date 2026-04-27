"""E2E テスト用 goal seed."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.models.enums import DayOfWeek
from tasche.models.goal import Goal
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
            result = await session.execute(
                select(Goal).where(
                    Goal.week_id == week.id,
                    Goal.task_id == task_id,
                    Goal.day_of_week == day_of_week_value,
                )
            )
            goal = result.scalar_one_or_none()

            if goal is None:
                session.add(
                    Goal(
                        id=_generate_goal_id(),
                        week_id=week.id,
                        task_id=task_id,
                        day_of_week=day_of_week_value,
                        target_units=target_units,
                    )
                )
            else:
                goal.target_units = target_units

    await session.flush()
    print("✓ Seeded E2E goals")

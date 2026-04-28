"""E2E テスト用 week seed."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.user import User
from tasche.models.week import Week
from tasche.services.record import calculate_current_week_start_date, get_current_time_utc

from .constants import E2E_WEEK


async def seed_week(session: AsyncSession, user: User) -> Week:
    """E2E 用 current week を作成または更新する."""
    start_date = calculate_current_week_start_date(
        timezone_name=user.timezone,
        now=get_current_time_utc(),
        week_start_day=E2E_WEEK["week_start_day"],
        week_start_hour=E2E_WEEK["week_start_hour"],
    )
    end_date = start_date + timedelta(days=6)

    result = await session.execute(select(Week).where(Week.id == E2E_WEEK["id"]))
    week = result.scalar_one_or_none()

    if week is None:
        week = Week(user_id=user.id, start_date=start_date, end_date=end_date, **E2E_WEEK)
        session.add(week)
        await session.flush()
        print(f"✓ Created E2E week: {week.id}")
        return week

    week.user_id = user.id
    week.start_date = start_date
    week.end_date = end_date
    week.unit_duration_minutes = E2E_WEEK["unit_duration_minutes"]
    week.week_start_day = E2E_WEEK["week_start_day"]
    week.week_start_hour = E2E_WEEK["week_start_hour"]
    print(f"✓ Updated E2E week: {week.id}")
    return week

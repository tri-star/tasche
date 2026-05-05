"""週サービス（current week の取得・保証）."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.models.user import User
from tasche.models.week import Week
from tasche.services import record as record_service
from tasche.services.record import (
    DEFAULT_WEEK_START_DAY,
    DEFAULT_WEEK_START_HOUR,
    calculate_current_week_start_date,
)

DEFAULT_UNIT_DURATION_MINUTES = 30


def _generate_week_id() -> str:
    """ULID形式の週IDを生成する（wk_ プレフィックス付き）."""
    return f"wk_{ULID()}"


async def ensure_current_week(
    db: AsyncSession,
    user: User,
    *,
    now=None,
    timezone_name: str | None = None,
) -> Week:
    """ユーザーの current week を取得し、無ければ既定値で作成する.

    unique(user_id, start_date) 制約に依存して冪等。
    """
    current_time = now or record_service.get_current_time_utc()
    tz = timezone_name or user.timezone
    start_date = calculate_current_week_start_date(
        timezone_name=tz,
        now=current_time,
    )
    end_date = start_date + timedelta(days=6)

    # まず既存週を検索する
    result = await db.execute(
        select(Week).where(
            Week.user_id == user.id,
            Week.start_date == start_date,
        )
    )
    week = result.scalar_one_or_none()
    if week is not None:
        return week

    # 存在しない場合は新規作成する（競合時は再 SELECT で取得）
    new_week = Week(
        id=_generate_week_id(),
        user_id=user.id,
        start_date=start_date,
        end_date=end_date,
        unit_duration_minutes=DEFAULT_UNIT_DURATION_MINUTES,
        week_start_day=DEFAULT_WEEK_START_DAY,
        week_start_hour=DEFAULT_WEEK_START_HOUR,
        available_units_monday=0.0,
        available_units_tuesday=0.0,
        available_units_wednesday=0.0,
        available_units_thursday=0.0,
        available_units_friday=0.0,
        available_units_saturday=0.0,
        available_units_sunday=0.0,
    )

    try:
        async with db.begin_nested():
            db.add(new_week)
            await db.flush()
    except IntegrityError:
        # 同時リクエストで競合した場合は既存週を再取得する
        result = await db.execute(
            select(Week).where(
                Week.user_id == user.id,
                Week.start_date == start_date,
            )
        )
        new_week = result.scalar_one()

    return new_week

"""週サービス（current week の取得・保証）."""

import logging
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.exceptions import WeekNotFoundException
from tasche.models.enums import DayOfWeek
from tasche.models.user import User
from tasche.models.week import Week

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "Asia/Tokyo"
DEFAULT_WEEK_START_DAY = "monday"
DEFAULT_WEEK_START_HOUR = 4
DEFAULT_UNIT_DURATION_MINUTES = 30
WEEKDAY_INDEX = {
    DayOfWeek.MONDAY.value: 0,
    DayOfWeek.TUESDAY.value: 1,
    DayOfWeek.WEDNESDAY.value: 2,
    DayOfWeek.THURSDAY.value: 3,
    DayOfWeek.FRIDAY.value: 4,
    DayOfWeek.SATURDAY.value: 5,
    DayOfWeek.SUNDAY.value: 6,
}


def _generate_week_id() -> str:
    """ULID形式の週IDを生成する（wk_ プレフィックス付き）."""
    return f"wk_{ULID()}"


def _get_zoneinfo(timezone_name: str | None) -> ZoneInfo:
    """有効なタイムゾーンを返す."""
    try:
        return ZoneInfo(timezone_name or DEFAULT_TIMEZONE)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


def get_current_time_utc() -> datetime:
    """現在のUTC時刻を返す."""
    return datetime.now(UTC)


def calculate_current_week_start_date(
    *,
    timezone_name: str | None,
    now: datetime,
    week_start_day: str = DEFAULT_WEEK_START_DAY,
    week_start_hour: int = DEFAULT_WEEK_START_HOUR,
) -> datetime.date:
    """指定時刻が属する週の開始日を返す."""
    timezone = _get_zoneinfo(timezone_name)
    local_now = now.astimezone(timezone)

    start_weekday = WEEKDAY_INDEX.get(week_start_day, WEEKDAY_INDEX[DEFAULT_WEEK_START_DAY])
    days_since_start = (local_now.weekday() - start_weekday) % 7
    candidate_date = local_now.date() - timedelta(days=days_since_start)
    candidate_start = datetime(
        year=candidate_date.year,
        month=candidate_date.month,
        day=candidate_date.day,
        hour=week_start_hour,
        tzinfo=timezone,
    )
    if local_now < candidate_start:
        candidate_start -= timedelta(days=7)

    return candidate_start.date()


async def get_current_week(
    db: AsyncSession,
    user: User,
    *,
    now: datetime | None = None,
    timezone_name: str | None = None,
) -> Week:
    """現在のユーザーの current week を取得する."""
    current_time = now or get_current_time_utc()
    start_date = calculate_current_week_start_date(
        timezone_name=timezone_name or user.timezone,
        now=current_time,
    )

    result = await db.execute(
        select(Week).where(
            Week.user_id == user.id,
            Week.start_date == start_date,
        )
    )
    week = result.scalar_one_or_none()
    if week is None:
        raise WeekNotFoundException(user.id)
    return week


async def ensure_current_week(
    db: AsyncSession,
    user: User,
    *,
    now: datetime | None = None,
    timezone_name: str | None = None,
) -> Week:
    """ユーザーの current week を取得し、無ければ既定値で作成する.

    unique(user_id, start_date) 制約に依存して冪等。
    """
    current_time = now or get_current_time_utc()
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
        logger.info("Created new week for user %s: %s", user.id, new_week.id)
    except IntegrityError:
        # 同時リクエストで競合した場合は既存週を再取得する
        logger.warning("IntegrityError on ensure_current_week for user %s, re-selecting", user.id)
        result = await db.execute(
            select(Week).where(
                Week.user_id == user.id,
                Week.start_date == start_date,
            )
        )
        week = result.scalar_one_or_none()
        if week is None:
            raise
        new_week = week

    return new_week

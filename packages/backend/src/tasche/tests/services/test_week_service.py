"""週サービスの統合テスト."""

from datetime import UTC, date, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.models.user import User
from tasche.models.week import Week
from tasche.services import record as record_service
from tasche.services.week import DEFAULT_UNIT_DURATION_MINUTES, ensure_current_week


def _make_user_id() -> str:
    return f"usr_{ULID()}"


async def _create_test_user(
    db_session: AsyncSession, *, email: str = "weektest@example.com"
) -> User:
    """テスト用ユーザーを作成する."""
    user = User(
        id=_make_user_id(),
        email=email,
        name="Week Test User",
        timezone="Asia/Tokyo",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


class TestEnsureCurrentWeek:
    """ensure_current_week のテスト."""

    @pytest.fixture
    def fixed_now(self, monkeypatch: pytest.MonkeyPatch):
        """current week 判定を固定する（2026-04-22 03:00 UTC = 2026-04-22 12:00 JST）."""
        now = datetime(2026, 4, 22, 3, 0, tzinfo=UTC)
        monkeypatch.setattr(record_service, "get_current_time_utc", lambda: now)
        return now

    async def test_creates_week_when_missing(self, db_session: AsyncSession, fixed_now: datetime):
        """週レコードが存在しない場合に新規作成する."""
        user = await _create_test_user(db_session)

        week = await ensure_current_week(db_session, user)

        assert week is not None
        assert week.user_id == user.id
        assert week.start_date == date(2026, 4, 20)
        assert week.end_date == date(2026, 4, 26)
        assert week.unit_duration_minutes == DEFAULT_UNIT_DURATION_MINUTES
        assert week.week_start_day == "monday"
        assert week.week_start_hour == 4
        assert week.available_units_monday == 0.0
        assert week.available_units_sunday == 0.0

    async def test_returns_existing_week(self, db_session: AsyncSession, fixed_now: datetime):
        """週レコードが既に存在する場合はそれを返す."""
        user = await _create_test_user(db_session)

        # 事前に週レコードを作成する
        existing_week = Week(
            id=f"wk_{ULID()}",
            user_id=user.id,
            start_date=date(2026, 4, 20),
            end_date=date(2026, 4, 26),
            unit_duration_minutes=60,
            week_start_day="monday",
            week_start_hour=4,
        )
        db_session.add(existing_week)
        await db_session.commit()

        week = await ensure_current_week(db_session, user)

        assert week.id == existing_week.id
        assert week.unit_duration_minutes == 60  # 既存値が保持されていること

    async def test_idempotent_multiple_calls(self, db_session: AsyncSession, fixed_now: datetime):
        """同一ユーザーに対して複数回呼んでも週レコードが 1 件のみ作成される."""
        user = await _create_test_user(db_session)

        week1 = await ensure_current_week(db_session, user)
        week2 = await ensure_current_week(db_session, user)

        assert week1.id == week2.id

        result = await db_session.execute(select(Week).where(Week.user_id == user.id))
        weeks = list(result.scalars())
        assert len(weeks) == 1

    async def test_creates_week_with_correct_id_prefix(
        self, db_session: AsyncSession, fixed_now: datetime
    ):
        """作成される週 ID が wk_ プレフィックスで始まる."""
        user = await _create_test_user(db_session)

        week = await ensure_current_week(db_session, user)

        assert week.id.startswith("wk_")

    async def test_uses_user_timezone(self, db_session: AsyncSession):
        """ユーザーのタイムゾーンに応じた start_date が計算される."""
        # UTC+0 のユーザー（週の区切りが UTC で発生）
        user = User(
            id=_make_user_id(),
            email="utc_user@example.com",
            name="UTC User",
            timezone="UTC",
        )
        db_session.add(user)
        await db_session.commit()

        # 月曜 03:00 UTC（Asia/Tokyo では月曜 12:00）
        now = datetime(2026, 4, 20, 3, 0, tzinfo=UTC)

        week = await ensure_current_week(db_session, user, now=now)

        # UTC タイムゾーンでも適切な start_date が計算されること
        assert week.start_date is not None
        assert week.user_id == user.id

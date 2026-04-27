"""実績 API の統合テスト."""

from datetime import UTC, date, datetime

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.api.deps import get_current_user
from tasche.main import app
from tasche.models.record import Record
from tasche.models.task import Task
from tasche.models.user import User
from tasche.models.week import Week
from tasche.services import record as record_service


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """テスト用ユーザー."""
    user = User(
        id="usr_01TEST1234567890ABCDEF",
        email="records@example.com",
        name="Records User",
        timezone="Asia/Tokyo",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def authenticated_client(client: AsyncClient, test_user: User) -> AsyncClient:
    """認証済みクライアント."""

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    return client


@pytest_asyncio.fixture
async def current_week(db_session: AsyncSession, test_user: User) -> Week:
    """テスト用 current week."""
    week = Week(
        id="wk_01TEST1234567890ABCDEF",
        user_id=test_user.id,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
        unit_duration_minutes=30,
        week_start_day="monday",
        week_start_hour=4,
    )
    db_session.add(week)
    await db_session.commit()
    await db_session.refresh(week)
    return week


@pytest_asyncio.fixture
async def previous_week(db_session: AsyncSession, test_user: User) -> Week:
    """テスト用 previous week."""
    week = Week(
        id="wk_00TEST1234567890ABCDEF",
        user_id=test_user.id,
        start_date=date(2026, 4, 13),
        end_date=date(2026, 4, 19),
        unit_duration_minutes=30,
        week_start_day="monday",
        week_start_hour=4,
    )
    db_session.add(week)
    await db_session.commit()
    await db_session.refresh(week)
    return week


@pytest_asyncio.fixture
async def test_tasks(db_session: AsyncSession, test_user: User) -> tuple[Task, Task]:
    """テスト用タスク."""
    english = Task(
        id="tsk_01TEST1234567890ABCDEF",
        user_id=test_user.id,
        name="英語学習",
        is_archived=False,
    )
    dev = Task(
        id="tsk_02TEST1234567890ABCDEF",
        user_id=test_user.id,
        name="個人開発",
        is_archived=False,
    )
    db_session.add_all([english, dev])
    await db_session.commit()
    return english, dev


@pytest.fixture
def fixed_now(monkeypatch: pytest.MonkeyPatch):
    """current week 判定を固定する."""
    now = datetime(2026, 4, 22, 3, 0, tzinfo=UTC)
    monkeypatch.setattr(record_service, "get_current_time_utc", lambda: now)
    return now


class TestGetCurrentRecords:
    """GET /api/weeks/current/records のテスト."""

    async def test_returns_current_week_records(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        previous_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """現在週の実績のみを返す."""
        english, dev = test_tasks
        db_session.add_all(
            [
                Record(
                    id="rec_current_mon",
                    week_id=current_week.id,
                    task_id=english.id,
                    day_of_week="monday",
                    actual_units=2.5,
                ),
                Record(
                    id="rec_current_tue",
                    week_id=current_week.id,
                    task_id=english.id,
                    day_of_week="tuesday",
                    actual_units=1.0,
                ),
                Record(
                    id="rec_previous_mon",
                    week_id=previous_week.id,
                    task_id=dev.id,
                    day_of_week="monday",
                    actual_units=9.9,
                ),
            ]
        )
        await db_session.commit()

        response = await authenticated_client.get("/api/weeks/current/records")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week_id"] == current_week.id
        assert data["unit_duration_minutes"] == 30
        assert len(data["records"]) == 1
        assert data["records"][0]["task_name"] == "英語学習"
        assert data["records"][0]["daily_actuals"]["monday"] == 2.5
        assert data["records"][0]["daily_actuals"]["tuesday"] == 1.0
        assert data["records"][0]["daily_actuals"]["wednesday"] == 0

    async def test_returns_404_when_current_week_does_not_exist(
        self,
        authenticated_client: AsyncClient,
        fixed_now: datetime,
    ):
        """current week 未作成なら 404."""
        response = await authenticated_client.get("/api/weeks/current/records")

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "WEEK_NOT_FOUND"


class TestUpsertRecord:
    """実績の作成・更新 API テスト."""

    async def test_put_creates_new_record(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """PUT で新規実績を作成できる."""
        english, _ = test_tasks

        response = await authenticated_client.put(
            f"/api/weeks/current/records/wednesday/{english.id}",
            json={"actual_units": 1.5},
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["task_id"] == english.id
        assert data["day_of_week"] == "wednesday"
        assert data["actual_units"] == 1.5

        result = await db_session.execute(select(Record))
        records = list(result.scalars())
        assert len(records) == 1
        assert records[0].week_id == current_week.id

    async def test_put_updates_existing_record_without_duplicate(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """同じ曜日・タスクへの PUT は更新になる."""
        english, _ = test_tasks
        existing = Record(
            id="rec_existing",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="wednesday",
            actual_units=1.5,
        )
        db_session.add(existing)
        await db_session.commit()

        response = await authenticated_client.put(
            f"/api/weeks/current/records/wednesday/{english.id}",
            json={"actual_units": 2.0},
        )

        assert response.status_code == 200
        assert response.json()["data"]["id"] == "rec_existing"
        assert response.json()["data"]["actual_units"] == 2.0

        result = await db_session.execute(select(Record).where(Record.week_id == current_week.id))
        records = list(result.scalars())
        assert len(records) == 1
        assert records[0].actual_units == 2.0

    async def test_post_remains_compatible(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """既存の POST 契約も引き続き使える."""
        _, dev = test_tasks

        response = await authenticated_client.post(
            "/api/weeks/current/records",
            json={
                "task_id": dev.id,
                "day_of_week": "friday",
                "actual_units": 0.5,
            },
        )

        assert response.status_code == 201
        assert response.json()["data"]["task_id"] == dev.id
        assert response.json()["data"]["actual_units"] == 0.5

    async def test_rejects_other_users_task(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        current_week: Week,
        fixed_now: datetime,
    ):
        """他ユーザーの task_id では保存できない."""
        other_user = User(
            id="usr_02TEST1234567890ABCDEF",
            email="other-records@example.com",
            name="Other User",
            timezone="Asia/Tokyo",
        )
        other_task = Task(
            id="tsk_99TEST1234567890ABCDEF",
            user_id=other_user.id,
            name="他ユーザーのタスク",
            is_archived=False,
        )
        db_session.add_all([other_user, other_task])
        await db_session.commit()

        response = await authenticated_client.put(
            f"/api/weeks/current/records/monday/{other_task.id}",
            json={"actual_units": 1.0},
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    async def test_rejects_invalid_actual_units(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """0.1単位でない actual_units は 422."""
        english, _ = test_tasks

        response = await authenticated_client.put(
            f"/api/weeks/current/records/monday/{english.id}",
            json={"actual_units": 0.05},
        )

        assert response.status_code == 422


class TestWeekBoundary:
    """週境界の判定テスト."""

    def test_before_monday_4am_is_previous_week(self):
        """月曜 03:59 は前週扱い."""
        start_date = record_service.calculate_current_week_start_date(
            timezone_name="Asia/Tokyo",
            now=datetime(2026, 4, 26, 18, 59, tzinfo=UTC),
        )

        assert start_date == date(2026, 4, 20)

    def test_monday_4am_starts_new_week(self):
        """月曜 04:00 で新週に切り替わる."""
        start_date = record_service.calculate_current_week_start_date(
            timezone_name="Asia/Tokyo",
            now=datetime(2026, 4, 26, 19, 0, tzinfo=UTC),
        )

        assert start_date == date(2026, 4, 27)

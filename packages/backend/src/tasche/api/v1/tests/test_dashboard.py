"""ダッシュボード API の統合テスト."""

from datetime import UTC, date, datetime

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.api.deps import get_current_user
from tasche.main import app
from tasche.models.goal import Goal
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
        email="dashboard@example.com",
        name="Dashboard User",
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


async def _add_goal(
    db_session: AsyncSession,
    *,
    goal_id: str,
    week_id: str,
    task_id: str,
    day_of_week: str,
    target_units: float,
) -> None:
    db_session.add(
        Goal(
            id=goal_id,
            week_id=week_id,
            task_id=task_id,
            day_of_week=day_of_week,
            target_units=target_units,
        )
    )
    await db_session.commit()


async def _add_record(
    db_session: AsyncSession,
    *,
    record_id: str,
    week_id: str,
    task_id: str,
    day_of_week: str,
    actual_units: float,
) -> None:
    db_session.add(
        Record(
            id=record_id,
            week_id=week_id,
            task_id=task_id,
            day_of_week=day_of_week,
            actual_units=actual_units,
        )
    )
    await db_session.commit()


class TestGetDashboard:
    """GET /api/dashboard のテスト."""

    async def test_returns_current_week_dashboard(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        previous_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """現在週の目標・実績からダッシュボードを集計する."""
        english, dev = test_tasks
        await _add_goal(
            db_session,
            goal_id="gol_english_mon",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="monday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_english_tue",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="tuesday",
            target_units=1.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_english_wed",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="wednesday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_english_thu",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="thursday",
            target_units=1.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_dev_wed",
            week_id=current_week.id,
            task_id=dev.id,
            day_of_week="wednesday",
            target_units=0.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_previous",
            week_id=previous_week.id,
            task_id=english.id,
            day_of_week="wednesday",
            target_units=9.0,
        )
        await _add_record(
            db_session,
            record_id="rec_english_mon",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="monday",
            actual_units=2.5,
        )
        await _add_record(
            db_session,
            record_id="rec_english_tue",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="tuesday",
            actual_units=1.0,
        )
        await _add_record(
            db_session,
            record_id="rec_english_wed",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="wednesday",
            actual_units=1.5,
        )
        await _add_record(
            db_session,
            record_id="rec_dev_wed",
            week_id=current_week.id,
            task_id=dev.id,
            day_of_week="wednesday",
            actual_units=3.0,
        )
        await _add_record(
            db_session,
            record_id="rec_previous",
            week_id=previous_week.id,
            task_id=english.id,
            day_of_week="wednesday",
            actual_units=9.0,
        )

        response = await authenticated_client.get("/api/dashboard")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["current_date"] == "2026-04-22"
        assert data["current_day_of_week"] == "wednesday"
        assert data["week"]["id"] == current_week.id
        assert data["has_goals_configured"] is True

        assert data["today_goals"] == [
            {
                "task_id": english.id,
                "task_name": "英語学習",
                "target_units": 2.0,
                "actual_units": 1.5,
                "completion_rate": 75.0,
            }
        ]

        english_matrix = data["weekly_matrix"][0]["daily_data"]
        assert english_matrix["monday"]["completion_rate"] == 125.0
        assert english_matrix["tuesday"]["completion_rate"] == 100.0
        assert english_matrix["wednesday"]["completion_rate"] == 75.0
        assert english_matrix["thursday"]["completion_rate"] == 0.0
        assert english_matrix["friday"]["completion_rate"] is None

        dev_matrix = data["weekly_matrix"][1]["daily_data"]
        assert dev_matrix["wednesday"] == {
            "target_units": 0.0,
            "actual_units": 3.0,
            "completion_rate": None,
        }

    async def test_excludes_other_user_data(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task],
        fixed_now: datetime,
    ):
        """他ユーザーのタスクに紐づくデータを混ぜない."""
        english, _ = test_tasks
        other_user = User(
            id="usr_OTHER1234567890ABCDEF",
            email="other-dashboard@example.com",
            name="Other User",
            timezone="Asia/Tokyo",
        )
        db_session.add(other_user)
        await db_session.commit()
        other_task = Task(
            id="tsk_OTHER1234567890ABCDEF",
            user_id=other_user.id,
            name="他ユーザータスク",
            is_archived=False,
        )
        db_session.add(other_task)
        await db_session.commit()

        await _add_goal(
            db_session,
            goal_id="gol_own",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="wednesday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_other",
            week_id=current_week.id,
            task_id=other_task.id,
            day_of_week="wednesday",
            target_units=9.0,
        )

        response = await authenticated_client.get("/api/dashboard")

        assert response.status_code == 200
        data = response.json()["data"]
        assert [item["task_id"] for item in data["weekly_matrix"]] == [english.id]

    async def test_returns_empty_when_goals_not_configured(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        fixed_now: datetime,
    ):
        """目標未設定の場合は空のダッシュボードを返す."""
        response = await authenticated_client.get("/api/dashboard")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week"]["id"] == current_week.id
        assert data["weekly_matrix"] == []
        assert data["today_goals"] == []
        assert data["has_goals_configured"] is False

    async def test_returns_week_not_found_when_current_week_missing(
        self,
        authenticated_client: AsyncClient,
        fixed_now: datetime,
    ):
        """current week がない場合は 404 を返す."""
        response = await authenticated_client.get("/api/dashboard")

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "WEEK_NOT_FOUND"

    async def test_timezone_query_changes_current_date_and_day(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        fixed_now: datetime,
    ):
        """timezone クエリで現在日付・曜日の算出基準を変更する."""
        response = await authenticated_client.get("/api/dashboard?timezone=America/New_York")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["current_date"] == "2026-04-21"
        assert data["current_day_of_week"] == "tuesday"

    async def test_invalid_timezone_falls_back_to_tokyo(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        fixed_now: datetime,
    ):
        """無効な timezone は Asia/Tokyo として扱う."""
        response = await authenticated_client.get("/api/dashboard?timezone=Invalid/Timezone")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["current_date"] == "2026-04-22"
        assert data["current_day_of_week"] == "wednesday"

    async def test_path_like_timezone_falls_back_to_tokyo(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        fixed_now: datetime,
    ):
        """path-like な timezone でも 500 にせず Asia/Tokyo として扱う."""
        response = await authenticated_client.get("/api/dashboard?timezone=../UTC")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["current_date"] == "2026-04-22"
        assert data["current_day_of_week"] == "wednesday"

    async def test_timezone_query_is_used_for_current_week_lookup(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """timezone クエリを current week 判定にも利用する."""
        tokyo_week = Week(
            id="wk_TOKYO1234567890ABCDEF",
            user_id=test_user.id,
            start_date=date(2026, 4, 27),
            end_date=date(2026, 5, 3),
            unit_duration_minutes=30,
            week_start_day="monday",
            week_start_hour=4,
        )
        new_york_week = Week(
            id="wk_NEWYORK1234567890ABCDEF",
            user_id=test_user.id,
            start_date=date(2026, 4, 20),
            end_date=date(2026, 4, 26),
            unit_duration_minutes=30,
            week_start_day="monday",
            week_start_hour=4,
        )
        db_session.add_all([tokyo_week, new_york_week])
        await db_session.commit()
        now = datetime(2026, 4, 26, 20, 0, tzinfo=UTC)
        monkeypatch.setattr(record_service, "get_current_time_utc", lambda: now)

        response = await authenticated_client.get("/api/dashboard?timezone=America/New_York")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["current_date"] == "2026-04-26"
        assert data["current_day_of_week"] == "sunday"
        assert data["week"]["id"] == new_york_week.id

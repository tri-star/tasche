"""目標 API の統合テスト."""

from datetime import UTC, date, datetime

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.api.deps import get_current_user
from tasche.main import app
from tasche.models.goal import Goal
from tasche.models.task import Task
from tasche.models.user import User
from tasche.models.week import Week
from tasche.services import record as record_service


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """テスト用ユーザー."""
    user = User(
        id="usr_01TEST1234567890ABCDEF",
        email="goals@example.com",
        name="Goals User",
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
async def test_tasks(db_session: AsyncSession, test_user: User) -> tuple[Task, Task, Task]:
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
    archived = Task(
        id="tsk_03TEST1234567890ABCDEF",
        user_id=test_user.id,
        name="アーカイブ済み",
        is_archived=True,
    )
    db_session.add_all([english, dev, archived])
    await db_session.commit()
    return english, dev, archived


@pytest.fixture
def fixed_now(monkeypatch: pytest.MonkeyPatch):
    """current week 判定を固定する."""
    now = datetime(2026, 4, 22, 3, 0, tzinfo=UTC)
    monkeypatch.setattr(record_service, "get_current_time_utc", lambda: now)
    return now


def _daily_targets(value: float = 0.0) -> dict[str, float]:
    return {
        "monday": value,
        "tuesday": value,
        "wednesday": value,
        "thursday": value,
        "friday": value,
        "saturday": value,
        "sunday": value,
    }


def _daily_available_units(value: float = 0.0) -> dict[str, float]:
    return {
        "monday": value,
        "tuesday": value,
        "wednesday": value,
        "thursday": value,
        "friday": value,
        "saturday": value,
        "sunday": value,
    }


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


class TestGetCurrentGoals:
    """GET /api/weeks/current/goals のテスト."""

    async def test_returns_current_week_goals(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        previous_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """現在週の目標のみを返す."""
        english, dev, _ = test_tasks
        await _add_goal(
            db_session,
            goal_id="gol_current_mon",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="monday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_current_tue",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="tuesday",
            target_units=1.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_previous_mon",
            week_id=previous_week.id,
            task_id=dev.id,
            day_of_week="monday",
            target_units=9.0,
        )

        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week_id"] == current_week.id
        assert data["week_start_date"] == "2026-04-20"
        assert data["unit_duration_minutes"] == 30
        assert data["daily_available_units"] == _daily_available_units(0.0)
        assert len(data["goals"]) == 1
        assert data["goals"][0]["task_name"] == "英語学習"
        assert data["goals"][0]["daily_targets"]["monday"] == 2.0
        assert data["goals"][0]["daily_targets"]["tuesday"] == 1.0
        assert data["goals"][0]["daily_targets"]["wednesday"] == 0.0
        # 当週にGoalがあるため has_current_goals=True, previous_goals=None
        assert data["has_current_goals"] is True
        assert data["previous_goals"] is None

    async def test_returns_empty_goals_when_not_configured(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        fixed_now: datetime,
    ):
        """目標未設定なら空配列を返す."""
        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week_id"] == current_week.id
        assert data["week_start_date"] == "2026-04-20"
        assert data["daily_available_units"] == _daily_available_units(0.0)
        assert data["goals"] == []
        assert data["has_current_goals"] is False
        assert data["previous_goals"] is None

    async def test_get_creates_current_week_if_missing(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        fixed_now: datetime,
    ):
        """current week 未作成でも GET で自動作成し 200 を返す."""
        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week_id"] is not None
        assert data["unit_duration_minutes"] == 30
        assert data["daily_available_units"] == _daily_available_units(0.0)
        assert data["goals"] == []
        assert data["has_current_goals"] is False
        assert data["previous_goals"] is None

        # DB に週レコードが作成されていることを確認
        from tasche.models.week import Week

        result = await db_session.execute(select(Week).where(Week.user_id == test_user.id))
        week = result.scalar_one_or_none()
        assert week is not None
        assert week.unit_duration_minutes == 30

    async def test_returns_previous_goals_when_current_not_configured(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        previous_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """当週未設定 + 過去週にGoalあり → previous_goals が返る."""
        english, _, _ = test_tasks
        await _add_goal(
            db_session,
            goal_id="gol_prev_mon",
            week_id=previous_week.id,
            task_id=english.id,
            day_of_week="monday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_prev_tue",
            week_id=previous_week.id,
            task_id=english.id,
            day_of_week="tuesday",
            target_units=1.0,
        )

        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["has_current_goals"] is False
        assert data["goals"] == []
        prev = data["previous_goals"]
        assert prev is not None
        assert prev["week_id"] == previous_week.id
        assert prev["week_start_date"] == "2026-04-13"
        assert len(prev["goals"]) == 1
        assert prev["goals"][0]["task_name"] == "英語学習"
        assert prev["goals"][0]["daily_targets"]["monday"] == 2.0
        assert prev["goals"][0]["daily_targets"]["tuesday"] == 1.0

    async def test_no_previous_goals_when_no_past_goals_exist(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        fixed_now: datetime,
    ):
        """当週未設定 + 過去週にもGoalなし → previous_goals = null."""
        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["has_current_goals"] is False
        assert data["previous_goals"] is None

    async def test_no_previous_goals_when_past_goals_all_archived(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        previous_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """当週未設定 + 過去週のGoalがすべてアーカイブ済みタスク → previous_goals = null."""
        _, _, archived = test_tasks
        await _add_goal(
            db_session,
            goal_id="gol_prev_archived_mon",
            week_id=previous_week.id,
            task_id=archived.id,
            day_of_week="monday",
            target_units=3.0,
        )

        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["has_current_goals"] is False
        assert data["previous_goals"] is None

    async def test_returns_most_recent_previous_week(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """複数の過去週がある場合、最も新しいWeekが選ばれる."""
        english, dev, _ = test_tasks

        # week_a: 2026-03-30 (古い)
        week_a = Week(
            id="wk_0ATEST1234567890ABCDEF",
            user_id=test_tasks[0].user_id,
            start_date=date(2026, 3, 30),
            end_date=date(2026, 4, 5),
            unit_duration_minutes=30,
            week_start_day="monday",
            week_start_hour=4,
        )
        # week_b: 2026-04-13 (新しい)
        week_b = Week(
            id="wk_0BTEST1234567890ABCDEF",
            user_id=test_tasks[0].user_id,
            start_date=date(2026, 4, 13),
            end_date=date(2026, 4, 19),
            unit_duration_minutes=60,
            week_start_day="monday",
            week_start_hour=4,
        )
        db_session.add_all([week_a, week_b])
        await db_session.commit()

        await _add_goal(
            db_session,
            goal_id="gol_week_a_mon",
            week_id=week_a.id,
            task_id=english.id,
            day_of_week="monday",
            target_units=1.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_week_b_mon",
            week_id=week_b.id,
            task_id=dev.id,
            day_of_week="monday",
            target_units=2.0,
        )

        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["has_current_goals"] is False
        prev = data["previous_goals"]
        assert prev is not None
        assert prev["week_id"] == week_b.id
        assert prev["week_start_date"] == "2026-04-13"
        assert prev["goals"][0]["task_name"] == "個人開発"

    async def test_previous_goals_excludes_archived_task_goals(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        previous_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """過去週のGoalに一部アーカイブ済みタスクが混ざる場合、アクティブなGoalのみ返る."""
        english, _, archived = test_tasks
        await _add_goal(
            db_session,
            goal_id="gol_prev_active_mon",
            week_id=previous_week.id,
            task_id=english.id,
            day_of_week="monday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_prev_archived_mon",
            week_id=previous_week.id,
            task_id=archived.id,
            day_of_week="monday",
            target_units=3.0,
        )

        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["has_current_goals"] is False
        prev = data["previous_goals"]
        assert prev is not None
        assert len(prev["goals"]) == 1
        assert prev["goals"][0]["task_name"] == "英語学習"

    async def test_other_user_previous_goals_not_returned(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        fixed_now: datetime,
    ):
        """別ユーザーの過去Goalは引用されない."""
        other_user = User(
            id="usr_02OTHER1234567890ABCDE",
            email="other@example.com",
            name="Other User",
            timezone="Asia/Tokyo",
        )
        db_session.add(other_user)
        await db_session.commit()
        other_task = Task(
            id="tsk_99OTHER1234567890ABCDE",
            user_id=other_user.id,
            name="他ユーザーのタスク",
            is_archived=False,
        )
        other_week = Week(
            id="wk_99OTHER1234567890ABCDE",
            user_id=other_user.id,
            start_date=date(2026, 4, 13),
            end_date=date(2026, 4, 19),
            unit_duration_minutes=30,
            week_start_day="monday",
            week_start_hour=4,
        )
        db_session.add_all([other_task, other_week])
        await db_session.commit()
        await _add_goal(
            db_session,
            goal_id="gol_other_user_mon",
            week_id=other_week.id,
            task_id=other_task.id,
            day_of_week="monday",
            target_units=5.0,
        )

        response = await authenticated_client.get("/api/weeks/current/goals")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["has_current_goals"] is False
        assert data["previous_goals"] is None


class TestUpdateCurrentGoals:
    """PUT /api/weeks/current/goals のテスト."""

    async def test_put_creates_current_week_if_missing(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        fixed_now: datetime,
    ):
        """current week 未作成でも PUT で自動作成し 200 を返す."""
        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 60,
                "goals": [],
            },
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week_id"] is not None
        assert data["unit_duration_minutes"] == 60

        # DB に週レコードが作成されていることを確認
        from tasche.models.week import Week

        result = await db_session.execute(select(Week).where(Week.user_id == test_user.id))
        week = result.scalar_one_or_none()
        assert week is not None
        assert week.unit_duration_minutes == 60

    async def test_put_saves_existing_task_goals(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """既存タスクの目標を保存できる."""
        english, _, _ = test_tasks

        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 60,
                "daily_available_units": {
                    **_daily_available_units(0.0),
                    "monday": 4.0,
                    "tuesday": 3.5,
                    "wednesday": 1.5,
                    "sunday": 1.0,
                },
                "goals": [
                    {
                        "task_id": english.id,
                        "daily_targets": {
                            **_daily_targets(0.0),
                            "monday": 2.0,
                            "wednesday": 1.5,
                        },
                    }
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["week_id"] == current_week.id
        assert data["week_start_date"] == "2026-04-20"
        assert data["unit_duration_minutes"] == 60
        assert data["daily_available_units"]["monday"] == 4.0
        assert data["daily_available_units"]["tuesday"] == 3.5
        assert data["daily_available_units"]["wednesday"] == 1.5
        assert data["daily_available_units"]["sunday"] == 1.0
        assert data["goals"][0]["task_id"] == english.id
        assert data["goals"][0]["daily_targets"]["wednesday"] == 1.5
        assert data["created_tasks"] == []

        await db_session.refresh(current_week)
        assert current_week.unit_duration_minutes == 60
        assert current_week.available_units_monday == 4.0
        assert current_week.available_units_tuesday == 3.5
        assert current_week.available_units_wednesday == 1.5
        assert current_week.available_units_sunday == 1.0

        result = await db_session.execute(select(Goal).where(Goal.week_id == current_week.id))
        goals = list(result.scalars())
        assert len(goals) == 7

        get_response = await authenticated_client.get("/api/weeks/current/goals")
        assert get_response.status_code == 200
        get_data = get_response.json()["data"]
        assert get_data["daily_available_units"]["monday"] == 4.0
        assert get_data["daily_available_units"]["tuesday"] == 3.5
        assert get_data["daily_available_units"]["wednesday"] == 1.5
        assert get_data["daily_available_units"]["sunday"] == 1.0

    async def test_put_creates_new_task_with_goals(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        fixed_now: datetime,
    ):
        """新規タスクを目標更新と同時に作成できる."""
        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 30,
                "daily_available_units": _daily_available_units(1.0),
                "goals": [
                    {
                        "task_id": None,
                        "new_task_name": "筋トレ",
                        "daily_targets": {
                            **_daily_targets(0.0),
                            "monday": 1.0,
                        },
                    }
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()["data"]
        created_task = data["created_tasks"][0]
        assert created_task["name"] == "筋トレ"
        assert data["goals"][0]["task_id"] == created_task["id"]

        task_result = await db_session.execute(select(Task).where(Task.id == created_task["id"]))
        task = task_result.scalar_one()
        assert task.name == "筋トレ"

        goal_result = await db_session.execute(select(Goal).where(Goal.task_id == task.id))
        assert len(list(goal_result.scalars())) == 7

    async def test_put_replaces_omitted_goals(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """リクエストに含まれないタスクの今週目標は削除される."""
        english, dev, _ = test_tasks
        await _add_goal(
            db_session,
            goal_id="gol_existing_english",
            week_id=current_week.id,
            task_id=english.id,
            day_of_week="monday",
            target_units=2.0,
        )
        await _add_goal(
            db_session,
            goal_id="gol_existing_dev",
            week_id=current_week.id,
            task_id=dev.id,
            day_of_week="monday",
            target_units=2.0,
        )

        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 30,
                "daily_available_units": _daily_available_units(1.0),
                "goals": [
                    {
                        "task_id": english.id,
                        "daily_targets": _daily_targets(1.0),
                    }
                ],
            },
        )

        assert response.status_code == 200
        result = await db_session.execute(select(Goal).where(Goal.week_id == current_week.id))
        goals = list(result.scalars())
        assert {goal.task_id for goal in goals} == {english.id}
        assert len(goals) == 7

    async def test_put_rejects_other_user_task(
        self,
        authenticated_client: AsyncClient,
        db_session: AsyncSession,
        current_week: Week,
        fixed_now: datetime,
    ):
        """他ユーザーのタスクは指定できない."""
        other_user = User(
            id="usr_02OTHER1234567890ABCDE",
            email="other@example.com",
            name="Other User",
            timezone="Asia/Tokyo",
        )
        db_session.add(other_user)
        await db_session.commit()
        other_task = Task(
            id="tsk_99OTHER1234567890ABCDE",
            user_id=other_user.id,
            name="他ユーザーのタスク",
            is_archived=False,
        )
        db_session.add(other_task)
        await db_session.commit()

        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 30,
                "daily_available_units": _daily_available_units(1.0),
                "goals": [{"task_id": other_task.id, "daily_targets": _daily_targets(1.0)}],
            },
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    async def test_put_rejects_archived_task(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """アーカイブ済みタスクは指定できない."""
        _, _, archived = test_tasks

        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 30,
                "daily_available_units": _daily_available_units(1.0),
                "goals": [{"task_id": archived.id, "daily_targets": _daily_targets(1.0)}],
            },
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    async def test_put_rejects_invalid_unit_duration(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """不正な unit duration は拒否する."""
        english, _, _ = test_tasks

        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 25,
                "goals": [{"task_id": english.id, "daily_targets": _daily_targets(1.0)}],
            },
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_put_rejects_daily_targets_exceeding_available_units(
        self,
        authenticated_client: AsyncClient,
        current_week: Week,
        test_tasks: tuple[Task, Task, Task],
        fixed_now: datetime,
    ):
        """曜日ごとの目標合計が確保可能ユニットを超える場合は拒否する."""
        english, dev, _ = test_tasks

        response = await authenticated_client.put(
            "/api/weeks/current/goals",
            json={
                "unit_duration_minutes": 30,
                "daily_available_units": {
                    **_daily_available_units(0.0),
                    "monday": 2.0,
                },
                "goals": [
                    {
                        "task_id": english.id,
                        "daily_targets": {
                            **_daily_targets(0.0),
                            "monday": 1.5,
                        },
                    },
                    {
                        "task_id": dev.id,
                        "daily_targets": {
                            **_daily_targets(0.0),
                            "monday": 1.0,
                        },
                    },
                ],
            },
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

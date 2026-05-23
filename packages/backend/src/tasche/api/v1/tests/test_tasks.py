"""タスク API のテスト."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.security import issue_access_token
from tasche.models.enums import DayOfWeek
from tasche.models.record import Record
from tasche.models.task import Task
from tasche.models.user import User
from tasche.models.week import Week
from tasche.services.record import calculate_current_week_start_date


class _LocalTokenService:
    """テスト用トークン発行サービス."""

    def create_token(self, user_id: str, email: str) -> str:
        token, _ = issue_access_token(user_id=user_id, email=email)
        return token


@pytest.fixture
def token_service() -> _LocalTokenService:
    """タスク API 用のローカルトークン発行サービス."""
    return _LocalTokenService()


@pytest.fixture
def auth_headers(token_service: _LocalTokenService):
    """認証ヘッダーを生成する."""

    def _auth_headers(user: User) -> dict[str, str]:
        token = token_service.create_token(user.id, user.email)
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


async def _create_user(
    db_session: AsyncSession,
    *,
    user_id: str,
    email: str,
    name: str = "Other User",
) -> User:
    """テスト用ユーザーを作成する."""
    user = User(
        id=user_id,
        email=email,
        name=name,
        timezone="Asia/Tokyo",
    )
    db_session.add(user)
    await db_session.commit()
    return user


async def _create_task(
    db_session: AsyncSession,
    user: User,
    *,
    task_id: str,
    name: str,
    is_archived: bool = False,
) -> Task:
    """テスト用タスクを作成する."""
    task = Task(
        id=task_id,
        user_id=user.id,
        name=name,
        is_archived=is_archived,
    )
    db_session.add(task)
    await db_session.commit()
    return task


async def _create_week(
    db_session: AsyncSession,
    user: User,
    *,
    week_id: str,
    start_date: datetime.date,
) -> Week:
    """テスト用週を作成する."""
    week = Week(
        id=week_id,
        user_id=user.id,
        start_date=start_date,
        end_date=start_date + timedelta(days=6),
        unit_duration_minutes=30,
        week_start_day="monday",
        week_start_hour=4,
    )
    db_session.add(week)
    await db_session.commit()
    return week


async def _create_record(
    db_session: AsyncSession,
    *,
    record_id: str,
    week: Week,
    task: Task,
    day_of_week: DayOfWeek,
    actual_units: float,
) -> Record:
    """テスト用レコードを作成する."""
    record = Record(
        id=record_id,
        week_id=week.id,
        task_id=task.id,
        day_of_week=day_of_week,
        actual_units=actual_units,
    )
    db_session.add(record)
    await db_session.commit()
    return record


def _get_last_week_start() -> datetime.date:
    """現在時刻から「先週の開始日」を計算する（テスト用）."""
    now = datetime.now(UTC)
    current_start = calculate_current_week_start_date(
        timezone_name="Asia/Tokyo",
        now=now,
        week_start_day="monday",
        week_start_hour=4,
    )
    return current_start - timedelta(days=7)


@pytest.fixture
async def test_tasks(db_session: AsyncSession, test_user: User) -> list[Task]:
    """テスト用タスクを作成."""
    tasks = [
        Task(
            id="tsk_01TEST1234567890ABCDEF",
            user_id=test_user.id,
            name="英語学習",
            is_archived=False,
        ),
        Task(
            id="tsk_02TEST1234567890ABCDEF",
            user_id=test_user.id,
            name="個人開発",
            is_archived=False,
        ),
        Task(
            id="tsk_03TEST1234567890ARCHIVED",
            user_id=test_user.id,
            name="アーカイブ済みタスク",
            is_archived=True,
        ),
    ]
    for task in tasks:
        db_session.add(task)
    await db_session.commit()
    return tasks


async def _get_task(db_session: AsyncSession, task_id: str) -> Task:
    """指定タスクを取得する."""
    result = await db_session.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one()


@pytest.mark.asyncio
async def test_get_tasks_success(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    auth_headers,
):
    """認証済みユーザーがタスク一覧を取得できる."""
    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    data = response.json()["data"]
    items = data["items"]

    # デフォルトではアーカイブ済みを含まない
    assert len(items) == 2
    assert items[0]["name"] == "英語学習"
    assert items[1]["name"] == "個人開発"

    # 全てのタスクがis_archived=False
    for item in items:
        assert item["is_archived"] is False
        assert item["consumed_units_last_week"] == 0.0
        assert item["consumed_units_total"] == 0.0


@pytest.mark.asyncio
async def test_get_tasks_include_archived(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    auth_headers,
):
    """include_archived=trueでアーカイブ済みタスクも取得できる."""
    response = await client.get(
        "/api/tasks?include_archived=true",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    items = data["items"]

    # アーカイブ済みを含めて3件
    assert len(items) == 3

    # アーカイブ済みタスクが含まれている
    archived_tasks = [t for t in items if t["is_archived"]]
    assert len(archived_tasks) == 1
    assert archived_tasks[0]["name"] == "アーカイブ済みタスク"


@pytest.mark.asyncio
async def test_get_tasks_empty(
    client: AsyncClient,
    test_user: User,
    auth_headers,
):
    """タスクが存在しない場合は空配列を返す."""
    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["per_page"] == 20


@pytest.mark.asyncio
async def test_get_tasks_unauthorized(client: AsyncClient):
    """認証なしでアクセスすると401."""
    response = await client.get("/api/tasks")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_tasks_invalid_token(client: AsyncClient):
    """無効なトークンで401."""
    response = await client.get(
        "/api/tasks",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_tasks_only_own_tasks(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_tasks: list[Task],
    auth_headers,
):
    """他ユーザーのタスクは取得できない."""
    other_user = await _create_user(
        db_session,
        user_id="usr_02OTHER1234567890ABCDE",
        email="other@example.com",
    )
    await _create_task(
        db_session,
        other_user,
        task_id="tsk_99OTHER1234567890ABCDE",
        name="他ユーザーのタスク",
    )

    response = await client.get(
        "/api/tasks?include_archived=true",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    items = data["items"]

    # test_userのタスクのみ取得（3件）
    assert len(items) == 3

    # 他ユーザーのタスクは含まれない
    task_ids = [t["id"] for t in items]
    assert "tsk_99OTHER1234567890ABCDE" not in task_ids


@pytest.mark.asyncio
async def test_get_tasks_response_format(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    auth_headers,
):
    """レスポンス形式が正しい."""
    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    json_data = response.json()

    # トップレベルにdataキーがある
    assert "data" in json_data

    # data に items/total/page/per_page がある
    assert set(json_data["data"].keys()) == {"items", "total", "page", "per_page"}
    assert isinstance(json_data["data"]["items"], list)

    # タスクの各フィールドが存在
    if json_data["data"]["items"]:
        task = json_data["data"]["items"][0]
        assert "id" in task
        assert "name" in task
        assert "is_archived" in task
        assert "consumed_units_last_week" in task
        assert "consumed_units_total" in task
        assert "created_at" in task
        assert "updated_at" in task


# --- 集計テスト ---


@pytest.mark.asyncio
async def test_get_tasks_returns_zero_units_when_no_records(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """recordが無い場合、両方0.0を返す."""
    await _create_task(
        db_session,
        test_user,
        task_id="tsk_ZERO001234567890ABCDEF",
        name="recordなし",
    )

    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["consumed_units_last_week"] == 0.0
    assert items[0]["consumed_units_total"] == 0.0


@pytest.mark.asyncio
async def test_get_tasks_aggregates_last_week_units(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """先週Weekのレコードが consumed_units_last_week に集計される."""
    task = await _create_task(
        db_session,
        test_user,
        task_id="tsk_AGG001234567890ABCDEF1",
        name="集計タスク",
    )
    last_week_start = _get_last_week_start()
    week = await _create_week(
        db_session,
        test_user,
        week_id="wk_LASTWEEK1234567890ABC1",
        start_date=last_week_start,
    )
    await _create_record(
        db_session,
        record_id="rec_LASTWEEK001234567890A1",
        week=week,
        task=task,
        day_of_week=DayOfWeek.MONDAY,
        actual_units=2.0,
    )
    await _create_record(
        db_session,
        record_id="rec_LASTWEEK001234567890A2",
        week=week,
        task=task,
        day_of_week=DayOfWeek.TUESDAY,
        actual_units=3.0,
    )

    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["consumed_units_last_week"] == 5.0
    assert items[0]["consumed_units_total"] == 5.0


@pytest.mark.asyncio
async def test_get_tasks_aggregates_total_units(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """複数週のレコードを consumed_units_total に集計し、先週分のみ consumed_units_last_week に集計する."""
    task = await _create_task(
        db_session,
        test_user,
        task_id="tsk_TOTAL01234567890ABCDEF",
        name="累計テストタスク",
    )
    last_week_start = _get_last_week_start()

    # 先週の2週間前のWeek
    two_weeks_ago_start = last_week_start - timedelta(days=7)
    week_two_weeks_ago = await _create_week(
        db_session,
        test_user,
        week_id="wk_TWOWEEKS1234567890ABC1",
        start_date=two_weeks_ago_start,
    )
    await _create_record(
        db_session,
        record_id="rec_TWOWEEKS001234567890A1",
        week=week_two_weeks_ago,
        task=task,
        day_of_week=DayOfWeek.MONDAY,
        actual_units=1.5,
    )

    # 先週のWeek
    week_last = await _create_week(
        db_session,
        test_user,
        week_id="wk_LASTWEEK1234567890ABCT",
        start_date=last_week_start,
    )
    await _create_record(
        db_session,
        record_id="rec_LASTWEEK001234567890T1",
        week=week_last,
        task=task,
        day_of_week=DayOfWeek.WEDNESDAY,
        actual_units=2.5,
    )

    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["consumed_units_last_week"] == 2.5
    assert items[0]["consumed_units_total"] == 4.0


@pytest.mark.asyncio
async def test_get_tasks_excludes_other_user_records(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """他ユーザーのレコードが集計に混入しない."""
    task = await _create_task(
        db_session,
        test_user,
        task_id="tsk_EXCL01234567890ABCDEF1",
        name="自ユーザーのタスク",
    )
    other_user = await _create_user(
        db_session,
        user_id="usr_EXCL01234567890ABCDE1",
        email="other-excl@example.com",
    )
    other_task = await _create_task(
        db_session,
        other_user,
        task_id="tsk_EXCL_OTHER01234567890A",
        name="他ユーザーのタスク",
    )
    last_week_start = _get_last_week_start()
    other_week = await _create_week(
        db_session,
        other_user,
        week_id="wk_EXCL_OTHER1234567890AB",
        start_date=last_week_start,
    )
    await _create_record(
        db_session,
        record_id="rec_EXCL_OTHER1234567890A1",
        week=other_week,
        task=other_task,
        day_of_week=DayOfWeek.MONDAY,
        actual_units=10.0,
    )

    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["id"] == task.id
    assert items[0]["consumed_units_last_week"] == 0.0
    assert items[0]["consumed_units_total"] == 0.0


@pytest.mark.asyncio
async def test_get_tasks_no_last_week_record_returns_zero(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """先週Weekが存在しない場合、consumed_units_last_week は 0.0。"""
    task = await _create_task(
        db_session,
        test_user,
        task_id="tsk_NOLW01234567890ABCDEF1",
        name="先週なしタスク",
    )
    # 今週より3週間前のWeekのみ作成（先週は存在しない）
    three_weeks_ago_start = _get_last_week_start() - timedelta(days=14)
    old_week = await _create_week(
        db_session,
        test_user,
        week_id="wk_OLD001234567890ABCDEF1",
        start_date=three_weeks_ago_start,
    )
    await _create_record(
        db_session,
        record_id="rec_OLD001234567890ABCDE11",
        week=old_week,
        task=task,
        day_of_week=DayOfWeek.FRIDAY,
        actual_units=4.0,
    )

    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["consumed_units_last_week"] == 0.0
    assert items[0]["consumed_units_total"] == 4.0


# --- ページングテスト ---


@pytest.mark.asyncio
async def test_get_tasks_pagination_first_page(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """25件のタスクを作成し、page=1, per_page=20 で20件を返す."""
    for i in range(25):
        db_session.add(
            Task(
                id=f"tsk_PAGE{i:03d}1234567890ABCDEF",
                user_id=test_user.id,
                name=f"タスク{i:03d}",
                is_archived=False,
            )
        )
    await db_session.commit()

    response = await client.get(
        "/api/tasks?page=1&per_page=20",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["items"]) == 20
    assert data["total"] == 25
    assert data["page"] == 1
    assert data["per_page"] == 20


@pytest.mark.asyncio
async def test_get_tasks_pagination_second_page(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """25件作成し、page=2 で残り5件を返す."""
    for i in range(25):
        db_session.add(
            Task(
                id=f"tsk_PG2{i:03d}1234567890ABCDEF",
                user_id=test_user.id,
                name=f"タスク2nd{i:03d}",
                is_archived=False,
            )
        )
    await db_session.commit()

    response = await client.get(
        "/api/tasks?page=2&per_page=20",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["items"]) == 5
    assert data["total"] == 25
    assert data["page"] == 2


@pytest.mark.asyncio
async def test_get_tasks_pagination_default_values(
    client: AsyncClient,
    test_user: User,
    auth_headers,
):
    """クエリ未指定で page=1, per_page=20 がデフォルト."""
    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["page"] == 1
    assert data["per_page"] == 20


@pytest.mark.asyncio
async def test_get_tasks_pagination_invalid_values_returns_422(
    client: AsyncClient,
    test_user: User,
    auth_headers,
):
    """異常値（page=0, per_page=999）は Query 制約で 422 を返す."""
    response = await client.get(
        "/api/tasks?page=0&per_page=999",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_tasks_pagination_order_by_created_at(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    auth_headers,
):
    """作成順で並んでいることを確認する."""
    names = ["タスクC", "タスクA", "タスクB"]
    for i, name in enumerate(names):
        db_session.add(
            Task(
                id=f"tsk_ORD{i:03d}1234567890ABCDEF",
                user_id=test_user.id,
                name=name,
                is_archived=False,
            )
        )
        await db_session.commit()

    response = await client.get("/api/tasks", headers=auth_headers(test_user))

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert [item["name"] for item in items] == names


# --- バルク削除テスト ---


class TestBulkDeleteTasks:
    """DELETE /api/tasks（バルク）のテスト."""

    @pytest.mark.asyncio
    async def test_bulk_delete_archives_multiple_tasks(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """3件指定 → 全件 archived_ids に、DB で is_archived=True."""
        task1 = await _create_task(
            db_session, test_user, task_id="tsk_BULK001234567890ABCDE1", name="タスク1"
        )
        task2 = await _create_task(
            db_session, test_user, task_id="tsk_BULK001234567890ABCDE2", name="タスク2"
        )
        task3 = await _create_task(
            db_session, test_user, task_id="tsk_BULK001234567890ABCDE3", name="タスク3"
        )

        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": [task1.id, task2.id, task3.id]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert set(data["archived_ids"]) == {task1.id, task2.id, task3.id}
        assert data["not_found_ids"] == []

        for task_id in [task1.id, task2.id, task3.id]:
            db_task = await _get_task(db_session, task_id)
            await db_session.refresh(db_task)
            assert db_task.is_archived is True

    @pytest.mark.asyncio
    async def test_bulk_delete_returns_not_found_for_other_users_tasks(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """他ユーザーのIDは not_found_ids に入る。他ユーザーのタスクは変更されない."""
        other_user = await _create_user(
            db_session,
            user_id="usr_BULK001234567890ABCDE",
            email="other-bulk@example.com",
        )
        other_task = await _create_task(
            db_session,
            other_user,
            task_id="tsk_BULK_OTHER1234567890A1",
            name="他ユーザータスク",
        )

        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": [other_task.id]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["archived_ids"] == []
        assert data["not_found_ids"] == [other_task.id]

        db_task = await _get_task(db_session, other_task.id)
        await db_session.refresh(db_task)
        assert db_task.is_archived is False

    @pytest.mark.asyncio
    async def test_bulk_delete_returns_not_found_for_nonexistent_id(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """存在しないIDは not_found_ids に入る."""
        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": ["tsk_NONEXISTENT1234567890"]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["archived_ids"] == []
        assert data["not_found_ids"] == ["tsk_NONEXISTENT1234567890"]

    @pytest.mark.asyncio
    async def test_bulk_delete_already_archived_is_not_found(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """既にアーカイブ済みのIDは not_found_ids に入る."""
        archived_task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_BULKALR01234567890ABCD",
            name="アーカイブ済み",
            is_archived=True,
        )

        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": [archived_task.id]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["archived_ids"] == []
        assert data["not_found_ids"] == [archived_task.id]

    @pytest.mark.asyncio
    async def test_bulk_delete_deduplicates_ids(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """同一ID重複 → archived_ids も not_found_ids も重複なし."""
        task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_BULKDUP01234567890ABCD",
            name="重複IDテスト",
        )

        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": [task.id, task.id, task.id]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["archived_ids"] == [task.id]
        assert data["not_found_ids"] == []

    @pytest.mark.asyncio
    async def test_bulk_delete_empty_ids_returns_422(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers,
    ):
        """ids=[] → 422（Pydantic の min_length=1 で弾く）."""
        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": []},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_bulk_delete_too_many_ids_returns_422(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers,
    ):
        """ids が 101 件 → 422."""
        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": [f"tsk_{i:030d}" for i in range(101)]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_bulk_delete_unauthorized(self, client: AsyncClient):
        """未認証 → 401."""
        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": ["tsk_SOMEVALIDID1234567890"]},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_bulk_delete_invalid_token(self, client: AsyncClient):
        """不正トークン → 401."""
        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": ["tsk_SOMEVALIDID1234567890"]},
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_bulk_delete_transactional(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """有効分は確実にアーカイブされ、not_found は混在可能。"""
        valid_task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_BULKTRX01234567890ABCD",
            name="有効タスク",
        )

        response = await client.request(
            "DELETE",
            "/api/tasks",
            json={"ids": [valid_task.id, "tsk_NONEXISTENT0000000001"]},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["archived_ids"] == [valid_task.id]
        assert data["not_found_ids"] == ["tsk_NONEXISTENT0000000001"]

        db_task = await _get_task(db_session, valid_task.id)
        await db_session.refresh(db_task)
        assert db_task.is_archived is True


class TestCreateTask:
    """POST /api/tasks のテスト."""

    @pytest.mark.asyncio
    async def test_create_task_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """認証済みユーザーがタスクを作成できる."""
        response = await client.post(
            "/api/tasks",
            json={"name": "  新規タスク  "},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 201
        task = response.json()["data"]
        assert task["id"].startswith("tsk_")
        assert task["name"] == "新規タスク"
        assert task["is_archived"] is False
        assert task["created_at"] == task["updated_at"]
        assert task["consumed_units_last_week"] == 0.0
        assert task["consumed_units_total"] == 0.0

        db_task = await _get_task(db_session, task["id"])
        assert db_task.user_id == test_user.id
        assert db_task.name == "新規タスク"
        assert db_task.is_archived is False

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name", ["   ", ])
    async def test_create_task_rejects_blank_name(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers,
        name: str,
    ):
        """空白のみのタスク名はサービス層で 400 になる."""
        response = await client.post(
            "/api/tasks",
            json={"name": name},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name", ["", "x" * 101])
    async def test_create_task_rejects_invalid_name_schema_level(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers,
        name: str,
    ):
        """空文字・101文字超えはスキーマレベルで 422 になる."""
        response = await client.post(
            "/api/tasks",
            json={"name": name},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_task_unauthorized(self, client: AsyncClient):
        """未認証では 401 になる."""
        response = await client.post("/api/tasks", json={"name": "タスク"})
        assert response.status_code == 401


class TestUpdateTask:
    """PUT /api/tasks/{task_id} のテスト."""

    @pytest.mark.asyncio
    async def test_update_task_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """所有する active タスクを更新できる."""
        task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_10UPDATE1234567890ABCDEF",
            name="更新前",
        )

        response = await client.put(
            f"/api/tasks/{task.id}",
            json={"name": "  更新後  "},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        updated_task = response.json()["data"]
        assert updated_task["id"] == task.id
        assert updated_task["name"] == "更新後"
        assert updated_task["is_archived"] is False
        assert updated_task["updated_at"] >= updated_task["created_at"]

        db_task = await _get_task(db_session, task.id)
        assert db_task.name == "更新後"

    @pytest.mark.asyncio
    async def test_update_task_unauthorized(self, client: AsyncClient):
        """未認証では 401 になる."""
        response = await client.put("/api/tasks/tsk_auth_check", json={"name": "更新後"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_task_invalid_token(self, client: AsyncClient):
        """無効なトークンでは 401 になる."""
        response = await client.put(
            "/api/tasks/tsk_auth_check",
            json={"name": "更新後"},
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_task_rejects_other_users_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """他ユーザーのタスクは 404 になる."""
        other_user = await _create_user(
            db_session,
            user_id="usr_99OTHER1234567890ABCDE",
            email="other-update@example.com",
        )
        other_task = await _create_task(
            db_session,
            other_user,
            task_id="tsk_99OTHERUPDATE123456789",
            name="他ユーザーのタスク",
        )

        response = await client.put(
            f"/api/tasks/{other_task.id}",
            json={"name": "更新後"},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_update_task_rejects_archived_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """アーカイブ済みタスクは 404 になる."""
        archived_task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_10ARCHIVED1234567890ABC",
            name="アーカイブ済み",
            is_archived=True,
        )

        response = await client.put(
            f"/api/tasks/{archived_task.id}",
            json={"name": "更新後"},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name", ["   ", ])
    async def test_update_task_rejects_blank_name(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
        name: str,
    ):
        """空白のみのタスク名はサービス層で 400 になる."""
        task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_11BLANK1234567890ABCDEF",
            name="更新前",
        )

        response = await client.put(
            f"/api/tasks/{task.id}",
            json={"name": name},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name", ["", "x" * 101])
    async def test_update_task_rejects_invalid_name_schema_level(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
        name: str,
    ):
        """空文字・101文字超えはスキーマレベルで 422 になる."""
        task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_11BLANK2234567890ABCDEF",
            name="更新前",
        )

        response = await client.put(
            f"/api/tasks/{task.id}",
            json={"name": name},
            headers=auth_headers(test_user),
        )

        assert response.status_code == 422


class TestDeleteTask:
    """DELETE /api/tasks/{task_id} のテスト."""

    @pytest.mark.asyncio
    async def test_delete_task_archives_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """所有する active タスクをアーカイブできる."""
        task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_20DELETE1234567890ABCDE",
            name="削除対象",
        )

        response = await client.delete(
            f"/api/tasks/{task.id}",
            headers=auth_headers(test_user),
        )

        assert response.status_code == 200
        archived_task = response.json()["data"]
        assert archived_task["id"] == task.id
        assert archived_task["name"] == "削除対象"
        assert archived_task["is_archived"] is True

        db_task = await _get_task(db_session, task.id)
        assert db_task.is_archived is True

        list_response = await client.get(
            "/api/tasks",
            headers=auth_headers(test_user),
        )
        assert task.id not in [item["id"] for item in list_response.json()["data"]["items"]]

    @pytest.mark.asyncio
    async def test_delete_task_unauthorized(self, client: AsyncClient):
        """未認証では 401 になる."""
        response = await client.delete("/api/tasks/tsk_auth_check")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_task_invalid_token(self, client: AsyncClient):
        """無効なトークンでは 401 になる."""
        response = await client.delete(
            "/api/tasks/tsk_auth_check",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_task_rejects_other_users_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """他ユーザーのタスクは 404 になる."""
        other_user = await _create_user(
            db_session,
            user_id="usr_88OTHER1234567890ABCDE",
            email="other-delete@example.com",
        )
        other_task = await _create_task(
            db_session,
            other_user,
            task_id="tsk_88OTHERDELETE123456789",
            name="他ユーザーのタスク",
        )

        response = await client.delete(
            f"/api/tasks/{other_task.id}",
            headers=auth_headers(test_user),
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_delete_task_rejects_archived_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        auth_headers,
    ):
        """アーカイブ済みタスクの再削除は 404 になる."""
        archived_task = await _create_task(
            db_session,
            test_user,
            task_id="tsk_21ARCHIVED1234567890ABC",
            name="アーカイブ済み",
            is_archived=True,
        )

        response = await client.delete(
            f"/api/tasks/{archived_task.id}",
            headers=auth_headers(test_user),
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

"""GET /api/tasks のテスト."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.test_auth import TestTokenService
from tasche.models.task import Task
from tasche.models.user import User


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


@pytest.mark.asyncio
async def test_get_tasks_success(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    token_service: TestTokenService,
):
    """認証済みユーザーがタスク一覧を取得できる."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    tasks = data["tasks"]

    # デフォルトではアーカイブ済みを含まない
    assert len(tasks) == 2
    assert tasks[0]["name"] == "英語学習"
    assert tasks[1]["name"] == "個人開発"

    # 全てのタスクがis_archived=False
    for task in tasks:
        assert task["is_archived"] is False


@pytest.mark.asyncio
async def test_get_tasks_include_archived(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    token_service: TestTokenService,
):
    """include_archived=trueでアーカイブ済みタスクも取得できる."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/tasks?include_archived=true",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    tasks = data["tasks"]

    # アーカイブ済みを含めて3件
    assert len(tasks) == 3

    # アーカイブ済みタスクが含まれている
    archived_tasks = [t for t in tasks if t["is_archived"]]
    assert len(archived_tasks) == 1
    assert archived_tasks[0]["name"] == "アーカイブ済みタスク"


@pytest.mark.asyncio
async def test_get_tasks_empty(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
):
    """タスクが存在しない場合は空配列を返す."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["tasks"] == []


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
    token_service: TestTokenService,
):
    """他ユーザーのタスクは取得できない."""
    # 別ユーザーを作成
    other_user = User(
        id="usr_02OTHER1234567890ABCDE",
        email="other@example.com",
        name="Other User",
        timezone="Asia/Tokyo",
    )
    db_session.add(other_user)
    await db_session.commit()

    # 別ユーザーのタスクを作成
    other_task = Task(
        id="tsk_99OTHER1234567890ABCDE",
        user_id=other_user.id,
        name="他ユーザーのタスク",
        is_archived=False,
    )
    db_session.add(other_task)
    await db_session.commit()

    # test_userでアクセス
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/tasks?include_archived=true",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    tasks = data["tasks"]

    # test_userのタスクのみ取得（3件）
    assert len(tasks) == 3

    # 他ユーザーのタスクは含まれない
    task_ids = [t["id"] for t in tasks]
    assert "tsk_99OTHER1234567890ABCDE" not in task_ids


@pytest.mark.asyncio
async def test_get_tasks_response_format(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    token_service: TestTokenService,
):
    """レスポンス形式が正しい."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    json_data = response.json()

    # トップレベルにdataキーがある
    assert "data" in json_data

    # data.tasksが配列
    assert "tasks" in json_data["data"]
    assert isinstance(json_data["data"]["tasks"], list)

    # タスクの各フィールドが存在
    if json_data["data"]["tasks"]:
        task = json_data["data"]["tasks"][0]
        assert "id" in task
        assert "name" in task
        assert "is_archived" in task
        assert "created_at" in task
        assert "updated_at" in task

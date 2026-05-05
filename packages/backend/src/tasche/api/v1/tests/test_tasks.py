"""タスク API のテスト."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.security import issue_access_token
from tasche.models.task import Task
from tasche.models.user import User


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
    token_service: _LocalTokenService,
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
    token_service: _LocalTokenService,
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
    token_service: _LocalTokenService,
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
    token_service: _LocalTokenService,
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
    token_service: _LocalTokenService,
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


class TestCreateTask:
    """POST /api/tasks のテスト."""

    @pytest.mark.asyncio
    async def test_create_task_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """認証済みユーザーがタスクを作成できる."""
        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.post(
            "/api/tasks",
            json={"name": "  新規タスク  "},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        task = response.json()["data"]
        assert task["id"].startswith("tsk_")
        assert task["name"] == "新規タスク"
        assert task["is_archived"] is False
        assert task["created_at"] == task["updated_at"]

        db_task = await _get_task(db_session, task["id"])
        assert db_task.user_id == test_user.id
        assert db_task.name == "新規タスク"
        assert db_task.is_archived is False

    @pytest.mark.asyncio
    async def test_create_task_rejects_blank_name(
        self,
        client: AsyncClient,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """空白のみのタスク名は 400 になる."""
        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.post(
            "/api/tasks",
            json={"name": "   "},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

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
        token_service: _LocalTokenService,
    ):
        """所有する active タスクを更新できる."""
        task = Task(
            id="tsk_10UPDATE1234567890ABCDEF",
            user_id=test_user.id,
            name="更新前",
            is_archived=False,
        )
        db_session.add(task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.put(
            f"/api/tasks/{task.id}",
            json={"name": "  更新後  "},
            headers={"Authorization": f"Bearer {token}"},
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
    async def test_update_task_rejects_other_users_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """他ユーザーのタスクは 404 になる."""
        other_user = User(
            id="usr_99OTHER1234567890ABCDE",
            email="other-update@example.com",
            name="Other User",
            timezone="Asia/Tokyo",
        )
        db_session.add(other_user)
        await db_session.commit()

        other_task = Task(
            id="tsk_99OTHERUPDATE123456789",
            user_id=other_user.id,
            name="他ユーザーのタスク",
            is_archived=False,
        )
        db_session.add(other_task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.put(
            f"/api/tasks/{other_task.id}",
            json={"name": "更新後"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_update_task_rejects_archived_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """アーカイブ済みタスクは 404 になる."""
        archived_task = Task(
            id="tsk_10ARCHIVED1234567890ABC",
            user_id=test_user.id,
            name="アーカイブ済み",
            is_archived=True,
        )
        db_session.add(archived_task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.put(
            f"/api/tasks/{archived_task.id}",
            json={"name": "更新後"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_update_task_rejects_blank_name(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """空白のみのタスク名は 400 になる."""
        task = Task(
            id="tsk_11BLANK1234567890ABCDEF",
            user_id=test_user.id,
            name="更新前",
            is_archived=False,
        )
        db_session.add(task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.put(
            f"/api/tasks/{task.id}",
            json={"name": "   "},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"


class TestDeleteTask:
    """DELETE /api/tasks/{task_id} のテスト."""

    @pytest.mark.asyncio
    async def test_delete_task_archives_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """所有する active タスクをアーカイブできる."""
        task = Task(
            id="tsk_20DELETE1234567890ABCDE",
            user_id=test_user.id,
            name="削除対象",
            is_archived=False,
        )
        db_session.add(task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.delete(
            f"/api/tasks/{task.id}",
            headers={"Authorization": f"Bearer {token}"},
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
            headers={"Authorization": f"Bearer {token}"},
        )
        assert task.id not in [item["id"] for item in list_response.json()["data"]["tasks"]]

    @pytest.mark.asyncio
    async def test_delete_task_rejects_other_users_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """他ユーザーのタスクは 404 になる."""
        other_user = User(
            id="usr_88OTHER1234567890ABCDE",
            email="other-delete@example.com",
            name="Other User",
            timezone="Asia/Tokyo",
        )
        db_session.add(other_user)
        await db_session.commit()

        other_task = Task(
            id="tsk_88OTHERDELETE123456789",
            user_id=other_user.id,
            name="他ユーザーのタスク",
            is_archived=False,
        )
        db_session.add(other_task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.delete(
            f"/api/tasks/{other_task.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_delete_task_rejects_archived_task(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        token_service: _LocalTokenService,
    ):
        """アーカイブ済みタスクの再削除は 404 になる."""
        archived_task = Task(
            id="tsk_21ARCHIVED1234567890ABC",
            user_id=test_user.id,
            name="アーカイブ済み",
            is_archived=True,
        )
        db_session.add(archived_task)
        await db_session.commit()

        token = token_service.create_token(test_user.id, test_user.email)

        response = await client.delete(
            f"/api/tasks/{archived_task.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "TASK_NOT_FOUND"

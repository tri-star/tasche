"""GET /api/users/me のテスト."""

# このファイルでは認証失敗パス（未認証・不正Cookie）や Cookie の明示的な渡し方の
# バリエーションを検証するため、authenticated_client ではなく auth_cookies ファクトリを直接使う。

import pytest
from httpx import AsyncClient

from tasche.models.user import User


@pytest.mark.asyncio
async def test_get_current_user_success(
    client: AsyncClient,
    test_user: User,
    auth_cookies,
):
    """認証済みユーザーが自分の情報を取得できる."""
    cookies = await auth_cookies(test_user)

    response = await client.get(
        "/api/users/me",
        cookies=cookies,
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == test_user.id
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name
    assert data["timezone"] == test_user.timezone


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """認証なしでアクセスすると401."""
    response = await client.get("/api/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    """無効なセッション Cookie で 401."""
    response = await client.get(
        "/api/users/me",
        cookies={"session": "invalid_session_token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_not_found(
    client: AsyncClient,
    db_session,
):
    """存在しないユーザーのセッションで 401."""
    # 存在しないユーザー ID でセッションを直接作成（FK 制約があるためユーザーを作成してから削除）
    # 実際には存在しないユーザーの session は外部キー制約で作れないため、
    # 代わりに有効セッションを持つユーザーを作成し、後でユーザーを削除する
    from sqlalchemy import delete
    from ulid import ULID

    from tasche.models.user import User
    from tasche.services.session import create_session

    user = User(
        id=f"usr_{ULID()}",
        email="todelete@example.com",
        name="To Delete",
        timezone="Asia/Tokyo",
    )
    db_session.add(user)
    await db_session.commit()

    _session, raw_token = await create_session(db_session, user_id=user.id)
    await db_session.commit()

    # ユーザーを削除（CASCADE で session も消える）
    await db_session.execute(delete(User).where(User.id == user.id))
    await db_session.commit()

    # 削除済みユーザーのセッションで /api/users/me にアクセス → 401（セッション無効）
    response = await client.get(
        "/api/users/me",
        cookies={"session": raw_token},
    )
    assert response.status_code == 401

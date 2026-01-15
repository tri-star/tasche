"""GET /api/users/me のテスト."""

import pytest
from httpx import AsyncClient

from tasche.core.test_auth import TestTokenService
from tasche.models.user import User


@pytest.mark.asyncio
async def test_get_current_user_success(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
):
    """認証済みユーザーが自分の情報を取得できる."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
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
    assert response.status_code == 401  # HTTPBearer returns 401 without token


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    """無効なトークンで401."""
    response = await client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_not_found(
    client: AsyncClient,
    token_service: TestTokenService,
):
    """存在しないユーザーIDで404."""
    token = token_service.create_token(
        "usr_99NOTEXIST99999999999", "notfound@example.com"
    )

    response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404

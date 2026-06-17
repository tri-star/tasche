"""GET /api/settings, PATCH /api/settings のテスト."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.test_auth import TestTokenService
from tasche.models.user import User


@pytest.mark.asyncio
async def test_get_settings_success(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
):
    """認証済みユーザーが自分の設定を取得できる."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/settings",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["timezone"] == "Asia/Tokyo"
    assert data["theme"] == "light"


@pytest.mark.asyncio
async def test_get_settings_unauthorized(client: AsyncClient):
    """認証なしでアクセスすると 401."""
    response = await client.get("/api/settings")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_patch_settings_update_timezone_and_theme(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
    db_session: AsyncSession,
):
    """timezone と theme を同時に更新できる."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={"timezone": "UTC", "theme": "dark"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["timezone"] == "UTC"
    assert data["theme"] == "dark"

    await db_session.refresh(test_user)
    assert test_user.timezone == "UTC"
    assert test_user.theme == "dark"


@pytest.mark.asyncio
async def test_patch_settings_update_timezone_only(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
    db_session: AsyncSession,
):
    """timezone のみ更新した場合、theme は変化しない."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={"timezone": "America/New_York"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["timezone"] == "America/New_York"
    assert data["theme"] == "light"

    await db_session.refresh(test_user)
    assert test_user.timezone == "America/New_York"
    assert test_user.theme == "light"


@pytest.mark.asyncio
async def test_patch_settings_update_theme_only(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
    db_session: AsyncSession,
):
    """theme のみ更新した場合、timezone は変化しない."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={"theme": "dark"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["timezone"] == "Asia/Tokyo"
    assert data["theme"] == "dark"

    await db_session.refresh(test_user)
    assert test_user.timezone == "Asia/Tokyo"
    assert test_user.theme == "dark"


@pytest.mark.asyncio
async def test_patch_settings_invalid_timezone(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
):
    """不正な timezone を送ると 400 が返る."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={"timezone": "Invalid/Zone"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "Invalid timezone" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_patch_settings_invalid_theme(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
):
    """不正な theme 値（Literal 外）を送ると 422 が返る."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={"theme": "blue"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_patch_settings_empty_body(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
    db_session: AsyncSession,
):
    """空ボディ（{}）を送っても 200 で何も変更されない."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["timezone"] == "Asia/Tokyo"
    assert data["theme"] == "light"

    await db_session.refresh(test_user)
    assert test_user.timezone == "Asia/Tokyo"
    assert test_user.theme == "light"


@pytest.mark.asyncio
async def test_patch_settings_update_theme_system(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
    db_session: AsyncSession,
):
    """theme を "system" に更新できる（DB 永続化も確認）."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.patch(
        "/api/settings",
        json={"theme": "system"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["theme"] == "system"

    await db_session.refresh(test_user)
    assert test_user.theme == "system"


@pytest.mark.asyncio
async def test_get_settings_returns_system_theme(
    client: AsyncClient,
    test_user: User,
    token_service: TestTokenService,
    db_session: AsyncSession,
):
    """PATCH で "system" に更新後、GET でも "system" が返ること."""
    token = token_service.create_token(test_user.id, test_user.email)

    # まず PATCH で "system" に更新
    patch_response = await client.patch(
        "/api/settings",
        json={"theme": "system"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_response.status_code == 200

    # 次に GET で確認
    get_response = await client.get(
        "/api/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_response.status_code == 200
    data = get_response.json()["data"]
    assert data["theme"] == "system"


@pytest.mark.asyncio
async def test_patch_settings_unauthorized(client: AsyncClient):
    """認証なしで PATCH すると 401."""
    response = await client.patch(
        "/api/settings",
        json={"theme": "dark"},
    )
    assert response.status_code == 401

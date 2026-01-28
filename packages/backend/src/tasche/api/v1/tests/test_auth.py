"""認証エンドポイントのテスト."""

import pytest
from httpx import AsyncClient

from tasche.core.test_auth import TestTokenService
from tasche.models.user import User


class TestLogin:
    """ログインエンドポイントのテスト."""

    @pytest.mark.asyncio
    async def test_login_redirects_to_auth0(self, client: AsyncClient):
        """loginがAuth0にリダイレクトすること."""
        response = await client.get("/api/auth/login", follow_redirects=False)

        assert response.status_code == 302
        location = response.headers.get("location", "")

        # Auth0のauthorizeエンドポイントにリダイレクトされることを確認
        assert "authorize" in location
        assert "response_type=code" in location

        # PKCE対応の確認
        assert "code_challenge=" in location
        assert "code_challenge_method=S256" in location

        # stateパラメータの確認
        assert "state=" in location


class TestExistingAuthFlow:
    """既存の認証フローが引き続き動作することを確認."""

    @pytest.mark.asyncio
    async def test_test_auth_still_works(
        self,
        client: AsyncClient,
        test_user: User,
        token_service: TestTokenService,
    ):
        """テスト認証が引き続き動作すること."""
        # テスト用JWTトークンを発行
        token = token_service.create_token(test_user.id, test_user.email)

        # トークンを使ってAPIにアクセス
        response = await client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        # 正常に認証されることを確認
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email

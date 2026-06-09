"""core/security.py のユニットテスト."""

import time
from unittest.mock import patch

import pytest
from fastapi.security import HTTPAuthorizationCredentials

from tasche.core.config import settings
from tasche.core.exceptions import InvalidTokenError
from tasche.core.security import (
    _decode_app_jwt,
    _decode_stub_jwt,
    get_current_user_sub,
    issue_access_token,
    issue_stub_access_token,
)


class TestIssueAccessToken:
    """issue_access_token のテスト."""

    def test_issue_and_decode_app_jwt(self):
        """自前 JWT を発行し、デコードで sub が取れることを確認."""
        token, expires_in = issue_access_token(user_id="usr_test123", email="test@example.com")
        assert isinstance(token, str)
        assert expires_in == settings.jwt_access_token_expires_seconds

        payload = _decode_app_jwt(token)
        assert payload["sub"] == "usr_test123"
        assert payload["email"] == "test@example.com"
        assert "iat" in payload
        assert "exp" in payload

    def test_issued_token_expires_in_future(self):
        """発行した JWT の exp が現在時刻より後であることを確認."""
        token, _ = issue_access_token(user_id="usr_test", email="test@example.com")
        payload = _decode_app_jwt(token)
        assert payload["exp"] > time.time()


class TestIssueStubAccessToken:
    """issue_stub_access_token のテスト."""

    def test_issue_stub_token_has_stub_claim(self):
        """スタブ JWT に stub=True クレームが含まれることを確認."""
        with patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret"):
            token, _ = issue_stub_access_token(user_id="usr_stub", email="stub@example.com")
            payload = _decode_stub_jwt(token)
            assert payload["stub"] is True
            assert payload["sub"] == "usr_stub"

    def test_stub_token_rejected_without_stub_claim(self):
        """stub クレームなしのトークンをスタブ JWT として検証するとエラーになることを確認."""
        from joserfc import jwt
        from joserfc.errors import JoseError
        from joserfc.jwk import OctKey

        # stub クレームを含まないトークン
        with patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret"):
            key = OctKey.import_key(b"test_stub_secret")
            payload = {"sub": "usr_test", "email": "test@example.com"}
            token = jwt.encode({"alg": "HS256"}, payload, key)

            with pytest.raises(JoseError):
                _decode_stub_jwt(token)


class TestGetCurrentUserSub:
    """get_current_user_sub 依存関数のテスト."""

    @pytest.mark.asyncio
    async def test_valid_app_jwt_returns_sub(self):
        """有効な自前 JWT で sub が返ることを確認."""
        token, _ = issue_access_token(user_id="usr_test123", email="test@example.com")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        sub = await get_current_user_sub(credentials)
        assert sub == "usr_test123"

    @pytest.mark.asyncio
    async def test_stub_jwt_works_when_stub_enabled(self):
        """スタブ有効時にスタブ JWT で sub が返ることを確認."""
        with (
            patch.object(settings, "app_env", "local"),
            patch.object(settings, "auth_stub_enabled", True),
            patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret"),
        ):
            token, _ = issue_stub_access_token(user_id="usr_stub", email="stub@example.com")
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            sub = await get_current_user_sub(credentials)
            assert sub == "usr_stub"

    @pytest.mark.asyncio
    async def test_stub_jwt_rejected_when_stub_disabled(self):
        """スタブ無効時にスタブ JWT が 401 を返すことを確認."""
        with (
            patch.object(settings, "app_env", "production"),
            patch.object(settings, "auth_stub_enabled", True),
            patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret"),
        ):
            # スタブ JWT を作成（スタブ無効環境で使用しようとする）
            token, _ = issue_stub_access_token(user_id="usr_stub", email="stub@example.com")
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

            with pytest.raises(InvalidTokenError):
                await get_current_user_sub(credentials)

    @pytest.mark.asyncio
    async def test_stub_jwt_without_stub_claim_rejected(self):
        """stub クレームなしのトークンがスタブ JWT として拒否されることを確認."""
        from joserfc import jwt
        from joserfc.jwk import OctKey

        with (
            patch.object(settings, "app_env", "local"),
            patch.object(settings, "auth_stub_enabled", True),
            patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret"),
        ):
            # stub クレームなし
            key = OctKey.import_key(b"test_stub_secret")
            payload = {"sub": "usr_test", "email": "test@example.com"}
            token = jwt.encode({"alg": "HS256"}, payload, key)
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

            with pytest.raises(InvalidTokenError):
                await get_current_user_sub(credentials)

    @pytest.mark.asyncio
    async def test_expired_token_raises_invalid_token(self):
        """期限切れトークンで InvalidTokenError が raise されることを確認."""
        from joserfc import jwt
        from joserfc.jwk import OctKey

        # exp を過去に設定したトークン
        payload = {
            "sub": "usr_test",
            "email": "test@example.com",
            "exp": int(time.time()) - 3600,  # 1時間前
        }
        secret_bytes = (
            settings.jwt_secret.encode()
            if isinstance(settings.jwt_secret, str)
            else settings.jwt_secret
        )
        key = OctKey.import_key(secret_bytes)
        token = jwt.encode({"alg": settings.jwt_algorithm}, payload, key)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with (
            patch.object(settings, "app_env", "production"),
            patch.object(settings, "auth_stub_enabled", False),
        ):
            with pytest.raises(InvalidTokenError):
                await get_current_user_sub(credentials)

    @pytest.mark.asyncio
    async def test_invalid_token_raises_invalid_token(self):
        """無効なトークンで InvalidTokenError が raise されることを確認."""
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not_a_valid_jwt")

        with (
            patch.object(settings, "app_env", "production"),
            patch.object(settings, "auth_stub_enabled", False),
        ):
            with pytest.raises(InvalidTokenError):
                await get_current_user_sub(credentials)

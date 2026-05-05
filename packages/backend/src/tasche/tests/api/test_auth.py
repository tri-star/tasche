"""認証 API の統合テスト."""

from unittest.mock import patch

import respx
from httpx import AsyncClient, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.tests.conftest import make_google_id_token

# ============================================================
# ヘルパ
# ============================================================


def _mock_google_token_success(id_token: str):
    """Google /token エンドポイントの成功レスポンスをモック."""
    return {
        "access_token": "google_access_token_dummy",
        "id_token": id_token,
        "token_type": "Bearer",
        "expires_in": 3599,
    }


# ============================================================
# GET /api/auth/google/authorize テスト
# ============================================================


class TestGoogleAuthorize:
    """GET /api/auth/google/authorize のテスト."""

    async def test_authorize_returns_url_and_state(self, client: AsyncClient):
        """正常系: authorization_url と state が返ることを確認."""
        # settings.google_oauth_redirect_uris でプロパティを制御
        with patch.object(
            settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
        ):
            response = await client.get(
                "/api/auth/google/authorize",
                params={
                    "code_challenge": "test_challenge_value",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "authorization_url" in data["data"]
        assert "state" in data["data"]
        assert "accounts.google.com" in data["data"]["authorization_url"]

    async def test_authorize_rejects_invalid_redirect_uri(self, client: AsyncClient):
        """異常系: 許可外の redirect_uri で 400 を返すことを確認."""
        with patch.object(
            settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
        ):
            response = await client.get(
                "/api/auth/google/authorize",
                params={
                    "code_challenge": "test_challenge_value",
                    "redirect_uri": "http://evil.example.com/callback",
                },
            )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"

    async def test_authorize_rejects_invalid_challenge_method(self, client: AsyncClient):
        """異常系: S256 以外の code_challenge_method で 400 を返すことを確認."""
        with patch.object(
            settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
        ):
            response = await client.get(
                "/api/auth/google/authorize",
                params={
                    "code_challenge": "test_challenge_value",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "code_challenge_method": "plain",
                },
            )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"


# ============================================================
# POST /api/auth/google/callback テスト
# ============================================================


class TestGoogleCallback:
    """POST /api/auth/google/callback のテスト."""

    async def test_callback_creates_new_user(
        self,
        client: AsyncClient,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """正常系: 新規ユーザーが作成され、access_token と Cookie が返ることを確認."""
        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_new_user",
            email="newuser@example.com",
            name="New User",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "access_token" in data["data"]
        assert data["data"]["token_type"] == "Bearer"
        assert "refresh_token" in response.cookies

    async def test_callback_links_existing_email_user(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """正常系: 同じ email かつ email_verified_at 設定済みユーザーへ紐付けが行われることを確認."""
        from datetime import datetime, timezone

        from ulid import ULID

        from tasche.models.user import User

        # 既存ユーザー（google_sub=None, email_verified_at=設定済み）を作成
        existing_user = User(
            id=f"usr_{ULID()}",
            email="existing@example.com",
            name="Existing User",
            google_sub=None,
            email_verified_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        db_session.add(existing_user)
        await db_session.commit()

        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_existing",
            email="existing@example.com",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        assert response.status_code == 200

        # 既存ユーザーの google_sub が更新されていることを確認
        await db_session.refresh(existing_user)
        assert existing_user.google_sub == "google_sub_existing"
        # email_verified_at が更新されていることを確認
        assert existing_user.email_verified_at is not None

    async def test_callback_rejects_unverified_existing_user(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """異常系: email_verified_at=None の既存ユーザーへの自動紐付けが拒否されることを確認."""
        from ulid import ULID

        from tasche.models.user import User

        # 未検証の既存ユーザー（email_verified_at=None, google_sub=None）を作成
        unverified_user = User(
            id=f"usr_{ULID()}",
            email="unverified_existing@example.com",
            name="Unverified User",
            google_sub=None,
            email_verified_at=None,
        )
        db_session.add(unverified_user)
        await db_session.commit()

        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_for_unverified",
            email="unverified_existing@example.com",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        # 自動紐付けが拒否されることを確認
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_AUTHORIZATION_CODE"

        # 既存ユーザーの google_sub が変更されていないことを確認
        await db_session.refresh(unverified_user)
        assert unverified_user.google_sub is None

    async def test_callback_does_not_overwrite_existing_google_sub(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """別のGoogleアカウントが紐付いている場合は400エラーを返す."""
        from ulid import ULID

        from tasche.models.user import User

        # 既存ユーザー（既に別の google_sub が設定済み）を作成
        existing_user = User(
            id=f"usr_{ULID()}",
            email="linked@example.com",
            name="Linked User",
            google_sub="old_google_sub",
        )
        db_session.add(existing_user)
        await db_session.commit()

        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="new_google_sub",
            email="linked@example.com",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        # 既存ユーザーの google_sub は上書きされていないことを確認
        await db_session.refresh(existing_user)
        assert existing_user.google_sub == "old_google_sub"
        # 別の Google アカウントが紐付いている場合は 400 エラーを返す
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_AUTHORIZATION_CODE"

    async def test_callback_google_error_returns_invalid_code(
        self,
        client: AsyncClient,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """異常系: Google /token が 400 を返すと INVALID_AUTHORIZATION_CODE になることを確認."""
        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(400, json={"error": "invalid_grant"})
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "invalid_code",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_AUTHORIZATION_CODE"

    async def test_callback_email_not_verified_returns_invalid_code(
        self,
        client: AsyncClient,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """異常系: email_verified=false のとき INVALID_AUTHORIZATION_CODE になることを確認."""
        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_unverified",
            email="unverified@example.com",
            email_verified=False,
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_AUTHORIZATION_CODE"

    async def test_callback_invalid_redirect_uri(self, client: AsyncClient):
        """異常系: 許可外の redirect_uri で 400 を返すことを確認."""
        with patch.object(
            settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
        ):
            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://evil.example.com/callback",
                    "state": "state_dummy",
                },
            )
        assert response.status_code == 400

    async def test_callback_creates_current_week_for_new_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """正常系: 新規ユーザーのコールバック後に current week が作成されていることを確認."""
        from tasche.models.user import User
        from tasche.models.week import Week

        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_week_test",
            email="weektest@example.com",
            name="Week Test User",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )

            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        assert response.status_code == 200

        # ユーザーを取得して weeks テーブルに行があることを確認
        user_result = await db_session.execute(
            select(User).where(User.email == "weektest@example.com")
        )
        user = user_result.scalar_one()

        week_result = await db_session.execute(select(Week).where(Week.user_id == user.id))
        week = week_result.scalar_one_or_none()
        assert week is not None
        assert week.unit_duration_minutes == 30


# ============================================================
# POST /api/auth/refresh テスト
# ============================================================


class TestRefresh:
    """POST /api/auth/refresh のテスト."""

    async def _create_user_and_refresh_token(
        self, client: AsyncClient, rsa_private_key_pem: str, test_jwks: dict
    ):
        """テスト用ユーザーとリフレッシュトークンを作成するヘルパ."""
        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_refresh_test",
            email="refresh_test@example.com",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )
            response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )
        return response

    async def test_refresh_returns_new_token(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """正常系: リフレッシュで新しい access_token と Cookie が返ることを確認."""
        callback_response = await self._create_user_and_refresh_token(
            client, rsa_private_key_pem, test_jwks
        )
        assert callback_response.status_code == 200
        old_refresh_cookie = callback_response.cookies.get("refresh_token")
        assert old_refresh_cookie

        response = await client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": old_refresh_cookie},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data["data"]

        # 新しい Cookie が発行されていること
        new_refresh_cookie = response.cookies.get("refresh_token")
        assert new_refresh_cookie
        assert new_refresh_cookie != old_refresh_cookie

    async def test_refresh_without_cookie_returns_401(self, client: AsyncClient):
        """異常系: Cookie なしで 401 を返すことを確認."""
        response = await client.post("/api/auth/refresh")
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "INVALID_REFRESH_TOKEN"

    async def test_refresh_reuse_detection(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """再利用検知: revoke 済みトークンを再使用すると全 refresh が revoke されることを確認."""
        callback_response = await self._create_user_and_refresh_token(
            client, rsa_private_key_pem, test_jwks
        )
        old_refresh_cookie = callback_response.cookies["refresh_token"]

        # 1回目のリフレッシュ（正常）
        first_refresh = await client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": old_refresh_cookie},
        )
        assert first_refresh.status_code == 200
        new_refresh_cookie = first_refresh.cookies.get("refresh_token")

        # 2回目: 既に revoke された古いトークンを再使用（再利用検知）
        reuse_response = await client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": old_refresh_cookie},
        )
        assert reuse_response.status_code == 401
        data = reuse_response.json()
        assert data["error"]["code"] == "INVALID_REFRESH_TOKEN"

        # 新しいトークンも使えなくなっていることを確認（全 revoke）
        if new_refresh_cookie:
            third_response = await client.post(
                "/api/auth/refresh",
                cookies={"refresh_token": new_refresh_cookie},
            )
            assert third_response.status_code == 401


# ============================================================
# POST /api/auth/logout テスト
# ============================================================


class TestLogout:
    """POST /api/auth/logout のテスト."""

    async def test_logout_with_cookie_revokes_and_clears(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """正常系: Cookie あり -> revoke + Cookie 削除."""
        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_logout_test",
            email="logout_test@example.com",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )
            callback_response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        refresh_cookie = callback_response.cookies.get("refresh_token")
        assert refresh_cookie

        logout_response = await client.post(
            "/api/auth/logout",
            cookies={"refresh_token": refresh_cookie},
        )
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert "message" in data["data"]

    async def test_logout_without_cookie_returns_200(self, client: AsyncClient):
        """冪等性テスト: Cookie なしでも 200 を返すことを確認."""
        response = await client.post("/api/auth/logout")
        assert response.status_code == 200


# ============================================================
# POST /api/auth/stub-login テスト
# ============================================================


class TestStubLogin:
    """POST /api/auth/stub-login のテスト."""

    async def test_stub_login_service_works(self, db_session):
        """正常系: スタブログインサービスが動作することを確認."""
        with (
            patch.object(settings, "app_env", "local"),
            patch.object(settings, "auth_stub_enabled", True),
            patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret_12345678"),
        ):
            from tasche.services.auth import stub_login as _stub_login

            user, access_token, raw_refresh_token = await _stub_login(
                db_session,
                email="stubuser@example.com",
                name="Stub User",
            )

        assert user.email == "stubuser@example.com"
        assert isinstance(access_token, str)
        assert isinstance(raw_refresh_token, str)

        # スタブ JWT を検証
        from jose import jwt

        payload = jwt.decode(access_token, "test_stub_secret_12345678", algorithms=["HS256"])
        assert payload["stub"] is True
        assert payload["sub"] == user.id

        # current week が作成されていることを確認
        from tasche.models.week import Week

        week_result = await db_session.execute(select(Week).where(Week.user_id == user.id))
        week = week_result.scalar_one_or_none()
        assert week is not None
        assert week.unit_duration_minutes == 30

    async def test_stub_login_endpoint_not_found_in_production(self):
        """本番安全性: production 環境ではスタブログインが 404 になることを確認.

        auth.py の `if is_auth_stub_enabled(...)` がモジュールロード時に評価されるため、
        production 環境では endpoint が登録されない。
        is_auth_stub_enabled("production", True) == False を確認する。
        """
        from tasche.core.env import is_auth_stub_enabled

        # production + auth_stub_enabled=True でも False になることを確認
        assert is_auth_stub_enabled("production", True) is False


# ============================================================
# GET /api/users/me: 自前 JWT / スタブ JWT 双方のテスト
# ============================================================


class TestUsersMeWithJwt:
    """GET /api/users/me が自前 JWT / スタブ JWT 両方で通ることを確認."""

    async def test_users_me_with_app_jwt(
        self,
        client: AsyncClient,
        db_session,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """自前 JWT で /api/users/me にアクセスできることを確認."""
        id_token = make_google_id_token(
            rsa_private_key_pem,
            sub="google_sub_me_test",
            email="me_test@example.com",
            aud="test_client_id",
        )

        with (
            patch.object(
                settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
            ),
            patch.object(settings, "google_oauth_client_id", "test_client_id"),
            respx.mock as mock,
        ):
            mock.post("https://oauth2.googleapis.com/token").mock(
                return_value=Response(200, json=_mock_google_token_success(id_token))
            )
            mock.get("https://www.googleapis.com/oauth2/v3/certs").mock(
                return_value=Response(200, json=test_jwks)
            )
            callback_response = await client.post(
                "/api/auth/google/callback",
                json={
                    "code": "auth_code_dummy",
                    "code_verifier": "code_verifier_dummy",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "state_dummy",
                },
            )

        assert callback_response.status_code == 200
        access_token = callback_response.json()["data"]["access_token"]

        me_response = await client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["data"]["email"] == "me_test@example.com"

    async def test_users_me_with_stub_jwt(
        self,
        client: AsyncClient,
        db_session,
    ):
        """スタブ JWT で /api/users/me にアクセスできることを確認."""
        from ulid import ULID

        from tasche.core.security import issue_stub_access_token
        from tasche.models.user import User

        # テスト用ユーザーを作成
        user = User(
            id=f"usr_{ULID()}",
            email="stub_me@example.com",
            name="Stub Me",
        )
        db_session.add(user)
        await db_session.commit()

        with (
            patch.object(settings, "app_env", "local"),
            patch.object(settings, "auth_stub_enabled", True),
            patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret_12345678"),
        ):
            token, _ = issue_stub_access_token(user_id=user.id, email=user.email)

            response = await client.get(
                "/api/users/me",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert response.status_code == 200
        assert response.json()["data"]["email"] == "stub_me@example.com"

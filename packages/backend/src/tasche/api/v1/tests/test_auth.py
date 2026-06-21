"""認証 API の統合テスト（Google OAuth 2.0）."""

from unittest.mock import patch

import respx
from httpx import AsyncClient, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.tests.helpers.google_oauth import make_google_id_token

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
        """正常系: authorization_url と state が返ることを確認（state はフロントから受け取りそのまま返す）."""
        # settings.google_oauth_redirect_uris でプロパティを制御
        with patch.object(
            settings, "google_oauth_redirect_uris", "http://localhost:5173/auth/callback"
        ):
            response = await client.get(
                "/api/auth/google/authorize",
                params={
                    "code_challenge": "test_challenge_value",
                    "redirect_uri": "http://localhost:5173/auth/callback",
                    "state": "test_state_value",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "authorization_url" in data["data"]
        assert "state" in data["data"]
        # フロントが渡した state がそのまま返ること（RFC 6819: クライアント生成の state を往復）
        assert data["data"]["state"] == "test_state_value"
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
                    "state": "test_state_value",
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
                    "state": "test_state_value",
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
        """正常系: 新規ユーザーが作成され、session Cookie とユーザー情報が返ることを確認."""
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
        # レスポンスがユーザー情報であることを確認
        assert "id" in data["data"]
        assert data["data"]["email"] == "newuser@example.com"
        assert "access_token" not in data["data"]
        # session Cookie が発行されていることを確認
        assert "session" in response.cookies

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
# POST /api/auth/logout テスト
# ============================================================


class TestLogout:
    """POST /api/auth/logout のテスト."""

    async def test_logout_with_cookie_revokes_and_clears(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """正常系: session Cookie あり -> revoke + Cookie 削除 + 同 Cookie で 401."""
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

        session_cookie = callback_response.cookies.get("session")
        assert session_cookie, "callback 後 session Cookie が発行されていること"

        # logout 実行
        logout_response = await client.post(
            "/api/auth/logout",
            cookies={"session": session_cookie},
        )
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert "message" in data["data"]

        # logout 後に同じ session Cookie で /api/users/me が 401 になることを確認（即時 revoke）
        me_response = await client.get(
            "/api/users/me",
            cookies={"session": session_cookie},
        )
        assert me_response.status_code == 401

    async def test_logout_without_cookie_returns_200(self, client: AsyncClient):
        """冪等性テスト: Cookie なしでも 200 を返すことを確認."""
        response = await client.post("/api/auth/logout")
        assert response.status_code == 200


# ============================================================
# POST /api/auth/stub-login テスト
# ============================================================


class TestStubLogin:
    """POST /api/auth/stub-login のテスト."""

    async def test_stub_login_service_works(self, db_session: AsyncSession):
        """正常系: スタブログインサービスが session を発行することを確認."""
        with (
            patch.object(settings, "app_env", "local"),
            patch.object(settings, "auth_stub_enabled", True),
        ):
            from tasche.services.auth import stub_login as _stub_login

            user, raw_session_token = await _stub_login(
                db_session,
                email="stubuser@example.com",
                name="Stub User",
            )

        assert user.email == "stubuser@example.com"
        assert isinstance(raw_session_token, str)
        assert len(raw_session_token) > 0

        # sessions テーブルに行があることを確認
        from tasche.models.session import Session
        from tasche.services.session import _hash_token

        token_hash = _hash_token(raw_session_token)
        session_result = await db_session.execute(
            select(Session).where(Session.token_hash == token_hash)
        )
        session = session_result.scalar_one_or_none()
        assert session is not None
        assert session.user_id == user.id

        # current week が作成されていることを確認
        from tasche.models.week import Week

        week_result = await db_session.execute(select(Week).where(Week.user_id == user.id))
        week = week_result.scalar_one_or_none()
        assert week is not None
        assert week.unit_duration_minutes == 30

    async def test_stub_login_endpoint_not_found_in_production(self):
        """本番安全性: production 環境ではスタブログインが 404 になることを確認."""
        from tasche.core.env import is_auth_stub_enabled

        # production + auth_stub_enabled=True でも False になることを確認
        assert is_auth_stub_enabled("production", True) is False

    async def test_stub_login_endpoint_sets_session_cookie(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """stub-login エンドポイントが session Cookie を発行し、その Cookie で /api/users/me が通ること."""
        response = await client.post(
            "/api/auth/stub-login",
            json={"email": "stub_endpoint@example.com", "name": "Stub Endpoint User"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["data"]["email"] == "stub_endpoint@example.com"
        assert "id" in data["data"]
        # session Cookie が発行されていることを確認
        assert "session" in response.cookies

        session_cookie = response.cookies.get("session")
        # session Cookie で /api/users/me が通ることを確認
        me_response = await client.get(
            "/api/users/me",
            cookies={"session": session_cookie},
        )
        assert me_response.status_code == 200
        assert me_response.json()["data"]["email"] == "stub_endpoint@example.com"


# ============================================================
# GET /api/users/me: セッション Cookie を使ったテスト
# ============================================================


class TestUsersMeWithSession:
    """GET /api/users/me が session Cookie で通ることを確認."""

    async def test_users_me_with_session_cookie_after_callback(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        rsa_private_key_pem: str,
        test_jwks: dict,
    ):
        """Google callback 後の session Cookie で /api/users/me にアクセスできることを確認."""
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
        session_cookie = callback_response.cookies.get("session")
        assert session_cookie

        me_response = await client.get(
            "/api/users/me",
            cookies={"session": session_cookie},
        )
        assert me_response.status_code == 200
        assert me_response.json()["data"]["email"] == "me_test@example.com"

    async def test_users_me_with_test_session(
        self,
        client: AsyncClient,
        test_user,
        auth_cookies,
    ):
        """テスト用セッションで /api/users/me にアクセスできることを確認."""
        cookies = await auth_cookies(test_user)
        response = await client.get("/api/users/me", cookies=cookies)
        assert response.status_code == 200
        assert response.json()["data"]["email"] == test_user.email

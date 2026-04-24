"""pytest フィクスチャ（テスト DB・認証・Google OAuth モック）."""

from typing import AsyncGenerator
from unittest.mock import patch

import pytest
import pytest_asyncio
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from jose import jwt as jose_jwt
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import tasche.models  # noqa: F401  モデルをすべてインポートして autogenerate に含める
from tasche.core.config import settings
from tasche.db.base import Base
from tasche.db.session import get_db
from tasche.main import app

# ============================================================
# テスト用データベース（SQLite in-memory）
# ============================================================

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestAsyncSession = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """テスト用 DB セッション（各テスト前にスキーマを作り直す）."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSession() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # aiosqlite のバックグラウンドスレッドを残さないよう、毎テストで明示的に破棄する。
    await test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """テスト用 HTTP クライアント（テスト DB に差し替え済み）."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


# ============================================================
# テスト用 RSA キーペア（Google ID Token 自作用）
# ============================================================


@pytest.fixture(scope="session")
def rsa_private_key():
    """テスト用 RSA 秘密鍵（2048bit）."""
    return rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )


@pytest.fixture(scope="session")
def rsa_private_key_pem(rsa_private_key):
    """テスト用 RSA 秘密鍵（PEM 形式）."""
    return rsa_private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")


@pytest.fixture(scope="session")
def rsa_public_key(rsa_private_key):
    """テスト用 RSA 公開鍵."""
    return rsa_private_key.public_key()


@pytest.fixture(scope="session")
def rsa_public_key_numbers(rsa_public_key):
    """RSA 公開鍵のモジュラス・指数（JWK 用）."""
    import base64

    pub_numbers = rsa_public_key.public_numbers()
    n = pub_numbers.n
    e = pub_numbers.e

    def int_to_base64url(val):
        length = (val.bit_length() + 7) // 8
        return base64.urlsafe_b64encode(val.to_bytes(length, "big")).rstrip(b"=").decode()

    return {"n": int_to_base64url(n), "e": int_to_base64url(e)}


@pytest.fixture(scope="session")
def test_jwks(rsa_public_key_numbers):
    """テスト用 JWKS レスポンス."""
    return {
        "keys": [
            {
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "kid": "test-key-id",
                "n": rsa_public_key_numbers["n"],
                "e": rsa_public_key_numbers["e"],
            }
        ]
    }


def make_google_id_token(
    rsa_private_key_pem: str,
    *,
    sub: str = "google_sub_12345",
    email: str = "test@example.com",
    email_verified: bool = True,
    name: str = "Test User",
    picture: str = "https://example.com/photo.jpg",
    aud: str | None = None,
    iss: str = "https://accounts.google.com",
    exp_offset: int = 3600,
) -> str:
    """テスト用 Google ID Token（RSA 署名付き）を生成する."""
    import time

    now = int(time.time())
    audience = aud if aud is not None else settings.google_oauth_client_id

    payload = {
        "iss": iss,
        "aud": audience,
        "sub": sub,
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "picture": picture,
        "iat": now,
        "exp": now + exp_offset,
    }

    return jose_jwt.encode(
        payload,
        rsa_private_key_pem,
        algorithm="RS256",
        headers={"kid": "test-key-id"},
    )


# ============================================================
# スタブ認証フィクスチャ
# ============================================================


@pytest.fixture
def stub_settings():
    """スタブ認証が有効な settings を返す（local + stub_enabled）."""
    with (
        patch.object(settings, "app_env", "local"),
        patch.object(settings, "auth_stub_enabled", True),
        patch.object(settings, "auth_stub_jwt_secret", "test_stub_secret_12345678"),
    ):
        yield settings


@pytest.fixture
def production_settings():
    """production 環境を模擬した settings を返す."""
    with (
        patch.object(settings, "app_env", "production"),
        patch.object(settings, "auth_stub_enabled", True),
    ):
        yield settings

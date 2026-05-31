"""pytest 共通 fixtures."""

import base64
import os
from typing import AsyncGenerator
from unittest.mock import patch
from urllib.parse import urlparse

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import tasche.models  # noqa: F401  モデルをすべてインポートして autogenerate に含める
from tasche.api.deps import get_db
from tasche.core.config import settings
from tasche.core.test_auth import TestTokenService
from tasche.main import app
from tasche.models.user import User

# ============================================================
# TEST_DATABASE_URL の取得と DB 名ガード
# ============================================================

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://tasche:tasche_dev_password@localhost:5432/tasche_test",
)

# DB 名が tasche_test でなければ収集前に即座に失敗させる
_db_name = urlparse(TEST_DATABASE_URL).path.lstrip("/")
if _db_name != "tasche_test":
    raise RuntimeError(
        f"TEST_DATABASE_URL のDB名が 'tasche_test' ではありません: '{_db_name}'\n"
        "開発DBへの誤適用を防ぐため、テストを中止します。\n"
        "TEST_DATABASE_URL に tasche_test を指すURLを設定してください。"
    )


# ============================================================
# Session スコープ: Alembic upgrade head（tasche_test に 1 回だけ適用）
# ============================================================


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations():
    """セッション開始時に tasche_test に Alembic upgrade head を適用する.

    alembic_cfg.set_main_option で TEST_DATABASE_URL を直接渡すことで、
    settings（Pydantic BaseSettings シングルトン）を書き換えることなく
    テスト DB にのみマイグレーションを適用する。
    migrations/env.py 側で set_main_option 経由の URL を優先するよう実装済み。
    """
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(alembic_cfg, "head")


# ============================================================
# Function スコープ: db_session（各テスト前に TRUNCATE）
# ============================================================


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """テスト用 DB セッション（各テスト前に全テーブルを TRUNCATE）."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        await _truncate_all_tables(session)
        yield session

    await engine.dispose()


async def _truncate_all_tables(session: AsyncSession) -> None:
    """alembic_version を除く public スキーマの全テーブルを TRUNCATE RESTART IDENTITY CASCADE."""
    result = await session.execute(
        text(
            "SELECT tablename FROM pg_tables "
            "WHERE schemaname = 'public' AND tablename <> 'alembic_version'"
        )
    )
    table_names = [row[0] for row in result]

    if not table_names:
        return

    tables_expr = ", ".join(f'"{name}"' for name in table_names)
    await session.execute(text(f"TRUNCATE {tables_expr} RESTART IDENTITY CASCADE"))
    await session.commit()


# ============================================================
# HTTP クライアント
# ============================================================


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
# 認証 fixtures（TestTokenService 系）
# ============================================================


@pytest.fixture
def token_service():
    """テスト用トークン発行サービス（TestTokenService ベース）."""
    return TestTokenService()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """テスト用ユーザー."""
    user = User(
        id="usr_01TEST1234567890ABCDEF",
        email="test@example.com",
        name="Test User",
        timezone="Asia/Tokyo",
        theme="light",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(token_service: TestTokenService):
    """認証ヘッダーを生成する（TestTokenService ベース）."""

    def _auth_headers(user: User) -> dict[str, str]:
        token = token_service.create_token(user.id, user.email)
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


# ============================================================
# Google OAuth テスト用 RSA キーペア・JWKS・ヘルパー
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


# ============================================================
# スタブ認証 fixtures
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

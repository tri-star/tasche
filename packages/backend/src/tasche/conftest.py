"""pytest 共通 fixtures."""

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from tasche.api.deps import get_db
from tasche.core.test_auth import TestTokenService
from tasche.db.base import Base
from tasche.main import app
from tasche.models.user import User

# テスト用DBエンジン（PostgreSQL）
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://tasche:tasche_dev_password@localhost:5432/tasche_test",
)


@pytest.fixture
async def db_session():
    """テスト用DBセッション."""
    # テスト用DBエンジンを作成
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # テーブル作成（存在しない場合のみ）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # テスト開始前: 全テーブルをTRUNCATEしてリセット
        await truncate_all_tables(session)

        yield session

    await engine.dispose()


async def truncate_all_tables(session: AsyncSession):
    """全テーブルをTRUNCATEしてリセット."""
    # テーブル名を取得
    table_names = [table.name for table in Base.metadata.sorted_tables]

    if not table_names:
        return

    # TRUNCATE実行（CASCADE付き）
    for table_name in table_names:
        await session.execute(
            text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE")
        )

    await session.commit()


@pytest.fixture
def token_service():
    """テスト用トークン発行サービス."""
    return TestTokenService()


@pytest.fixture
async def test_user(db_session: AsyncSession):
    """テスト用ユーザー."""
    user = User(
        id="usr_01TEST1234567890ABCDEF",
        email="test@example.com",
        name="Test User",
        timezone="Asia/Tokyo",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def client(db_session: AsyncSession):
    """テスト用HTTPクライアント."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()

"""DB セッション管理（async）.

Lambda + Parameters and Secrets Lambda Extension 構成では、Settings() の
SecretsManager 呼び出しを起動時遅延化しているため、engine / session_maker も
モジュール import 時には生成せず、初回利用時に lazy 生成する。
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from tasche.core.config import settings

_engine: AsyncEngine | None = None
_async_session_maker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """エンジンを lazy 生成する (Secret 解決後に database_url が確定するため)."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            echo=settings.log_level == "debug",
            future=True,
        )
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """セッションファクトリを lazy 生成する."""
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """DB セッション依存関係."""
    async with get_session_maker()() as session:
        yield session

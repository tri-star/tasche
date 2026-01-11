"""DB セッション管理（async）."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from tasche.core.config import settings

# エンジン作成
engine = create_async_engine(
    settings.database_url,
    echo=settings.log_level == "debug",
    future=True,
)

# セッションファクトリ
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """DB セッション依存関係."""
    async with async_session_maker() as session:
        yield session

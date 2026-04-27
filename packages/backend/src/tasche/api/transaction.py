"""API 層のトランザクション補助."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession


@asynccontextmanager
async def transaction(db: AsyncSession) -> AsyncIterator[None]:
    """既存 transaction を尊重して必要な場合だけ transaction を開始する."""
    if not db.in_transaction():
        async with db.begin():
            yield
        return

    yield

"""ユーザーサービス."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.user import User


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """ユーザーをIDで取得."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """ユーザーをメールアドレスで取得."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

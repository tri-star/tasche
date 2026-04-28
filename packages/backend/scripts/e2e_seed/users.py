"""E2E テスト用ユーザー seed."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.user import User

from .constants import E2E_USER


async def seed_user(session: AsyncSession) -> User:
    """E2E 用ユーザーを作成または更新する."""
    result = await session.execute(select(User).where(User.email == E2E_USER["email"]))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(**E2E_USER)
        session.add(user)
        await session.flush()
        print(f"✓ Created E2E user: {user.email}")
        return user

    user.name = E2E_USER["name"]
    user.timezone = E2E_USER["timezone"]
    print(f"✓ Updated E2E user: {user.email}")
    return user

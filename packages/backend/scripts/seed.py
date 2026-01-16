"""開発用データシーダー."""

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.db.session import async_session_maker, engine
from tasche.models.user import User


async def seed_users(session: AsyncSession) -> None:
    """テストユーザーをシード."""
    test_users = [
        {
            "id": "usr_01HXYZ1234567890ABCDEF",
            "email": "test@example.com",
            "name": "Test User",
            "timezone": "Asia/Tokyo",
        },
        {
            "id": "usr_02HXYZ1234567890ABCDEF",
            "email": "demo@example.com",
            "name": "Demo User",
            "timezone": "America/New_York",
        },
    ]

    for user_data in test_users:
        # 既存ユーザーをチェック
        from sqlalchemy import select

        result = await session.execute(select(User).where(User.email == user_data["email"]))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"✓ User already exists: {user_data['email']}")
        else:
            user = User(**user_data)
            session.add(user)
            print(f"✓ Created user: {user_data['email']}")

    await session.commit()


async def main() -> None:
    """メイン処理."""
    print("=" * 60)
    print("Tasche Database Seeder")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print("-" * 60)

    async with async_session_maker() as session:
        print("\n[1/1] Seeding users...")
        await seed_users(session)

    print("\n" + "=" * 60)
    print("✓ Seeding completed successfully!")
    print("=" * 60)

    # エンジンをクローズ
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

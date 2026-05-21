"""開発用データシーダー."""

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.db.session import get_engine, get_session_maker
from tasche.models.task import Task
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


async def seed_tasks(session: AsyncSession) -> None:
    """テストタスクをシード（全ユーザー分）."""
    from sqlalchemy import and_, select
    from ulid import ULID

    task_names = [
        "週次レポート作成",
        "コードレビュー",
        "ミーティング準備",
        "ドキュメント更新",
        "バグ調査",
    ]

    users = list((await session.execute(select(User))).scalars().all())
    for user in users:
        print(f"  → {user.email} のタスクをシード中...")
        for name in task_names:
            result = await session.execute(
                select(Task).where(and_(Task.user_id == user.id, Task.name == name))
            )
            if result.scalar_one_or_none():
                print(f"    ✓ Task already exists: {name}")
            else:
                task = Task(id=f"tsk_{ULID()}", user_id=user.id, name=name, is_archived=False)
                session.add(task)
                print(f"    ✓ Created task: {name}")

    await session.commit()


async def main() -> None:
    """メイン処理."""
    print("=" * 60)
    print("Tasche Database Seeder")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print("-" * 60)

    session_maker = get_session_maker()
    async with session_maker() as session:
        print("\n[1/2] Seeding users...")
        await seed_users(session)

        print("\n[2/2] Seeding tasks...")
        await seed_tasks(session)

    print("\n" + "=" * 60)
    print("✓ Seeding completed successfully!")
    print("=" * 60)

    # エンジンをクローズ
    engine = get_engine()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

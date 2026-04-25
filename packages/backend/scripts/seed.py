"""開発用データシーダー."""

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.db.session import async_session_maker, engine
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
    """テストタスクをシード."""
    from sqlalchemy import select

    test_tasks = [
        {
            "id": "tsk_01HXYZ1234567890ABCDE1",
            "user_id": "usr_01HXYZ1234567890ABCDEF",
            "name": "週次レポート作成",
            "is_archived": False,
        },
        {
            "id": "tsk_01HXYZ1234567890ABCDE2",
            "user_id": "usr_01HXYZ1234567890ABCDEF",
            "name": "コードレビュー",
            "is_archived": False,
        },
        {
            "id": "tsk_01HXYZ1234567890ABCDE3",
            "user_id": "usr_01HXYZ1234567890ABCDEF",
            "name": "ミーティング準備",
            "is_archived": False,
        },
        {
            "id": "tsk_01HXYZ1234567890ABCDE4",
            "user_id": "usr_01HXYZ1234567890ABCDEF",
            "name": "ドキュメント更新",
            "is_archived": False,
        },
        {
            "id": "tsk_01HXYZ1234567890ABCDE5",
            "user_id": "usr_01HXYZ1234567890ABCDEF",
            "name": "バグ調査",
            "is_archived": False,
        },
    ]

    for task_data in test_tasks:
        result = await session.execute(select(Task).where(Task.id == task_data["id"]))
        existing_task = result.scalar_one_or_none()

        if existing_task:
            print(f"✓ Task already exists: {task_data['name']}")
        else:
            task = Task(**task_data)
            session.add(task)
            print(f"✓ Created task: {task_data['name']}")

    await session.commit()


async def main() -> None:
    """メイン処理."""
    print("=" * 60)
    print("Tasche Database Seeder")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print("-" * 60)

    async with async_session_maker() as session:
        print("\n[1/2] Seeding users...")
        await seed_users(session)

        print("\n[2/2] Seeding tasks...")
        await seed_tasks(session)

    print("\n" + "=" * 60)
    print("✓ Seeding completed successfully!")
    print("=" * 60)

    # エンジンをクローズ
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

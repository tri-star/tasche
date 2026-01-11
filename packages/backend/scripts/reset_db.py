"""データベースリセットスクリプト（開発用）."""
import asyncio

from tasche.core.config import settings
from tasche.db.base import Base
from tasche.db.session import engine

# モデルをインポート（テーブル削除用）
from tasche.models import user  # noqa: F401


async def reset_database() -> None:
    """データベースをリセット（全テーブル削除 + 再作成）."""
    print("=" * 60)
    print("WARNING: Database Reset")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print("This will DROP ALL TABLES and recreate them.")
    print("-" * 60)

    # 確認
    response = input("Are you sure you want to continue? (yes/no): ")
    if response.lower() != "yes":
        print("Aborted.")
        return

    print("\n[1/2] Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("✓ All tables dropped")

    print("\n[2/2] Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All tables created")

    print("\n" + "=" * 60)
    print("✓ Database reset completed!")
    print("Run 'python scripts/seed.py' to populate test data.")
    print("=" * 60)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset_database())

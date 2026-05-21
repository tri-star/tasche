"""E2E テスト用 seed 実行スクリプト."""

# ruff: noqa: E402, I001

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from tasche.core.config import settings
from tasche.db.session import get_engine, get_session_maker

from scripts.e2e_seed.goals import seed_goals
from scripts.e2e_seed.records import seed_records
from scripts.e2e_seed.tasks import seed_tasks
from scripts.e2e_seed.users import seed_user
from scripts.e2e_seed.weeks import seed_week


async def main() -> None:
    """E2E 用の固定データを投入する."""
    print("=" * 60)
    print("Tasche E2E Database Seeder")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print("-" * 60)

    session_maker = get_session_maker()
    async with session_maker() as session:
        user = await seed_user(session)
        week = await seed_week(session, user)
        await seed_tasks(session, user)
        await seed_goals(session, week)
        await seed_records(session, week)
        await session.commit()

    engine = get_engine()
    await engine.dispose()

    print("\n" + "=" * 60)
    print("✓ E2E seeding completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

"""E2E 専用データベースをリセットする."""

import asyncio

from sqlalchemy import text
from sqlalchemy.engine import make_url

from tasche.core.config import settings
from tasche.db.session import engine

E2E_DATABASE_NAME = "tasche_test"


def _ensure_e2e_database() -> None:
    """通常のローカル DB を誤ってリセットしないためのガード."""
    database = make_url(settings.database_url).database
    if database != E2E_DATABASE_NAME:
        raise RuntimeError(
            f"E2E reset can only run against {E2E_DATABASE_NAME!r}, but DATABASE_URL points to {database!r}."
        )


async def reset_e2e_database() -> None:
    """public schema の全テーブルを truncate する."""
    _ensure_e2e_database()

    print("=" * 60)
    print("Tasche E2E Database Reset")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print("-" * 60)

    try:
        async with engine.begin() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT tablename
                    FROM pg_tables
                    WHERE schemaname = 'public'
                      AND tablename <> 'alembic_version'
                    ORDER BY tablename
                    """
                )
            )
            table_names = [row.tablename for row in result]

            if not table_names:
                print("No tables found. Skip truncate.")
                return

            quoted_tables = ", ".join(f'public."{table_name}"' for table_name in table_names)
            await conn.execute(text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE"))
            print(f"Truncated {len(table_names)} table(s): {', '.join(table_names)}")
    finally:
        await engine.dispose()

    print("\n" + "=" * 60)
    print("E2E database reset completed successfully.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(reset_e2e_database())

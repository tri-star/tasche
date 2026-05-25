"""ユーザー設定のサービス層."""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.user import User


def _validate_timezone(tz: str) -> None:
    """IANA タイムゾーン名の妥当性を検証する.

    不正な場合は ValueError を投げる（呼び出し側で 400 に変換）。
    """
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError) as e:
        raise ValueError(f"Invalid timezone: {tz}") from e


async def update_user_settings(
    db: AsyncSession,
    user: User,
    *,
    timezone: str | None = None,
    theme: str | None = None,
) -> User:
    """ユーザー設定（timezone / theme）を部分更新する.

    - None のフィールドは更新しない（部分更新）
    - timezone は IANA 名の妥当性検証を行い、不正なら ValueError
    - commit は呼び出し側責任（既存サービス層と一貫）
    """
    if timezone is not None:
        _validate_timezone(timezone)
        user.timezone = timezone
    if theme is not None:
        user.theme = theme

    await db.flush()
    await db.refresh(user)
    return user

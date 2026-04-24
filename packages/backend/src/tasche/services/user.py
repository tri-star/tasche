"""ユーザーサービス."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.exceptions import InvalidAuthorizationCodeError
from tasche.models.user import User


def _generate_user_id() -> str:
    """ULID形式のユーザーIDを生成する（usr_ プレフィックス付き）."""
    return f"usr_{ULID()}"


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """ユーザーをIDで取得."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """ユーザーをメールアドレスで取得."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_google_sub(db: AsyncSession, google_sub: str) -> User | None:
    """ユーザーを Google sub で取得."""
    result = await db.execute(select(User).where(User.google_sub == google_sub))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    user_id: str,
    email: str,
    name: str | None = None,
    picture: str | None = None,
    google_sub: str | None = None,
) -> User:
    """ユーザーを新規作成.

    Args:
        db: データベースセッション
        user_id: ユーザーID（ULID: usr_...）
        email: メールアドレス
        name: 名前
        picture: プロフィール画像URL
        google_sub: Google OAuth の sub（識別子）

    Returns:
        User: 作成されたユーザー
    """
    user = User(
        id=user_id,
        email=email,
        name=name if name is not None else email.split("@")[0],
        picture=picture,
        google_sub=google_sub,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    user: User,
    name: str | None = None,
    picture: str | None = None,
    google_sub: str | None = None,
) -> User:
    """ユーザー情報を更新.

    Args:
        db: データベースセッション
        user: 更新するユーザー
        name: 名前
        picture: プロフィール画像URL
        google_sub: Google OAuth の sub（紐付け時に設定）

    Returns:
        User: 更新されたユーザー
    """
    if name is not None:
        user.name = name
    if picture is not None:
        user.picture = picture
    if google_sub is not None:
        user.google_sub = google_sub

    await db.flush()
    await db.refresh(user)
    return user


async def get_or_create_user_by_google_sub(
    db: AsyncSession,
    *,
    google_sub: str,
    email: str,
    name: str | None,
    picture: str | None,
) -> User:
    """Google sub からユーザーを取得または作成する.

    1. google_sub で lookup
    2. なければ email で lookup（null google_sub ユーザーに紐付け）
    3. なければ ULID で新規作成

    Args:
        db: データベースセッション
        google_sub: Google OAuth の sub（識別子）
        email: メールアドレス
        name: 名前
        picture: プロフィール画像URL

    Returns:
        User: 取得または作成されたユーザー
    """
    # 1) google_sub で lookup
    user = await get_user_by_google_sub(db, google_sub)
    if user:
        return await update_user(db, user, name=name, picture=picture)

    # 2) email で lookup（null google_sub ユーザーに紐付け）
    user = await get_user_by_email(db, email)
    if user:
        if user.google_sub is None:
            return await update_user(db, user, name=name, picture=picture, google_sub=google_sub)
        raise InvalidAuthorizationCodeError(
            "このメールアドレスは別の Google アカウントと紐付いています"
        )

    # 3) 新規ユーザーを作成
    user_id = _generate_user_id()
    return await create_user(
        db,
        user_id=user_id,
        email=email,
        name=name,
        picture=picture,
        google_sub=google_sub,
    )


async def get_or_create_user_by_email(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
) -> User:
    """メールアドレスからユーザーを取得または作成する（スタブログイン用）.

    Args:
        db: データベースセッション
        email: メールアドレス
        name: 名前

    Returns:
        User: 取得または作成されたユーザー
    """
    user = await get_user_by_email(db, email)
    if user:
        return user

    user_id = _generate_user_id()
    return await create_user(
        db,
        user_id=user_id,
        email=email,
        name=name,
        google_sub=None,
    )

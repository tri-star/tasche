"""ユーザーサービス."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.user import User
from tasche.schemas.auth import Auth0UserInfo


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """ユーザーをIDで取得."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """ユーザーをメールアドレスで取得."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    user_id: str,
    email: str,
    name: str | None = None,
    picture: str | None = None,
) -> User:
    """ユーザーを新規作成.

    Args:
        db: データベースセッション
        user_id: ユーザーID（Auth0のsubから生成）
        email: メールアドレス
        name: 名前
        picture: プロフィール画像URL

    Returns:
        User: 作成されたユーザー
    """
    user = User(
        id=user_id,
        email=email,
        name=name if name is not None else email.split("@")[0],  # nameがない場合はメールの@前を使用
        picture=picture,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    user: User,
    name: str | None = None,
    picture: str | None = None,
) -> User:
    """ユーザー情報を更新.

    Args:
        db: データベースセッション
        user: 更新するユーザー
        name: 名前
        picture: プロフィール画像URL

    Returns:
        User: 更新されたユーザー
    """
    if name is not None:
        user.name = name
    if picture is not None:
        user.picture = picture

    await db.commit()
    await db.refresh(user)
    return user


async def get_or_create_user_from_auth0(db: AsyncSession, userinfo: Auth0UserInfo) -> User:
    """Auth0ユーザー情報からユーザーを取得または作成.

    Args:
        db: データベースセッション
        userinfo: Auth0ユーザー情報

    Returns:
        User: 取得または作成されたユーザー
    """
    # Auth0のsubからuser_idを生成（"auth0|..."形式をそのまま使用）
    user_id = userinfo.sub

    # 既存ユーザーを検索
    user = await get_user_by_id(db, user_id)

    if user:
        # 既存ユーザーの情報を更新（nameやpictureが変更されている可能性があるため）
        return await update_user(db, user, name=userinfo.name, picture=userinfo.picture)
    else:
        # 新規ユーザーを作成
        return await create_user(
            db,
            user_id=user_id,
            email=userinfo.email,
            name=userinfo.name,
            picture=userinfo.picture,
        )

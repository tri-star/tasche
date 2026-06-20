"""セッション認証（Cookie session → DB 照合）."""

from fastapi import Cookie, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.cookies import SESSION_COOKIE, set_session_cookie
from tasche.core.exceptions import InvalidTokenError
from tasche.db.session import get_db
from tasche.services.session import validate_session


async def get_current_user_sub(
    response: Response,
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(None, alias=SESSION_COOKIE),
) -> str:
    """現在のユーザーの sub（内部ユーザーID）を取得する.

    Cookie `session` を DB 照合して user_id を返す。
    Cookie 不在・不一致・失効は InvalidTokenError を raise（→ 401）。
    スライディング延長が発生した場合は Cookie を再 Set-Cookie する。
    """
    if not session_token:
        raise InvalidTokenError("No session cookie")

    session, extended = await validate_session(db, session_token)
    if session is None:
        raise InvalidTokenError("Invalid or expired session")

    if extended:
        # スライディング延長発生時は commit してから Max-Age を更新して Cookie を再送
        await db.commit()
        set_session_cookie(response, session_token)

    return session.user_id

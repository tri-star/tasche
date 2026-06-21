"""CSRF 対策ミドルウェア（Origin/Referer 検証）."""

import logging
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from tasche.core.config import settings

logger = logging.getLogger(__name__)

# 状態変更系メソッドのみ対象（GET/HEAD/OPTIONS は除外）
_CSRF_CHECK_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class CSRFMiddleware(BaseHTTPMiddleware):
    """Origin/Referer を検証する CSRF 対策ミドルウェア.

    - 対象メソッド: POST / PUT / PATCH / DELETE
    - `/api/*` パスのみ対象（/health, / は除外）
    - Origin ヘッダ（無ければ Referer のオリジン部）を CORS_ALLOW_ORIGINS と照合
    - どちらも無い場合は許可（pass-through）
    - 不一致は 403 + {"error": {"code": "CSRF_VALIDATION_FAILED"}}
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in _CSRF_CHECK_METHODS and request.url.path.startswith("/api/"):
            result = _check_csrf(request)
            if result is not None:
                return result

        return await call_next(request)


def _check_csrf(request: Request) -> JSONResponse | None:
    """CSRF 検証を行い、拒否する場合は JSONResponse を返す。通過する場合は None を返す."""
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    # Origin/Referer がどちらも無い場合は許可（pass-through）
    # （SameSite=Lax が一次防御。非ブラウザの内部呼び出し・テストクライアントを誤って 403 にしない）
    if not origin and not referer:
        return None

    # 検証に使うオリジン文字列を決定
    check_origin = origin
    if not check_origin and referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            check_origin = f"{parsed.scheme}://{parsed.netloc}"

    if not check_origin:
        # Referer があるが origin 部が解析できなかった場合は許可
        return None

    allowed_origins = settings.cors_allow_origin_list
    if check_origin not in allowed_origins:
        logger.warning(
            "CSRF validation failed: method=%s path=%s origin=%r",
            request.method,
            request.url.path,
            check_origin,
        )
        return JSONResponse(
            status_code=403,
            content={
                "error": {
                    "code": "CSRF_VALIDATION_FAILED",
                    "message": "CSRF validation failed",
                }
            },
        )

    return None

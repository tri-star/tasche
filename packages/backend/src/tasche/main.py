"""FastAPI アプリケーション初期化."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from tasche.api.v1.router import api_router
from tasche.core.config import settings
from tasche.core.exceptions import (
    AuthenticationError,
    InvalidRefreshTokenError,
    InvalidTokenError,
    TaskNotFoundException,
    TokenExpiredError,
    UserNotFoundException,
)

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="Tasche API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# SessionMiddleware（authlib用 - state管理に必要）
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret_key,
)

# CORS設定（開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite デフォルトポート
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 例外ハンドラー
@app.exception_handler(UserNotFoundException)
async def user_not_found_handler(request: Request, exc: UserNotFoundException):
    """ユーザー未発見例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"code": "USER_NOT_FOUND", "message": str(exc)},
    )


@app.exception_handler(TaskNotFoundException)
async def task_not_found_handler(request: Request, exc: TaskNotFoundException):
    """タスク未発見例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"code": "TASK_NOT_FOUND", "message": str(exc)},
    )


@app.exception_handler(InvalidTokenError)
async def invalid_token_handler(request: Request, exc: InvalidTokenError):
    """無効トークン例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"code": "INVALID_TOKEN", "message": exc.detail},
    )


@app.exception_handler(TokenExpiredError)
async def token_expired_handler(request: Request, exc: TokenExpiredError):
    """トークン期限切れ例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"code": "TOKEN_EXPIRED", "message": exc.detail},
    )


@app.exception_handler(InvalidRefreshTokenError)
async def invalid_refresh_token_handler(request: Request, exc: InvalidRefreshTokenError):
    """無効リフレッシュトークン例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"code": "INVALID_REFRESH_TOKEN", "message": exc.detail},
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    """認証エラー例外ハンドラー（基底クラス）."""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"code": "AUTHENTICATION_ERROR", "message": str(exc)},
    )


# API v1 ルーター登録
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """ルートエンドポイント（ヘルスチェック）."""
    return {"status": "ok", "message": "Tasche API is running"}


@app.get("/health")
async def health():
    """ヘルスチェックエンドポイント."""
    return {"status": "healthy"}

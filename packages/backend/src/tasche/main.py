"""FastAPI アプリケーション初期化."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tasche.api.v1.router import api_router

app = FastAPI(
    title="Tasche API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS設定（開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite デフォルトポート
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

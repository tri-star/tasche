"""Google OAuth 2.0 クライアント（Authlib + httpx）."""

import asyncio
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet
from joserfc.jwt import JWTClaimsRegistry

from tasche.core.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
JWKS_CACHE_TTL = 3600  # 1時間

_jwks_cache: dict[str, Any] | None = None
_jwks_cache_at: float | None = None
_jwks_lock = asyncio.Lock()


async def get_google_jwks() -> dict[str, Any]:
    """TTL キャッシュ付きで Google の JWKS を取得（asyncio.Lock で競合防止）."""
    global _jwks_cache, _jwks_cache_at
    now = time.time()
    if _jwks_cache and _jwks_cache_at and now - _jwks_cache_at < JWKS_CACHE_TTL:
        return _jwks_cache
    async with _jwks_lock:
        # ロック取得後に再チェック（double-checked locking）
        if _jwks_cache and _jwks_cache_at and now - _jwks_cache_at < JWKS_CACHE_TTL:
            return _jwks_cache
        async with httpx.AsyncClient() as client:
            r = await client.get(GOOGLE_JWKS_URL)
            r.raise_for_status()
            _jwks_cache = r.json()
            _jwks_cache_at = time.time()
        return _jwks_cache


def build_google_authorize_url(*, redirect_uri: str, state: str, code_challenge: str) -> str:
    """Google 認可 URL を組み立てる."""
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(*, code: str, code_verifier: str, redirect_uri: str) -> dict:
    """Google /token にトークン交換リクエスト。失敗時は httpx/authlib 例外を raise。"""
    async with AsyncOAuth2Client(
        client_id=settings.google_oauth_client_id,
        client_secret=settings.google_oauth_client_secret,
        code_challenge_method="S256",
    ) as client:
        token = await client.fetch_token(
            url=GOOGLE_TOKEN_URL,
            code=code,
            code_verifier=code_verifier,
            redirect_uri=redirect_uri,
            grant_type="authorization_code",
        )
    return dict(token)


async def verify_google_id_token(id_token: str) -> dict:
    """Google ID Token を検証し claims を返す."""
    jwks = await get_google_jwks()
    key_set = KeySet.import_key_set(jwks)

    token = jwt.decode(id_token, key_set, algorithms=["RS256"])

    claims_registry = JWTClaimsRegistry(
        iss={"essential": True, "values": list(GOOGLE_ISSUERS)},
        aud={"essential": True, "value": settings.google_oauth_client_id},
        exp={"essential": True},
        iat={"essential": True},
    )
    claims_registry.validate(token.claims)

    if token.claims.get("email_verified") is not True:
        raise JoseError("email_not_verified")
    return dict(token.claims)


def generate_state() -> str:
    """CSRF 対策の state トークンを生成する."""
    return secrets.token_urlsafe(24)

"""OAuth クライアント設定（authlib）."""

from authlib.integrations.starlette_client import OAuth

from tasche.core.config import settings

oauth = OAuth()

oauth.register(
    "auth0",
    client_id=settings.auth0_client_id,
    client_secret=settings.auth0_client_secret,
    # エンドポイントを直接指定（メタデータURL取得を回避）
    authorize_url=f"https://{settings.auth0_domain}/authorize",
    access_token_url=f"https://{settings.auth0_domain}/oauth/token",
    jwks_uri=f"https://{settings.auth0_domain}/.well-known/jwks.json",  # ID token検証用
    client_kwargs={
        "scope": "openid profile email offline_access",
        "audience": settings.auth0_audience,
        "code_challenge_method": "S256",  # PKCE有効化
    },
)

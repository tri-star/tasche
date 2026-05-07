"""環境変数・設定管理.

ローカル/CI 環境では従来通り環境変数 (`.env`) から値を読み込む (`SECRETS_BACKEND=env`).
Lambda 上では AWS Parameters and Secrets Lambda Extension 経由で SecretsManager から
取得する (`SECRETS_BACKEND=extension`).

費用削減のため、機密値は単一の Secret に JSON 形式でまとめて格納する設計とした。
`APP_SECRET_ARN` 環境変数で対象 Secret の ARN を指定する。期待する JSON 構造:

    {
      "db_url": "postgresql+asyncpg://...",
      "jwt_secret": "...",
      "google_oauth_client_id": "...",
      "google_oauth_client_secret": "..."
    }

Extension は Lambda コンテナイメージにビルド時に焼き込む (`packages/backend/Dockerfile`
参照). アプリケーションは `http://localhost:2773/secretsmanager/get?secretId=<ARN>` を
叩くだけで、Extension 内部のキャッシュ (既定 5 分 TTL) によりウォーム呼び出し時の
API コールは抑制される。
"""

from __future__ import annotations

import json
import logging
import os

import httpx
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


SECRETS_EXTENSION_ENDPOINT = "http://localhost:2773/secretsmanager/get"


class Settings(BaseSettings):
    """アプリケーション設定."""

    # Database
    database_url: str

    # 実行環境
    app_env: str = "local"  # local / development / staging / production
    log_level: str = "info"

    # Secrets バックエンド
    # env: 環境変数から直接読み込む (ローカル/CI)
    # extension: Parameters and Secrets Lambda Extension 経由で取得 (Lambda)
    secrets_backend: str = "env"

    # 単一の Secret に複数キーをまとめる (費用削減)
    app_secret_arn: str = ""

    # Google OAuth 2.0
    google_oauth_client_id: str = "dummy_client_id"
    google_oauth_client_secret: str = "dummy_client_secret"
    google_oauth_redirect_uris: str = "http://localhost:5173/auth/callback"

    # 自前発行 JWT
    jwt_secret: str = "change_me_in_production_0123456789abcdef"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_seconds: int = 900
    jwt_refresh_token_expires_seconds: int = 604800

    # Cookie設定
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str = ""

    # CORS
    cors_allow_origins: str = "http://localhost:5173"

    # スタブ認証（E2E・ローカル開発のみ）
    auth_stub_enabled: bool = False
    auth_stub_jwt_secret: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def resolve_secrets_from_extension(self) -> Settings:
        """secrets_backend=extension の場合に SecretsManager から値を取得して上書きする."""
        if self.secrets_backend != "extension":
            return self

        if not self.app_secret_arn:
            raise ValueError(
                "APP_SECRET_ARN must be set when SECRETS_BACKEND=extension"
            )

        payload = _fetch_secret_json(self.app_secret_arn)
        # Secret に値がある項目のみ上書き (環境変数で渡されたデフォルトより優先)
        if "db_url" in payload:
            self.database_url = payload["db_url"]
        if "jwt_secret" in payload:
            self.jwt_secret = payload["jwt_secret"]
        if "google_oauth_client_id" in payload:
            self.google_oauth_client_id = payload["google_oauth_client_id"]
        if "google_oauth_client_secret" in payload:
            self.google_oauth_client_secret = payload["google_oauth_client_secret"]

        return self

    @model_validator(mode="after")
    def validate_stub_secret(self) -> Settings:
        """スタブ有効時に auth_stub_jwt_secret が空の場合は起動を拒否する."""
        from tasche.core.env import is_auth_stub_enabled

        if is_auth_stub_enabled(self.app_env, self.auth_stub_enabled):
            if not self.auth_stub_jwt_secret:
                raise ValueError("AUTH_STUB_JWT_SECRET must be set when AUTH_STUB_ENABLED=true")
        return self

    @property
    def google_oauth_redirect_uri_list(self) -> list[str]:
        """許可されたリダイレクトURIのリストを返す."""
        return [u.strip() for u in self.google_oauth_redirect_uris.split(",") if u.strip()]

    @property
    def cors_allow_origin_list(self) -> list[str]:
        """CORS 許可オリジンのリストを返す."""
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


def _fetch_secret_json(secret_arn: str) -> dict:
    """Lambda Extension 経由で JSON Secret を取得し dict として返す."""
    response = _call_extension(secret_arn)
    return json.loads(response["SecretString"])


def _call_extension(secret_arn: str) -> dict:
    """Parameters and Secrets Lambda Extension に HTTP リクエストする.

    Extension は AWS_SESSION_TOKEN を `X-Aws-Parameters-Secrets-Token` ヘッダで
    受け取って認証する仕組みになっている (Lambda 実行時に自動設定される).
    """
    session_token = os.environ.get("AWS_SESSION_TOKEN")
    if not session_token:
        raise RuntimeError(
            "AWS_SESSION_TOKEN is not set. Cannot call Parameters and Secrets Lambda Extension. "
            "Confirm the extension is baked into the container image."
        )

    try:
        response = httpx.get(
            SECRETS_EXTENSION_ENDPOINT,
            params={"secretId": secret_arn},
            headers={"X-Aws-Parameters-Secrets-Token": session_token},
            timeout=5.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("Failed to fetch secret %s: %s", secret_arn, exc)
        raise

    return response.json()


settings = Settings()

"""環境変数・設定管理.

ローカル/CI 環境では従来通り環境変数 (`.env`) から値を読み込む (`SECRETS_BACKEND=env`).
Lambda 上では boto3 経由で SecretsManager から取得する (`SECRETS_BACKEND=secretsmanager`).
この場合、`*_SECRET_ARN` 環境変数で各 Secret の ARN を指定する。

注: Parameters and Secrets Lambda Extension は Lambda Layer のみで配布されており、
コンテナイメージ Lambda では使用できないため boto3 を直接利用している。
プロセスがコールドスタート中に取得した値はモジュールレベルで保持されるため、
ウォーム呼び出し時には API コールは発生しない。
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """アプリケーション設定."""

    # Database
    database_url: str

    # 実行環境
    app_env: str = "local"  # local / development / staging / production
    log_level: str = "info"

    # Secrets バックエンド
    # env: 環境変数から直接読み込む (ローカル/CI)
    # secretsmanager: boto3 で SecretsManager から取得 (Lambda)
    secrets_backend: str = "env"

    # Secret ARN (secrets_backend=secretsmanager のときに使用)
    db_url_secret_arn: str = ""
    jwt_secret_arn: str = ""
    google_oauth_secret_arn: str = ""

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
    def resolve_secrets_from_aws(self) -> Settings:
        """secrets_backend=secretsmanager の場合に SecretsManager から値を取得して上書きする."""
        if self.secrets_backend != "secretsmanager":
            return self

        # 単一値の Secret は plain string 想定
        if self.db_url_secret_arn:
            self.database_url = _fetch_secret_string(self.db_url_secret_arn)

        if self.jwt_secret_arn:
            self.jwt_secret = _fetch_secret_string(self.jwt_secret_arn)

        # Google OAuth は JSON 形式 ({"client_id": ..., "client_secret": ...}) 想定
        if self.google_oauth_secret_arn:
            payload = _fetch_secret_json(self.google_oauth_secret_arn)
            self.google_oauth_client_id = payload.get("client_id", self.google_oauth_client_id)
            self.google_oauth_client_secret = payload.get(
                "client_secret", self.google_oauth_client_secret
            )

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


@lru_cache(maxsize=32)
def _fetch_secret_string(secret_arn: str) -> str:
    """SecretsManager から Secret の文字列値を取得する.

    lru_cache でモジュールスコープのキャッシュを構成するため、
    同一 Lambda インスタンス内で複数回呼ばれても API コールは初回のみ。
    """
    import boto3  # 遅延 import (ローカル env モードでは不要)

    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secret_arn)
    return response["SecretString"]


def _fetch_secret_json(secret_arn: str) -> dict:
    """SecretsManager から JSON Secret を取得し dict として返す."""
    return json.loads(_fetch_secret_string(secret_arn))


settings = Settings()

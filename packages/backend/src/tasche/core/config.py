"""環境変数・設定管理."""

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定."""

    # Database
    database_url: str

    # 実行環境
    app_env: str = "local"  # local / development / staging / production
    log_level: str = "info"

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
    def validate_stub_secret(self) -> "Settings":
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


settings = Settings()

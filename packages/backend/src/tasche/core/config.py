"""環境変数・設定管理."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定."""

    # Database
    database_url: str

    # Auth0
    auth0_domain: str = "dummy.auth0.com"
    auth0_audience: str = "dummy-audience"
    auth0_client_id: str = ""
    auth0_client_secret: str = ""

    # Session（authlib用）
    session_secret_key: str = ""

    # Cookie設定
    cookie_secure: bool = True
    # NOTE:
    # - デフォルトを "strict" から "lax" に変更すると、全てのCookie（セッションCookieだけでなく
    #   refresh_token などの機密度の高いCookieを含む）のSameSite属性が緩和されます。
    # - Auth0 のリダイレクトを正しく動作させるために "lax" が必要なため、ここではあえて緩和しています。
    # - より厳格な制御が必要なCookieは、アプリケーション側で個別にSameSite属性を上書きすることを検討してください。
    cookie_samesite: str = "lax"

    # Development
    enable_test_auth: bool = False
    test_jwt_secret: str = "dev_secret_key"
    test_auth_default_user_id: str = "usr_01HXYZ1234567890ABCDEF"
    test_auth_default_user_email: str = "test@example.com"
    log_level: str = "info"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

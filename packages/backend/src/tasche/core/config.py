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
import time
import urllib.request

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


SECRETS_EXTENSION_ENDPOINT = "http://localhost:2773/secretsmanager/get"


def _normalize_database_url(v: str) -> str:
    """postgresql:// / postgres:// を asyncpg ドライバ指定に正規化し、非対応パラメータを変換する."""
    from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

    if not v:
        return v

    for prefix in ("postgresql://", "postgres://"):
        if v.startswith(prefix):
            v = "postgresql+asyncpg://" + v[len(prefix):]
            break

    parsed = urlparse(v)
    params = parse_qs(parsed.query, keep_blank_values=True)

    # sslmode=require/verify-* → asyncpg の ssl=require に変換
    sslmode = params.pop("sslmode", [None])[0]
    if sslmode in ("require", "verify-ca", "verify-full"):
        params["ssl"] = ["require"]

    # asyncpg 非対応パラメータを除去
    params.pop("channel_binding", None)

    new_query = urlencode({k: vals[0] for k, vals in params.items()})
    return urlunparse(parsed._replace(query=new_query))


class Settings(BaseSettings):
    """アプリケーション設定."""

    # Database
    # SECRETS_BACKEND=extension の場合は SecretsManager 経由で後から注入されるため
    # 空のデフォルトを許容し、resolve_secrets_from_extension 後に必須チェックする
    database_url: str = ""

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

    @field_validator("database_url", mode="before")
    @classmethod
    def ensure_asyncpg_scheme(cls, v: str) -> str:
        return _normalize_database_url(v)

    @model_validator(mode="after")
    def resolve_secrets_from_extension(self) -> Settings:
        """secrets_backend=extension の場合に SecretsManager から値を取得して上書きする."""
        if self.secrets_backend == "extension":
            if not self.app_secret_arn:
                raise ValueError("APP_SECRET_ARN must be set when SECRETS_BACKEND=extension")

            payload = _fetch_secret_json(self.app_secret_arn)
            # Secret に値がある項目のみ上書き (環境変数で渡されたデフォルトより優先)
            if "db_url" in payload:
                # field_validator は env からの初期化時しか走らないので、ここで再正規化
                self.database_url = _normalize_database_url(payload["db_url"])
            if "jwt_secret" in payload:
                self.jwt_secret = payload["jwt_secret"]
            if "google_oauth_client_id" in payload:
                self.google_oauth_client_id = payload["google_oauth_client_id"]
            if "google_oauth_client_secret" in payload:
                self.google_oauth_client_secret = payload["google_oauth_client_secret"]

        # Secrets 解決後の必須チェック (env / extension いずれの経路でも空なら起動拒否)
        if not self.database_url:
            raise ValueError(
                "database_url must be provided via DATABASE_URL env var "
                "or via the app secret (key: db_url) when SECRETS_BACKEND=extension"
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


def _fetch_secret_json(secret_arn: str) -> dict:
    """Lambda Extension 経由で JSON Secret を取得し dict として返す."""
    response = _call_extension(secret_arn)
    return json.loads(response["SecretString"])


def _call_extension(secret_arn: str) -> dict:
    """Parameters and Secrets Lambda Extension に HTTP リクエストする.

    Extension は AWS_SESSION_TOKEN を `X-Aws-Parameters-Secrets-Token` ヘッダで
    受け取って認証する仕組みになっている (Lambda 実行時に自動設定される).
    """
    from urllib.parse import quote

    session_token = os.environ.get("AWS_SESSION_TOKEN")
    if not session_token:
        raise RuntimeError(
            "AWS_SESSION_TOKEN is not set. Cannot call Parameters and Secrets Lambda Extension. "
            "Confirm the extension is baked into the container image."
        )

    # ARN に含まれる "/" を "%2F" にエンコードする。":" はエンコードしない。
    # Extension の HTTP パーサーが "/" をパス区切りと誤解釈して 400 を返すケースへの対処。
    # (httpx の params= で全文字エンコードしても、f-string で無変換でも 400 になったため)
    encoded_arn = quote(secret_arn, safe=":")
    url = f"{SECRETS_EXTENSION_ENDPOINT}?secretId={encoded_arn}"
    req = urllib.request.Request(
        url,
        headers={"X-Aws-Parameters-Secrets-Token": session_token},
    )
    # Extension が Lambda Runtime API への登録を完了するまで HTTP 400
    # "not ready to serve traffic" を返し続けるため、その間はリトライする。
    # 1 回あたりのコストを下げるため urlopen の timeout は短めにし、
    # 試行回数ベースで最大待機時間を制御する。
    _EXTENSION_MAX_ATTEMPTS = 60
    _EXTENSION_RETRY_INTERVAL_SECONDS = 0.5
    _EXTENSION_REQUEST_TIMEOUT_SECONDS = 2

    last_error_body = ""
    for attempt in range(_EXTENSION_MAX_ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=_EXTENSION_REQUEST_TIMEOUT_SECONDS) as resp:  # noqa: S310
                body = resp.read().decode()
            return json.loads(body)
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode() if exc.fp else ""
            last_error_body = error_body
            # Extension 初期化中の一時的な 400 はリトライする
            if exc.code == 400 and "not ready" in error_body:
                if attempt < _EXTENSION_MAX_ATTEMPTS - 1:
                    time.sleep(_EXTENSION_RETRY_INTERVAL_SECONDS)
                    continue
            # ロギング未設定時も CloudWatch に出るよう print を併用する
            print(  # noqa: T201
                f"[config] Extension HTTP {exc.code} for {secret_arn!r}: {error_body!r}",
                flush=True,
            )
            raise RuntimeError(
                f"Failed to fetch secret from Extension: HTTP {exc.code} - {error_body}"
            ) from exc
        except urllib.error.URLError as exc:
            print(f"[config] Extension URL error for {secret_arn!r}: {exc.reason}", flush=True)  # noqa: T201
            raise RuntimeError(
                f"Failed to fetch secret from Extension: {exc.reason}"
            ) from exc

    # ループを抜けた = リトライ上限到達
    raise RuntimeError(
        f"Extension did not become ready within "
        f"{_EXTENSION_MAX_ATTEMPTS * _EXTENSION_RETRY_INTERVAL_SECONDS:.0f}s. "
        f"Last error: {last_error_body}"
    )


class _LazySettings:
    """Settings の遅延初期化プロキシ.

    Lambda + Parameters and Secrets Lambda Extension 構成では、コンテナ起動と
    Extension の Runtime API 登録が並行して走るため、モジュール import 時点で
    Settings() を即時評価すると Extension が "not ready" を返す競合状態になる。

    属性アクセス時まで初期化を遅延することで、Settings() 呼び出しが
    FastAPI lifespan や最初のリクエスト処理時 (= Extension 登録完了後) に
    走るようにする。
    """

    __slots__ = ()
    _instance: Settings | None = None

    def _resolve(self) -> Settings:
        if _LazySettings._instance is None:
            _LazySettings._instance = Settings()
        return _LazySettings._instance

    def __getattr__(self, name: str):
        return getattr(self._resolve(), name)


settings: Settings = _LazySettings()  # type: ignore[assignment]

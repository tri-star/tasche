"""APP_ENV 判定と機能フラグヘルパ."""

PRODUCTION = "production"


def is_production(app_env: str) -> bool:
    """本番環境かどうかを判定する."""
    return app_env == PRODUCTION


def is_auth_stub_enabled(app_env: str, auth_stub_enabled: bool) -> bool:
    """スタブ認証の実効可否を判定する.

    APP_ENV=production では環境変数値に関わらず常に False。
    それ以外の環境では auth_stub_enabled の値に従う。
    """
    if is_production(app_env):
        return False
    return auth_stub_enabled

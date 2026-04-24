"""core/env.py のユニットテスト."""

import pytest

from tasche.core.env import is_auth_stub_enabled, is_production


class TestIsProduction:
    """is_production 関数のテスト."""

    def test_production_env_returns_true(self):
        """production 環境では True を返す."""
        assert is_production("production") is True

    def test_local_env_returns_false(self):
        """local 環境では False を返す."""
        assert is_production("local") is False

    def test_staging_env_returns_false(self):
        """staging 環境では False を返す."""
        assert is_production("staging") is False

    def test_development_env_returns_false(self):
        """development 環境では False を返す."""
        assert is_production("development") is False


class TestIsAuthStubEnabled:
    """is_auth_stub_enabled 関数の真偽表テスト."""

    @pytest.mark.parametrize(
        "app_env, auth_stub_enabled, expected",
        [
            # production では auth_stub_enabled に関わらず False
            ("production", True, False),
            ("production", False, False),
            # staging は auth_stub_enabled の値に従う
            ("staging", True, True),
            ("staging", False, False),
            # local は auth_stub_enabled の値に従う
            ("local", True, True),
            ("local", False, False),
            # development は auth_stub_enabled の値に従う
            ("development", True, True),
            ("development", False, False),
        ],
    )
    def test_is_auth_stub_enabled(self, app_env, auth_stub_enabled, expected):
        """is_auth_stub_enabled の真偽表を検証する."""
        result = is_auth_stub_enabled(app_env, auth_stub_enabled)
        assert result == expected, (
            f"is_auth_stub_enabled({app_env!r}, {auth_stub_enabled}) "
            f"should be {expected}, but got {result}"
        )

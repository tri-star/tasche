"""カスタム例外クラス、FastAPI 例外ハンドラー."""


class TascheException(Exception):
    """Tasche 基底例外."""

    pass


class UserNotFoundException(TascheException):
    """ユーザーが見つからない."""

    def __init__(self, user_id: str):
        """初期化."""
        self.user_id = user_id
        super().__init__(f"User not found: {user_id}")


class TaskNotFoundException(TascheException):
    """タスクが見つからない."""

    def __init__(self, task_id: str):
        """初期化."""
        self.task_id = task_id
        super().__init__("Task not found")


class WeekNotFoundException(TascheException):
    """現在の週が見つからない."""

    def __init__(self, user_id: str):
        """初期化."""
        self.user_id = user_id
        super().__init__(f"Current week not found for user: {user_id}")


class AuthenticationError(TascheException):
    """認証エラー基底クラス."""

    pass


class InvalidTokenError(AuthenticationError):
    """トークンが無効."""

    def __init__(self, detail: str = "Invalid token"):
        """初期化."""
        self.detail = detail
        super().__init__(detail)


class TokenExpiredError(AuthenticationError):
    """トークンの期限切れ."""

    def __init__(self, detail: str = "Token has expired"):
        """初期化."""
        self.detail = detail
        super().__init__(detail)


class InvalidRefreshTokenError(AuthenticationError):
    """リフレッシュトークンが無効."""

    def __init__(self, detail: str = "Invalid refresh token"):
        """初期化."""
        self.detail = detail
        super().__init__(detail)


class InvalidAuthorizationCodeError(AuthenticationError):
    """認可コードが無効（Google OAuth エラー、ID Token 検証失敗など）.

    Google 認可コード交換失敗・ID Token 検証失敗に加え、
    既存ユーザーへの自動紐付け拒否にも使用する。
    """

    def __init__(self, detail: str = "Invalid authorization code"):
        """初期化."""
        self.detail = detail
        super().__init__(detail)


class ValidationError(TascheException):
    """バリデーションエラー."""

    def __init__(self, detail: str = "Validation error"):
        """初期化."""
        self.detail = detail
        super().__init__(detail)

"""設定リソースのスキーマ."""

from pydantic import BaseModel, ConfigDict, Field

from tasche.models.enums import Theme


class SettingsResponse(BaseModel):
    """ユーザー設定のレスポンス."""

    timezone: str
    theme: Theme

    model_config = ConfigDict(from_attributes=True)


class SettingsUpdateRequest(BaseModel):
    """ユーザー設定の部分更新リクエスト."""

    # max_length=50 は IANA タイムゾーン最長値 ("America/Argentina/Buenos_Aires" = 32文字) に余裕を持たせた値で、models/user.py の String(50) と揃えている
    timezone: str | None = Field(default=None, min_length=1, max_length=50)
    theme: Theme | None = Field(default=None)

"""Auth0サービス."""

import logging

import httpx

from tasche.core.config import settings
from tasche.schemas.auth import Auth0TokenResponse, Auth0UserInfo

logger = logging.getLogger(__name__)


class Auth0Service:
    """Auth0 Authentication API との通信を担当するサービスクラス."""

    def __init__(self):
        """サービスの初期化."""
        self.domain = settings.auth0_domain
        self.client_id = settings.auth0_client_id
        self.client_secret = settings.auth0_client_secret
        self.audience = settings.auth0_audience

    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Auth0TokenResponse:
        """認可コードをトークンに交換.

        Args:
            code: Auth0から受け取った認可コード
            redirect_uri: コールバックURI

        Returns:
            Auth0TokenResponse: トークンレスポンス

        Raises:
            httpx.HTTPStatusError: Auth0 APIがエラーを返した場合
        """
        url = f"https://{self.domain}/oauth/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            return Auth0TokenResponse(**response.json())

    async def refresh_tokens(self, refresh_token: str) -> Auth0TokenResponse:
        """リフレッシュトークンで新しいトークンを取得.

        Args:
            refresh_token: リフレッシュトークン

        Returns:
            Auth0TokenResponse: 新しいトークンレスポンス

        Raises:
            httpx.HTTPStatusError: Auth0 APIがエラーを返した場合
        """
        url = f"https://{self.domain}/oauth/token"
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            return Auth0TokenResponse(**response.json())

    async def get_userinfo(self, access_token: str) -> Auth0UserInfo:
        """アクセストークンからユーザー情報を取得.

        Args:
            access_token: Auth0アクセストークン

        Returns:
            Auth0UserInfo: ユーザー情報

        Raises:
            httpx.HTTPStatusError: Auth0 APIがエラーを返した場合
        """
        url = f"https://{self.domain}/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return Auth0UserInfo(**response.json())


# シングルトンインスタンス
auth0_service = Auth0Service()

"""Google OAuth テスト用ヘルパー関数."""

import time

from jose import jwt as jose_jwt

from tasche.core.config import settings


def make_google_id_token(
    rsa_private_key_pem: str,
    *,
    sub: str = "google_sub_12345",
    email: str = "test@example.com",
    email_verified: bool = True,
    name: str = "Test User",
    picture: str = "https://example.com/photo.jpg",
    aud: str | None = None,
    iss: str = "https://accounts.google.com",
    exp_offset: int = 3600,
) -> str:
    """テスト用 Google ID Token（RSA 署名付き）を生成する."""
    now = int(time.time())
    audience = aud if aud is not None else settings.google_oauth_client_id

    payload = {
        "iss": iss,
        "aud": audience,
        "sub": sub,
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "picture": picture,
        "iat": now,
        "exp": now + exp_offset,
    }

    return jose_jwt.encode(
        payload,
        rsa_private_key_pem,
        algorithm="RS256",
        headers={"kid": "test-key-id"},
    )

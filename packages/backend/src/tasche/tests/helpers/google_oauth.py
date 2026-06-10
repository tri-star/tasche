"""Google OAuth テスト用ヘルパー関数."""

import time

from joserfc import jwt
from joserfc.jwk import RSAKey

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

    pem_bytes = (
        rsa_private_key_pem.encode()
        if isinstance(rsa_private_key_pem, str)
        else rsa_private_key_pem
    )
    key = RSAKey.import_key(pem_bytes)
    return jwt.encode({"alg": "RS256", "kid": "test-key-id"}, payload, key)

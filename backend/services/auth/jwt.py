"""JWT creation and verification for access tokens.

Signing uses the first configured key; verification accepts any configured
key so secrets can rotate without invalidating live tokens.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from backend.config import get_settings
from backend.services.auth.errors import InvalidTokenError


def create_access_token(subject: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_minutes),
        "typ": "access",
    }
    return jwt.encode(payload, settings.jwt_signing_key, algorithm="HS256")


def verify_access_token(token: str) -> str:
    """Return the token subject (user id) or raise InvalidTokenError."""
    settings = get_settings()
    last_error: Exception | None = None
    for key in settings.jwt_verify_keys:
        try:
            payload = jwt.decode(token, key, algorithms=["HS256"])
        except jwt.PyJWTError as exc:
            last_error = exc
            continue
        if payload.get("typ") != "access":
            raise InvalidTokenError("Not an access token.")
        return str(payload["sub"])
    raise InvalidTokenError(str(last_error) if last_error else "No signing keys configured.")

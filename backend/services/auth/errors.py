"""Auth-domain errors. Converted to the uniform API error envelope in routes."""
from __future__ import annotations


class AuthError(Exception):
    """Base class for authentication failures."""

    code = "AUTH_ERROR"
    http_status = 400

    def __init__(self, message: str, code: str | None = None, http_status: int | None = None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if http_status is not None:
            self.http_status = http_status


class InvalidOtpError(AuthError):
    def __init__(self, message: str = "Invalid or expired verification code.") -> None:
        super().__init__(message, code="INVALID_OTP", http_status=401)


class OtpRateLimitError(AuthError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="OTP_RATE_LIMITED", http_status=429)


class UnauthorizedError(AuthError):
    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message, code="UNAUTHORIZED", http_status=401)


class InvalidTokenError(AuthError):
    def __init__(self, message: str = "Invalid or expired access token.") -> None:
        super().__init__(message, code="INVALID_TOKEN", http_status=401)

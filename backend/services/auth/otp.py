"""Email OTP generation and verification.

Delivery goes through Resend when a key is configured; otherwise the code is
logged to the server console (local development). Only the SHA-256 hash of a
code is ever stored.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import random
import string

from backend.config import get_settings

logger = logging.getLogger(__name__)


def generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verify_code(code: str, code_hash: str) -> bool:
    """Constant-time comparison against the stored hash."""
    return hmac.compare_digest(hash_code(code.strip()), code_hash)


async def send_code(email: str, code: str) -> None:
    """Deliver an OTP by email (Resend) or console when unconfigured."""
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning(
            "OTP for %s (dev, no RESEND_API_KEY): %s", email, code
        )
        return

    try:
        import resend

        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": settings.auth_email_from,
                "to": [email],
                "subject": "Your Code4Care verification code",
                "html": (
                    "<p>Your Code4Care verification code is:</p>"
                    f"<h2 style='letter-spacing:4px'>{code}</h2>"
                    "<p>It expires in 5 minutes. If you didn't request this, "
                    "you can safely ignore this email.</p>"
                ),
            }
        )
    except Exception:
        # Resend's free tier only delivers to the account owner's own email.
        # Fall back to the console so dev/testing never hard-fails the flow.
        logger.warning(
            "Email delivery failed for %s — OTP for development is %s", email, code
        )
        logger.exception("Resend send error")

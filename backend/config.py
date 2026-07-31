"""Environment-backed application settings. Secrets are never hardcoded."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchored to this package, not the process CWD: the server is normally started
# from the repository root (`uvicorn backend.main:app`), where a bare ".env"
# would silently resolve to a non-existent file.
_ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    # --- Google Cloud Vision credentials -----------------------------------
    # The REST client authenticates with an API key only. Requests fail with
    # OCR_NOT_CONFIGURED (503) when this is unset.
    google_vision_api_key: str | None = None

    # --- OCR behaviour ------------------------------------------------------
    ocr_timeout_seconds: float = 30.0
    # Comma-separated BCP-47 hints, e.g. "en,hi". Empty = Vision auto-detects.
    ocr_language_hints: str = ""
    max_image_bytes: int = 10 * 1024 * 1024

    # --- LLM (Gemma via Google AI Studio) ------------------------------------
    # Get a free key at https://aistudio.google.com/app/apikey
    gemini_api_key: str | None = None
    # Legacy Groq key — kept for backward compatibility, unused if gemini_api_key is set
    groq_api_key: str | None = None
    llm_timeout_seconds: float = 30.0

    # --- HTTP ---------------------------------------------------------------
    cors_allow_origins: str = "http://localhost:5173"

    # --- Auth: JWT -----------------------------------------------------------
    # Comma-separated list of signing keys. The first is the current key; the
    # rest are accepted for verification so signing keys can rotate without
    # logging users out. Generate with:  python -c "import secrets; print(secrets.token_urlsafe(48))"
    jwt_secret_keys: str = ""
    jwt_access_token_minutes: int = 60 * 24  # 24h

    # --- Auth: email OTP -----------------------------------------------------
    # Resend API key (https://resend.com/api-keys). When unset, OTP codes are
    # printed to the server console instead of emailed — for local development.
    resend_api_key: str | None = None
    # Verified "from" sender for OTP emails (Resend verifies the domain).
    auth_email_from: str = "Code4Care <onboarding@resend.dev>"
    otp_ttl_seconds: int = 300  # 5 minutes
    otp_max_attempts: int = 5

    # --- Database -------------------------------------------------------------
    # SQLite for local dev (persists to backend/data/care.db, anchored to this
    # package so it works from any CWD); set a PostgreSQL URL in production, e.g.
    #   postgresql+asyncpg://user:pass@host:5432/care
    database_url: str | None = None

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            # Render-style connection strings come as postgres:// — async
            # SQLAlchemy needs the postgresql+asyncpg:// scheme.
            url = self.database_url.strip()
            if url.startswith("postgres://") or url.startswith("postgresql://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1).replace(
                    "postgresql://", "postgresql+asyncpg://", 1
                )
            return url
        # Default: SQLite beside the backend package (backend/data/care.db).
        path = Path(__file__).resolve().parent / "data" / "care.db"
        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{path.as_posix()}"

    @property
    def jwt_signing_key(self) -> str:
        """First configured key = the one we sign with."""
        keys = [k.strip() for k in (self.jwt_secret_keys or "").split(",") if k.strip()]
        if not keys:
            raise RuntimeError(
                "JWT_SECRET_KEYS is not set. Generate one with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        return keys[0]

    @property
    def jwt_verify_keys(self) -> list[str]:
        return [k.strip() for k in (self.jwt_secret_keys or "").split(",") if k.strip()]

    @property
    def language_hints(self) -> list[str]:
        return [h.strip() for h in self.ocr_language_hints.split(",") if h.strip()]

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

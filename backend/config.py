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

    # --- HTTP ---------------------------------------------------------------
    cors_allow_origins: str = "http://localhost:5173"

    # --- Gemini / LLM -------------------------------------------------------
    # API key for Google Generative AI (Gemini). LLM features fall back to
    # rule-based responses when this is unset.
    gemini_api_key: str | None = None

    @property
    def language_hints(self) -> list[str]:
        return [h.strip() for h in self.ocr_language_hints.split(",") if h.strip()]

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

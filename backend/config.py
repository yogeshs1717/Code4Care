"""Environment-backed application settings. Secrets are never hardcoded."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

# Anchored to this package, not the process CWD: the server is normally started
# from the repository root (`uvicorn backend.main:app`), where a bare ".env"
# would silently resolve to a non-existent file.
_ENV_FILE = Path(__file__).resolve().parent / ".env"

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

        # --- Google Cloud Vision credentials -----------------------------------
        google_vision_api_key: str | None = None

        # --- OCR behaviour ------------------------------------------------------
        ocr_timeout_seconds: float = 30.0
        ocr_language_hints: str = ""
        max_image_bytes: int = 10 * 1024 * 1024

        # --- HTTP ---------------------------------------------------------------
        cors_allow_origins: str = "https://code4-care-8zc2.vercel.app,http://localhost:5173"

        # --- Gemini / LLM -------------------------------------------------------
        # API key for Google Generative AI (Google AI Studio / Gemini / Gemma).
        gemini_api_key: str | None = None
        gemma_model_name: str = "models/gemma-4-31b-it"

        @property
        def language_hints(self) -> list[str]:
            return [h.strip() for h in self.ocr_language_hints.split(",") if h.strip()]

        @property
        def allowed_origins(self) -> list[str]:
            return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

except (ImportError, ModuleNotFoundError):
    try:
        from pydantic.v1 import BaseSettings  # type: ignore
    except (ImportError, ModuleNotFoundError):
        from pydantic import BaseSettings  # type: ignore

    class Settings(BaseSettings):  # type: ignore
        google_vision_api_key: str | None = None
        ocr_timeout_seconds: float = 30.0
        ocr_language_hints: str = ""
        max_image_bytes: int = 10 * 1024 * 1024
        cors_allow_origins: str = "https://code4-care-8zc2.vercel.app,http://localhost:5173"
        gemini_api_key: str | None = None
        gemma_model_name: str = "gemma-2-27b-it"

        class Config:
            env_file = str(_ENV_FILE)
            extra = "ignore"

        @property
        def language_hints(self) -> list[str]:
            return [h.strip() for h in self.ocr_language_hints.split(",") if h.strip()]

        @property
        def allowed_origins(self) -> list[str]:
            return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

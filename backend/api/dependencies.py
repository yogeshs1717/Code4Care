"""Dependency providers. Concrete implementations are wired only here."""
from __future__ import annotations

from functools import lru_cache

from backend.config import get_settings
from backend.services.ocr.base import IOCRService
from backend.services.ocr.google_vision import GoogleVisionOCRService


@lru_cache
def _ocr_service() -> IOCRService:
    settings = get_settings()
    return GoogleVisionOCRService(
        api_key=settings.google_vision_api_key,
        timeout_seconds=settings.ocr_timeout_seconds,
        max_image_bytes=settings.max_image_bytes,
        language_hints=settings.language_hints,
    )


def get_ocr_service() -> IOCRService:
    """FastAPI dependency: swap the implementation here or via app.dependency_overrides."""
    return _ocr_service()

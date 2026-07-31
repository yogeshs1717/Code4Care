"""Dependency providers. Concrete implementations are wired only here.

LLM provider selection order:
  1. GEMINI_API_KEY set  →  GoogleGemmaService  (google-genai SDK, gemma-4-31b-it)
  2. GROQ_API_KEY set    →  GroqGemmaService    (legacy, kept for compatibility)
  3. Neither set         →  None  (Gemma features silently disabled)

Auth:
  - get_current_user: Bearer JWT → User (401 otherwise).
"""
from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.db.base import get_db
from backend.db.models import User
from backend.services.auth import jwt as jwt_service
from backend.services.auth.errors import UnauthorizedError
from backend.services.llm.base import ILLMService
from backend.services.ocr.base import IOCRService
from backend.services.ocr.google_vision import GoogleVisionOCRService

logger = logging.getLogger(__name__)


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
    return _ocr_service()


# ── LLM (Gemma) ───────────────────────────────────────────────────────────────

@lru_cache
def _llm_service() -> ILLMService | None:
    settings = get_settings()

    # Prefer Google AI Studio (Gemma 4 via google-genai)
    if settings.gemini_api_key:
        try:
            from backend.services.llm.google_gemma import GoogleGemmaService
            logger.info("LLM: using GoogleGemmaService (gemma-4-31b-it via AI Studio)")
            return GoogleGemmaService(
                api_key=settings.gemini_api_key,
                timeout_seconds=settings.llm_timeout_seconds,
            )
        except Exception as exc:
            logger.warning("GoogleGemmaService init failed: %s", exc)

    # Legacy fallback: Groq
    if settings.groq_api_key:
        try:
            from backend.services.llm.groq_gemma import GroqGemmaService
            logger.info("LLM: using GroqGemmaService (legacy)")
            return GroqGemmaService(
                api_key=settings.groq_api_key,
                timeout_seconds=settings.llm_timeout_seconds,
            )
        except Exception as exc:
            logger.warning("GroqGemmaService init failed: %s", exc)

    logger.info("LLM: no API key configured — Gemma features disabled")
    return None


def get_llm_service() -> ILLMService | None:
    """FastAPI dependency for Gemma. Returns None when no LLM is configured."""
    return _llm_service()


# ── Auth ───────────────────────────────────────────────────────────────────────

async def get_current_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the Bearer token to a User. Raises UnauthorizedError otherwise."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise UnauthorizedError()

    user_id = jwt_service.verify_access_token(token)
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError()
    return user

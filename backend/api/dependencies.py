"""Dependency providers. Concrete implementations are wired only here."""
from __future__ import annotations

from functools import lru_cache

from backend.config import get_settings
from backend.repositories.json_additive_repository import JsonAdditiveRepository
from backend.repositories.json_ingredient_repository import JsonIngredientRepository
from backend.repositories.json_rules_repository import JsonRulesRepository
from backend.services.health_engine.base import IHealthEngine
from backend.services.health_engine.engine import HealthRuleEngine
from backend.services.llm.base import ILLMService
from backend.services.llm.gemini_service import GeminiLLMService
from backend.services.ocr.base import IOCRService
from backend.services.ocr.google_vision import GoogleVisionOCRService
from backend.services.resolver.base import IIngredientResolver
from backend.services.resolver.resolver import IngredientResolver


# ── Repositories ────────────────────────────────────────────────────────────

@lru_cache
def _ingredient_repository() -> JsonIngredientRepository:
    return JsonIngredientRepository()


@lru_cache
def _additive_repository() -> JsonAdditiveRepository:
    return JsonAdditiveRepository()


@lru_cache
def _rules_repository() -> JsonRulesRepository:
    return JsonRulesRepository()


# ── Services ────────────────────────────────────────────────────────────────

@lru_cache
def _ocr_service() -> IOCRService:
    settings = get_settings()
    return GoogleVisionOCRService(
        api_key=settings.google_vision_api_key,
        timeout_seconds=settings.ocr_timeout_seconds,
        max_image_bytes=settings.max_image_bytes,
        language_hints=settings.language_hints,
    )


@lru_cache
def _resolver() -> IIngredientResolver:
    return IngredientResolver(repository=_ingredient_repository())


@lru_cache
def _health_engine() -> IHealthEngine:
    return HealthRuleEngine(
        rules_repository=_rules_repository(),
        additive_repository=_additive_repository(),
    )


@lru_cache
def _llm_service() -> ILLMService:
    settings = get_settings()
    return GeminiLLMService(api_key=settings.gemini_api_key)


# ── FastAPI dependency functions ────────────────────────────────────────────

def get_ocr_service() -> IOCRService:
    """FastAPI dependency: swap the implementation here or via app.dependency_overrides."""
    return _ocr_service()


def get_resolver() -> IIngredientResolver:
    """FastAPI dependency for the ingredient resolver."""
    return _resolver()


def get_health_engine() -> IHealthEngine:
    """FastAPI dependency for the health rule engine."""
    return _health_engine()


def get_llm_service() -> ILLMService:
    """FastAPI dependency for the LLM service."""
    return _llm_service()


"""Analyze endpoint — Rule Engine primary, Gemma for explanation + fallback.

Architecture (correct):
  1. Deterministic Rule Engine runs FIRST (fast, no external calls).
  2. Gemma receives the deterministic report for:
     a) AI Summary / explanation (consumer-friendly) — runs in parallel with
        b) Classifying any unresolved ingredients not in the rule dataset.
  3. If Gemma is unavailable, the deterministic report + empty AI summary
     is returned — always showing the user SOMETHING useful.
  4. Gemma failures ALWAYS caught here — never produce a 502.
"""
from __future__ import annotations

import asyncio
import json
import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_llm_service
from backend.db.base import get_db
from backend.db.models import ScanHistory, User
from backend.models.errors import ErrorResponse
from backend.models.health_report import (
    AllergenInfo,
    ConcernItem,
    DeterministicReport,
    GemmaResolvedIngredient,
    HealthConsideration,
    HealthScore,
    PositiveIngredient,
    ProcessingLevel,
)
from backend.services.health_engine.engine import analyze_ingredients
from backend.services.personalization.engine import PersonalizationResult, evaluate_personalization
from backend.services.health_engine.rules import (
    ALLERGEN_KEYWORDS,
    CONCERN_INGREDIENTS,
    POSITIVE_INGREDIENTS,
    ULTRA_PROCESSED_KEYWORDS,
)
from backend.services.llm.base import ILLMService
from backend.services.llm.exceptions import LLMError
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["analyze"])

# ── Build the rules context (used both by engine and for Gemma context) ───────

_RULES_CONTEXT = json.dumps(
    {
        "scoring_rules": {
            "base_score": 75,
            "deductions": {
                "high_severity_concern": -10,
                "moderate_severity_concern": -5,
                "low_severity_concern": -2,
                "ultra_processed": -10,
                "processed": -5,
            },
            "bonuses": {
                "per_positive_ingredient": 5,
                "wholesome_list_bonus": 5,
            },
            "clamp": [0, 100],
        },
        "concern_ingredients": CONCERN_INGREDIENTS,
        "positive_ingredients": POSITIVE_INGREDIENTS,
        "ultra_processed_keywords": ULTRA_PROCESSED_KEYWORDS,
        "allergen_keywords": ALLERGEN_KEYWORDS,
    },
    indent=2,
    ensure_ascii=False,
)


class AnalyzeRequest(BaseModel):
    ingredient_text: str


class AnalyzeResponse(BaseModel):
    report: DeterministicReport
    ai_summary: str | None = None
    personalization: PersonalizationResult | None = None


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Score ingredients — deterministic rule engine, Gemma explainer",
)
async def analyze_ingredients_endpoint(
    body: AnalyzeRequest,
    request: Request,
    llm_service: ILLMService | None = Depends(get_llm_service),
    session: AsyncSession = Depends(get_db),
) -> AnalyzeResponse:
    # ── Step 1: Deterministic rule engine (instant, no API calls) ─────────────
    try:
        report = analyze_ingredients(body.ingredient_text)
    except Exception:
        logger.error("Rule engine crashed:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ingredient analysis failed. Please try again.",
        )

    # ── Step 1b: Personalization (the user's health priorities) ───────────────
    # Only evaluated for authenticated users. Anonymous scans get no personal
    # verdict — the neutral report is still shown.
    personalization: PersonalizationResult | None = None
    auth_header = request.headers.get("Authorization", "")
    current_user: User | None = None
    if auth_header.startswith("Bearer "):
        try:
            current_user = await get_current_user(
                authorization=auth_header, session=session
            )
        except Exception:
            logger.debug("Personalization skipped: invalid token", exc_info=True)

    if current_user is not None:
        profile = await _load_profile(session, current_user.id)
        if profile is not None:
            personalization = evaluate_personalization(
                items=report.original_ingredients,
                priorities=profile.priorities,
                personal_allergies=profile.allergies,
            )

    # ── Step 1c: Remember the scan (app memory) ───────────────────────────────
    if current_user is not None:
        try:
            session.add(
                ScanHistory(
                    user_id=current_user.id,
                    ingredient_text=body.ingredient_text,
                    report_json=report.model_dump_json(),
                )
            )
            await session.commit()
        except Exception:
            logger.debug("Scan memory write failed", exc_info=True)
            await session.rollback()

    ai_summary: str | None = None

    # ── Step 2: Gemma AI tasks (parallel — both at the same time, non-blocking) ─
    if llm_service is not None:
        async def _resolve() -> None:
            """Classify unresolved ingredients via Gemma."""
            if not report.unresolved_ingredients:
                return
            try:
                resolved = await llm_service.resolve_unknown_ingredients(
                    report.unresolved_ingredients
                )
                if resolved:
                    report.gemma_resolved_ingredients = [
                        GemmaResolvedIngredient(
                            name=str(r["name"]),
                            category=str(r.get("category", "neutral")),
                            reason=str(r.get("reason", "")),
                            is_fallback_resolved=True,
                        )
                        for r in resolved
                    ]
                    report.unresolved_ingredients = []
            except Exception:
                logger.debug("Gemma resolve non-fatal error", exc_info=True)

        async def _summarize() -> str | None:
            """Generate AI summary from deterministic report."""
            try:
                return await llm_service.generate_summary(report.model_dump_json())
            except Exception:
                logger.debug("Gemma summary non-fatal error", exc_info=True)
                return None

        # Fire both tasks in parallel
        summary_task = asyncio.create_task(_summarize())
        resolve_task = asyncio.create_task(_resolve())

        await resolve_task  # await both, but summary is the one we need
        ai_summary = await summary_task

    return AnalyzeResponse(
        report=report, ai_summary=ai_summary, personalization=personalization
    )


async def _load_profile(session: AsyncSession, user_id: str):
    from backend.services.auth.user_store import get_profile

    return await get_profile(session, user_id)

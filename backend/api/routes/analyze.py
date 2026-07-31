"""Analyze endpoint. Chains Resolver → Health Engine → Gemma Explainer → structured report."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.api.dependencies import get_health_engine, get_llm_service, get_resolver
from backend.models.health import HealthReport
from backend.services.health_engine.base import IHealthEngine
from backend.services.llm.base import ILLMService
from backend.services.resolver.base import IIngredientResolver

router = APIRouter(tags=["analyze"])


class AnalyzeRequest(BaseModel):
    """User-confirmed ingredient text to analyze."""

    ingredient_text: str = Field(
        ..., min_length=1, description="The ingredient text to analyze."
    )


class AnalyzeResponse(BaseModel):
    """Full health report with AI summary."""

    report: HealthReport
    ai_summary: str | None = None


@router.post(
    "/api/v1/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze ingredient text and produce a health report",
)
@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    include_in_schema=False,
)
async def analyze_ingredients(
    request: AnalyzeRequest,
    resolver: IIngredientResolver = Depends(get_resolver),
    engine: IHealthEngine = Depends(get_health_engine),
    llm_service: ILLMService = Depends(get_llm_service),
) -> AnalyzeResponse:
    """Run the full analysis pipeline:

    1. Resolve ingredient text → canonical ingredients.
    2. Apply health rules → health report.
    3. Gemma / Gemini LLM → AI summary analysis.
    """
    resolution = resolver.resolve(request.ingredient_text)
    report = engine.analyze(resolution)
    ai_summary = await llm_service.explain(report)
    return AnalyzeResponse(report=report, ai_summary=ai_summary)

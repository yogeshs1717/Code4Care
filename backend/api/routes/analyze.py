"""Analyze endpoint. Chains Resolver → Health Engine → structured report."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.api.dependencies import get_health_engine, get_resolver
from backend.models.health import HealthReport
from backend.services.health_engine.base import IHealthEngine
from backend.services.resolver.base import IIngredientResolver

router = APIRouter(prefix="/api/v1", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    """User-confirmed ingredient text to analyze."""

    ingredient_text: str = Field(
        ..., min_length=1, description="The ingredient text to analyze."
    )


class AnalyzeResponse(BaseModel):
    """Full deterministic health report."""

    report: HealthReport


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze ingredient text and produce a health report",
)
async def analyze_ingredients(
    request: AnalyzeRequest,
    resolver: IIngredientResolver = Depends(get_resolver),
    engine: IHealthEngine = Depends(get_health_engine),
) -> AnalyzeResponse:
    """Run the full analysis pipeline:

    1. Resolve ingredient text → canonical ingredients.
    2. Apply deterministic health rules → health report.
    """
    resolution = resolver.resolve(request.ingredient_text)
    report = engine.analyze(resolution)
    return AnalyzeResponse(report=report)

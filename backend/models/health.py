"""Typed health-report models — the output of the deterministic rule engine.

Every field is rule-derived and reproducible: same input always produces the
same output. No LLM involvement at this stage.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class HealthScore(BaseModel):
    """Numeric health score with a human-readable label and display colour."""

    score: int = Field(ge=0, le=100)
    label: str
    color: str


class ProcessingLevel(BaseModel):
    """How processed the product is, determined by additive count and type."""

    id: str
    label: str
    description: str
    color: str


class PositiveIngredient(BaseModel):
    """An ingredient identified as beneficial."""

    name: str
    benefit: str


class ConcernItem(BaseModel):
    """An ingredient or additive flagged as a health concern."""

    name: str
    concern: str
    severity: str


class AllergenInfo(BaseModel):
    """A detected allergen and the ingredients that triggered it."""

    name: str
    triggered_by: list[str] = Field(default_factory=list)


class HealthConsideration(BaseModel):
    """A broader health consideration triggered by ingredient patterns."""

    title: str
    description: str
    type: str  # "warning" | "info"


class HealthReport(BaseModel):
    """Complete deterministic health report — the only shape this stage exposes."""

    health_score: HealthScore
    processing_level: ProcessingLevel
    positive_ingredients: list[PositiveIngredient] = Field(default_factory=list)
    ingredients_of_concern: list[ConcernItem] = Field(default_factory=list)
    health_considerations: list[HealthConsideration] = Field(default_factory=list)
    allergens: list[AllergenInfo] = Field(default_factory=list)
    unresolved_ingredients: list[str] = Field(default_factory=list)
    ingredient_count: int = 0
    resolved_count: int = 0

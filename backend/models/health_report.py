"""Typed health-report contracts for the deterministic rule engine and Gemma.

These models are the boundary between the deterministic pipeline and the
explanation layer. Gemma receives ONLY these structured facts -- never raw
OCR text, never internal resolver state.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class HealthScore(BaseModel):
    """Deterministic health score."""

    score: float = Field(ge=0.0, le=100.0)
    label: str
    color: str  # hex colour, e.g. "#34A853"


class ProcessingLevel(BaseModel):
    """NOVA-style processing classification."""

    label: str          # e.g. "Ultra-processed"
    description: str    # short plain-text explanation


class PositiveIngredient(BaseModel):
    """An ingredient with recognised health benefit."""

    name: str
    benefit: str


class ConcernItem(BaseModel):
    """An ingredient flagged as potentially concerning."""

    name: str
    concern: str        # why it's flagged
    severity: str       # "low" | "moderate" | "high"


class AllergenInfo(BaseModel):
    """Common allergen declaration."""

    name: str
    triggered_by: list[str] = Field(default_factory=list)


class HealthConsideration(BaseModel):
    """One health consideration (can be positive or cautionary)."""

    title: str
    description: str
    type: str  # "warning" | "positive" | "info"


class GemmaResolvedIngredient(BaseModel):
    """An ingredient resolved by Gemma when the rule engine found no match.

    The ``is_fallback_resolved`` flag makes it unambiguous to the frontend
    that this classification came from AI, not from the deterministic dataset.
    Gemma assigns one of three categories: 'positive', 'concerning', or 'neutral'.
    """

    name: str
    category: str          # "positive" | "concerning" | "neutral"
    reason: str            # one-sentence plain-English explanation
    is_fallback_resolved: bool = True


class DeterministicReport(BaseModel):
    """Complete rule-engine output -- Gemma's only knowledge source."""

    product_name: str | None = None
    health_score: HealthScore
    processing_level: ProcessingLevel
    positive_ingredients: list[PositiveIngredient] = Field(default_factory=list)
    ingredients_of_concern: list[ConcernItem] = Field(default_factory=list)
    health_considerations: list[HealthConsideration] = Field(default_factory=list)
    allergens: list[AllergenInfo] = Field(default_factory=list)
    unresolved_ingredients: list[str] = Field(default_factory=list)
    gemma_resolved_ingredients: list[GemmaResolvedIngredient] = Field(default_factory=list)
    original_ingredients: list[str] = Field(default_factory=list, description="Full original ingredient list as split from input")

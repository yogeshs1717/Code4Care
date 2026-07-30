"""Typed ingredient-resolution contract.

The resolver reports what a label *says*, never what it means: no health
judgement, scoring, or safety classification appears in these models.
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class CanonicalIngredient(BaseModel):
    """One entry of the offline ingredient dataset."""

    id: str
    canonical_name: str
    aliases: list[str] = Field(default_factory=list)
    category: str | None = None
    subcategory: str | None = None


class MatchType(str, Enum):
    """How a parsed item was tied to a canonical ingredient.

    Ordered from most to least certain; the value is surfaced so every
    resolution stays explainable.
    """

    EXACT = "exact"
    ALIAS = "alias"
    PARTIAL = "partial"
    FUZZY = "fuzzy"


class ResolvedIngredient(BaseModel):
    """A parsed label item successfully tied to the dataset."""

    raw_text: str
    normalized_text: str
    ingredient: CanonicalIngredient
    match_type: MatchType
    match_confidence: float = Field(ge=0.0, le=1.0)
    parent: str | None = None


class UnresolvedIngredient(BaseModel):
    """A parsed label item with no dataset match. Never guessed at."""

    raw_text: str
    normalized_text: str
    parent: str | None = None


class ResolutionStats(BaseModel):
    """Counts describing how much of the label was recognised.

    `coverage` is a parsing statistic, not a health or quality score.
    """

    total_items: int
    resolved_count: int
    unresolved_count: int
    coverage: float = Field(ge=0.0, le=1.0)


class IngredientResolution(BaseModel):
    """Resolver output: the only shape this stage exposes downstream."""

    resolved: list[ResolvedIngredient] = Field(default_factory=list)
    unresolved: list[UnresolvedIngredient] = Field(default_factory=list)
    stats: ResolutionStats

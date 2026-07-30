"""Typed additive models for the food-additives dataset.

Additives are preservatives, emulsifiers, sweeteners, colours, stabilizers,
flavour enhancers etc. identified by INS / E-number codes on ingredient labels.
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Broad risk classification for consumer-facing labelling."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class AdditiveCategory(str, Enum):
    PRESERVATIVE = "preservative"
    COLOUR = "colour"
    SWEETENER = "sweetener"
    EMULSIFIER = "emulsifier"
    STABILIZER = "stabilizer"
    FLAVOUR_ENHANCER = "flavour_enhancer"
    ANTIOXIDANT = "antioxidant"
    ACIDITY_REGULATOR = "acidity_regulator"
    THICKENER = "thickener"
    HUMECTANT = "humectant"
    RAISING_AGENT = "raising_agent"
    ANTI_CAKING_AGENT = "anti_caking_agent"
    GLAZING_AGENT = "glazing_agent"
    SEQUESTRANT = "sequestrant"
    BULKING_AGENT = "bulking_agent"
    OTHER = "other"


class FoodAdditive(BaseModel):
    """One entry of the food-additives dataset."""

    id: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    ins_number: str | None = None
    e_number: str | None = None
    category: AdditiveCategory
    risk_level: RiskLevel
    concerns: list[str] = Field(default_factory=list)
    common_in: list[str] = Field(default_factory=list)
    allergen_flags: list[str] = Field(default_factory=list)

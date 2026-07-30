"""Typed OCR contract. This is the only shape the OCR stage may expose upstream.

Raw provider payloads and provider-specific types must never cross this boundary.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Axis-aligned box in source-image pixel coordinates."""

    x: int
    y: int
    width: int
    height: int


class OCRBlock(BaseModel):
    """A contiguous region of recognised text."""

    text: str
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    bounding_box: BoundingBox | None = None


class OCRMetadata(BaseModel):
    """Provider-attributed quality signals.

    Kept out of the root so the contract stays provider-agnostic: swapping the
    OCR provider changes only these values, never the shape of the response.
    """

    provider: str
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class OCRResult(BaseModel):
    """Structured OCR output. `text` is the value presented to the user for edit."""

    text: str
    blocks: list[OCRBlock] = Field(default_factory=list)
    metadata: OCRMetadata

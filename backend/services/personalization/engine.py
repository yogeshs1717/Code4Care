"""Personalization engine — deterministic evaluation of the user's health
priorities against a scanned ingredient list.

Runs AFTER the base rule engine (which still produces the neutral health score).
It layers the user's constraints on top: warnings for moderate triggers, a
hard block when a priority is severely violated.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from backend.services.personalization.rules import PRIORITIES, evaluate_priority

# Priorities that were shipped in this version. Everything else is ignored.
VALID_PRIORITIES = list(PRIORITIES.keys())


class PriorityResult(BaseModel):
    key: str
    label: str
    matches: list[str] = Field(default_factory=list)
    level: str = "safe"   # "safe" | "flag" | "block"
    message: str | None = None


class PersonalizationResult(BaseModel):
    """Layered personal verdict for a report."""

    enabled: bool
    priorities: list[PriorityResult] = Field(default_factory=list)
    blocked: bool = False
    block_message: str | None = None
    warnings: list[PriorityResult] = Field(default_factory=list)


def evaluate_personalization(
    items: list[str],
    priorities: list[str] | None,
    personal_allergies: list[str] | None = None,
) -> PersonalizationResult:
    """Evaluate the user's priorities against split ingredients.

    Args:
        items: split ingredient strings from the base rule engine.
        priorities: subset of VALID_PRIORITIES, or None/[] to disable.
        personal_allergies: free-text personal allergen list (used only by
            the "allergies" priority).

    Returns:
        PersonalizationResult with per-priority levels plus a summary
        (blocked + block_message, and a warnings list).
    """
    if not items:
        return PersonalizationResult(enabled=False)

    chosen = [p for p in (priorities or []) if p in PRIORITIES]
    if not chosen:
        return PersonalizationResult(enabled=False)

    results = [
        evaluate_priority(p, items, personal_allergies=personal_allergies)
        for p in chosen
    ]

    blocks = [r for r in results if r["level"] == "block"]
    flags = [r for r in results if r["level"] == "flag"]

    block_message = None
    if blocks:
        # Combine: "This product is high in sugar — avoid it. This product is
        # high in sodium — avoid it." Keep it short (first block priority).
        first = blocks[0]
        if len(blocks) == 1:
            block_message = first.get("message") or (
                f"This product conflicts with your {first['label']} priority."
            )
        else:
            labels = ", ".join(b["label"] for b in blocks[:3])
            block_message = (
                f"This product conflicts with your health priorities ({labels}). "
                "It's best to avoid it."
            )

    return PersonalizationResult(
        enabled=True,
        priorities=[PriorityResult(**r) for r in results],
        blocked=bool(blocks),
        block_message=block_message,
        warnings=[PriorityResult(**r) for r in flags],
    )

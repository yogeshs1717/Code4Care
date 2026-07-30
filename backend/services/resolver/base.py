"""Resolver interface. Callers depend on this, never on an implementation."""
from __future__ import annotations

from abc import ABC, abstractmethod

from backend.models.ingredients import IngredientResolution


class IIngredientResolver(ABC):
    """User-confirmed ingredient text -> canonical ingredients.

    Implementations must be deterministic: the same text always resolves the
    same way. No health judgement, scoring or LLM involvement.
    """

    @abstractmethod
    def resolve(self, text: str) -> IngredientResolution:
        """Parse and match `text` against the canonical dataset."""

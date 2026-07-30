"""Health engine interface. The engine decides facts; LLMs only explain them."""
from __future__ import annotations

from abc import ABC, abstractmethod

from backend.models.health import HealthReport
from backend.models.ingredients import IngredientResolution


class IHealthEngine(ABC):
    """Deterministic health analysis from resolved ingredients."""

    @abstractmethod
    def analyze(self, resolution: IngredientResolution) -> HealthReport:
        """Produce a health report from resolved ingredients.

        Same input must always produce the same output.
        """

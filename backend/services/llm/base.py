"""LLM service interface. The LLM explains facts; it never decides them."""
from __future__ import annotations

from abc import ABC, abstractmethod

from backend.models.health import HealthReport


class ILLMService(ABC):
    """Interface for LLM-powered explanations and chat."""

    @abstractmethod
    async def explain(self, report: HealthReport) -> str:
        """Generate an AI summary explaining the health report in simple language."""

    @abstractmethod
    async def chat(
        self,
        report: HealthReport,
        messages: list[dict[str, str]],
        new_message: str,
    ) -> str:
        """Answer a user question about the product based on the structured report context."""

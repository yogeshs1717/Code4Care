"""Typed interface for Gemma-powered LLM services.

Every implementation wraps a provider that hosts the actual open-weight Gemma
model (Google AI Studio, Groq, Together, Ollama, etc.) -- never a different model.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class ILLMService(ABC):
    """Gemma-powered text generation for the Code4Care pipeline.

    Gemma receives *only* structured deterministic report context -- never raw
    OCR text, never arbitrary user content outside the chat scope. This boundary
    is enforced at the route layer, not inside the service.
    """

    @abstractmethod
    async def generate_summary(self, report_context: str) -> str:
        """Produce a concise AI summary of a deterministic health report.

        Args:
            report_context: Machine-readable structured report JSON
                           (the same DeterministicReport the frontend sees).

        Returns:
            Plain-text summary in simple consumer-friendly language.
        """
        ...

    @abstractmethod
    async def chat(
        self,
        report_context: str,
        messages: list[dict],
        new_message: str,
    ) -> str:
        """Continue a multi-turn conversation about a given report.

        Args:
            report_context: Structured DeterministicReport JSON.
            messages:        Prior message history
                             ([{role: "user"|"assistant", content: str}, ...]).
            new_message:     The latest user question.

        Returns:
            Assistant reply text.
        """
        ...

    @abstractmethod
    async def resolve_unknown_ingredients(
        self, ingredient_names: list[str]
    ) -> list[dict]:
        """Classify ingredients not found in the deterministic dataset."""
        ...

    @abstractmethod
    async def score_ingredients(
        self,
        ingredient_text: str,
        rules_context: str,
    ) -> dict:
        """Ask Gemma to score an ingredient list using the provided rules.

        Args:
            ingredient_text: Raw label text / comma-separated ingredients.
            rules_context:   JSON string of concern rules + positive rules.

        Returns:
            Dict with keys:
              score          (int 0-100)
              label          (str — "Good" | "Moderate" | "Concerning" | "Poor")
              processing_label      (str)
              processing_description (str)
              positive_ingredients  (list[{name, benefit}])
              ingredients_of_concern (list[{name, concern, severity}])
              allergens             (list[{name, triggered_by}])
              gemma_resolved        (list[{name, category, reason}])
              explanation           (str — plain-language scoring rationale)
        """
        ...

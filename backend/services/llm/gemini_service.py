"""Gemini-backed LLM service for report explanation and conversational Q&A.

Gemma/Gemini receives ONLY structured report data — never raw OCR text.
It explains facts determined by the health engine. It NEVER:
- Calculates health scores
- Classifies ingredients
- Decides ingredient safety
- Overrides or alters deterministic logic
- Invents ingredient properties or facts
"""
from __future__ import annotations

import json
import logging

from backend.models.health import HealthReport
from backend.services.llm.base import ILLMService

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_EXPLAIN = """You are a friendly nutrition assistant called Gemma. You help ordinary consumers 
understand packaged food ingredient labels in simple, clear language.

You have been given a STRUCTURED HEALTH REPORT produced by a deterministic rule engine. 
Your job is to EXPLAIN this report — not to alter, recalculate, or override any of its findings.

Rules you MUST follow:
1. NEVER invent facts, scores, or properties that are not in the provided report.
2. NEVER change the health score or processing level.
3. NEVER claim an ingredient is safe or dangerous beyond what the report states.
4. Use simple, non-technical language suitable for ordinary consumers.
5. Be concise — aim for 3-5 sentences.
6. Highlight the most important findings: score, major concerns, and positives.
7. If there are allergens, mention them prominently.
8. Be encouraging but honest.

Respond with a brief, friendly summary paragraph. Do not use markdown headers or bullet points."""

_SYSTEM_PROMPT_CHAT = """You are a friendly nutrition assistant called Gemma. You answer questions about 
a specific food product based on its health report data.

You have the STRUCTURED HEALTH REPORT below. Answer the user's question based ONLY on this data.

Rules you MUST follow:
1. ONLY use information from the provided report to answer.
2. NEVER invent facts about ingredients that are not in the report.
3. NEVER change or override the health score or any report findings.
4. If asked something not covered by the report, say you don't have that information.
5. Use simple, friendly language.
6. Keep answers concise (2-4 sentences typically).
7. If asked about nutrition facts (calories, protein, etc.), explain that this tool analyzes ingredients, not nutrition labels."""


def _report_to_context(report: HealthReport) -> str:
    """Serialize the report into a clean text context for the LLM."""
    data = report.model_dump()
    return json.dumps(data, indent=2, default=str)


class GeminiLLMService(ILLMService):
    """Google Generative AI (Gemini) implementation of the LLM service."""

    def __init__(self, api_key: str | None = None, model_name: str = "gemini-2.0-flash") -> None:
        self._api_key = api_key
        self._model_name = model_name
        self._client = None

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self._client = genai.GenerativeModel(model_name)
                logger.info("Gemini LLM service initialized with model: %s", model_name)
            except ImportError:
                logger.warning(
                    "google-generativeai package not installed. LLM features will use fallback mode."
                )
            except Exception as exc:
                logger.warning("Failed to initialize Gemini client: %s", exc)

    @property
    def available(self) -> bool:
        return self._client is not None

    async def explain(self, report: HealthReport) -> str:
        if not self.available:
            return self._fallback_explain(report)

        context = _report_to_context(report)
        prompt = f"""{_SYSTEM_PROMPT_EXPLAIN}

--- HEALTH REPORT ---
{context}
--- END REPORT ---

Please provide a brief, friendly summary of this health report."""

        try:
            response = await self._generate(prompt)
            return response
        except Exception as exc:
            logger.error("Gemini explain failed: %s", exc)
            return self._fallback_explain(report)

    async def chat(
        self,
        report: HealthReport,
        messages: list[dict[str, str]],
        new_message: str,
    ) -> str:
        if not self.available:
            return self._fallback_chat(report, new_message)

        context = _report_to_context(report)

        # Build conversation history
        history = ""
        for msg in messages[-10:]:  # Keep last 10 messages for context
            role = "User" if msg.get("role") == "user" else "Gemma"
            history += f"\n{role}: {msg.get('content', '')}"

        prompt = f"""{_SYSTEM_PROMPT_CHAT}

--- HEALTH REPORT ---
{context}
--- END REPORT ---

--- CONVERSATION HISTORY ---
{history}
--- END HISTORY ---

User: {new_message}

Gemma:"""

        try:
            response = await self._generate(prompt)
            return response
        except Exception as exc:
            logger.error("Gemini chat failed: %s", exc)
            return self._fallback_chat(report, new_message)

    async def _generate(self, prompt: str) -> str:
        """Call the Gemini API."""
        import asyncio
        # google-generativeai uses sync API, run in executor
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: self._client.generate_content(prompt)
        )
        return response.text.strip()

    # ── Fallback responses when Gemini is not available ──────────────────────

    def _fallback_explain(self, report: HealthReport) -> str:
        """Generate a simple rule-based summary when the LLM is unavailable."""
        score = report.health_score
        parts = [
            f"This product received a health score of {score.score}/100 ({score.label}).",
            f"It is classified as {report.processing_level.label.lower()}.",
        ]

        if report.positive_ingredients:
            names = [p.name for p in report.positive_ingredients[:3]]
            parts.append(f"Positive ingredients include {', '.join(names)}.")

        if report.ingredients_of_concern:
            names = [c.name for c in report.ingredients_of_concern[:3]]
            parts.append(f"Ingredients of concern: {', '.join(names)}.")

        if report.allergens:
            names = [a.name for a in report.allergens]
            parts.append(f"⚠️ Allergen alert: {', '.join(names)}.")

        return " ".join(parts)

    def _fallback_chat(self, report: HealthReport, question: str) -> str:
        """Simple keyword-based fallback for chat when the LLM is unavailable."""
        q = question.lower()

        if any(w in q for w in ["score", "rating", "how good", "how bad", "healthy"]):
            s = report.health_score
            return f"This product has a health score of {s.score}/100, rated as '{s.label}'. {report.processing_level.description}"

        if any(w in q for w in ["allergen", "allergy", "allergic"]):
            if report.allergens:
                items = [f"{a.name} (from {', '.join(a.triggered_by)})" for a in report.allergens]
                return f"Allergens detected: {'; '.join(items)}. If you have any of these allergies, please avoid this product."
            return "No common allergens were detected in this product based on the ingredients analyzed."

        if any(w in q for w in ["concern", "bad", "worry", "harmful", "dangerous"]):
            if report.ingredients_of_concern:
                items = [f"{c.name}: {c.concern}" for c in report.ingredients_of_concern[:3]]
                return "Here are the main concerns: " + "; ".join(items) + "."
            return "No significant concerns were identified in this product."

        if any(w in q for w in ["positive", "good", "benefit", "healthy ingredient"]):
            if report.positive_ingredients:
                items = [f"{p.name} ({p.benefit})" for p in report.positive_ingredients[:3]]
                return "Positive ingredients found: " + "; ".join(items) + "."
            return "No specifically beneficial ingredients were identified, but that doesn't necessarily mean the product is unhealthy."

        if any(w in q for w in ["processed", "processing", "ultra"]):
            pl = report.processing_level
            return f"This product is classified as '{pl.label}'. {pl.description}"

        return (
            f"Based on the analysis, this product scored {report.health_score.score}/100 "
            f"({report.health_score.label}) and is classified as {report.processing_level.label.lower()}. "
            f"Feel free to ask about specific ingredients, allergens, or concerns!"
        )

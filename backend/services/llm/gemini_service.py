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
import re

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

You have the STRUCTURED HEALTH REPORT below. Answer the user's question directly and concisely.

Rules you MUST follow:
1. Provide ONLY a direct, short answer (1-2 sentences maximum).
2. NEVER output scratchpad, reasoning steps, bullet lists, intent analysis, or draft options.
3. ONLY use facts from the provided report.
4. Keep answers simple, clear, and direct."""


def _clean_llm_text(text: str) -> str:
    """Extract clean concise answer, stripping scratchpad thoughts, drafts, and bullet lists."""
    if not text:
        return ""
    text = text.strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    filtered = [
        line for line in lines
        if not line.startswith("*")
        and not line.startswith("-")
        and not line.startswith("Draft")
        and not line.startswith("Question:")
        and not line.startswith("Constraint:")
        and not line.startswith("User:")
        and not line.startswith("Intent:")
        and not line.startswith("Rules")
        and not line.startswith("Direct Answer")
        and not re.match(r"^\d+\.\s+", line)
    ]
    if filtered:
        res = " ".join(filtered).strip()
        if res.startswith('"') and res.endswith('"'):
            res = res[1:-1].strip()
        return res
    last_line = lines[-1].strip()
    if last_line.startswith('"') and last_line.endswith('"'):
        last_line = last_line[1:-1].strip()
    return last_line


def _report_to_context(report: HealthReport) -> str:
    """Serialize the report into a clean text context for the LLM."""
    data = report.model_dump()
    return json.dumps(data, indent=2, default=str)


class GeminiLLMService(ILLMService):
    """Google Generative AI (Gemma 4 / Gemini) implementation of the LLM service."""

    def __init__(self, api_key: str | None = None, model_name: str = "models/gemma-4-31b-it") -> None:
        self._api_key = api_key
        self._model_name = model_name
        self._genai = None

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self._genai = genai
                logger.info("Gemma/Gemini LLM service initialized with primary model: %s", model_name)
            except ImportError:
                logger.warning(
                    "google-generativeai package not installed. LLM features will use fallback mode."
                )
            except Exception as exc:
                logger.warning("Failed to initialize Google AI client: %s", exc)

    @property
    def available(self) -> bool:
        return self._genai is not None

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

Direct Answer:"""

        try:
            response = await self._generate(prompt)
            return response
        except Exception as exc:
            logger.error("Gemini chat failed: %s", exc)
            return self._fallback_chat(report, new_message)

    async def _generate(self, prompt: str) -> str:
        """Call the Gemma / Gemini API with automatic model fallback."""
        import asyncio

        models_to_try = [self._model_name]
        for fallback in ["models/gemma-4-31b-it", "gemma-4-31b-it", "models/gemma-4-26b-a4b-it", "models/gemini-3.6-flash", "models/gemini-2.0-flash"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        last_error = None
        for model_name in models_to_try:
            try:
                model = self._genai.GenerativeModel(model_name)
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None, lambda m=model: m.generate_content(prompt)
                )
                if response and response.text:
                    return _clean_llm_text(response.text)
            except Exception as exc:
                last_error = exc
                logger.warning("Model %s failed or not available, trying next fallback... (%s)", model_name, exc)

        if last_error:
            raise last_error
        raise RuntimeError("No model succeeded")

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

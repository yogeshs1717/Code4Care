"""Gemma provider backed by Groq (OpenAI-compatible API).

Groq hosts the open-weight Gemma 3 model (gemma3-12b-it) on custom LPU hardware
for extremely fast inference. This provider uses the OpenAI Python SDK pointed at
Groq's endpoint -- no GPU, no self-hosting, just an API key.

Free tier: 30 req/min on Gemma 3, 6000 req/day across all models.
"""
from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI

from backend.services.llm.base import ILLMService
from backend.services.llm.exceptions import (
    LLMConfigurationError,
    LLMProviderError,
    LLMTimeoutError,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_SUMMARIZE = """\
You are Gemma, Code4Care's on-device nutrition assistant. You explain health reports \
to ordinary consumers in simple, friendly language.

RULES:
- You ONLY see structured deterministic facts. Never guess or invent data.
- You explain what the report says. You do NOT calculate scores or classify ingredients.
- Never claim a product is "healthy" or "unhealthy" in absolute terms. Present facts.
- Use simple English. Avoid scare tactics. Be balanced.
- Keep your summary to 3-4 short paragraphs.
- Sign off as simply "Gemma" when it feels natural.

Here is the structured report data you must work from:
{report_context}
"""

_MAIN_SYSTEM_PROMPT = """\
You are Gemma, Code4Care's on-device nutrition assistant. You explain health reports \
to ordinary consumers in simple, friendly language.

RULES:
- You ONLY see structured deterministic facts. Never guess or invent data.
- You explain what the report says. You do NOT calculate scores or classify ingredients.
- Never claim a product is "healthy" or "unhealthy" in absolute terms. Present facts.
- Use simple English. Avoid scare tactics. Be balanced.
- You may reference the product name and specific ingredients when relevant.
- Be concise in conversation -- answer the user's question directly.

Here is the structured report data you must work from:
{report_context}
"""

_FALLBACK_RESOLVE_SYSTEM = """\
You are a food science assistant. For each ingredient in the JSON list, classify it \
as exactly one of: "positive", "concerning", or "neutral", and give a one-sentence reason.

Rules:
- "positive": Has a recognised nutritional or health benefit.
- "concerning": Has a documented health concern, is an artificial additive, or a known \
allergen trigger.
- "neutral": Ordinary food ingredient with no special benefit or documented concern.
- Return ONLY a JSON array. No markdown, no extra text, no explanation outside the JSON.
- Each element must have exactly the keys: "name", "category", "reason".

Example output format:
[
  {{"name": "xanthan gum", "category": "neutral", "reason": "A common food thickener \
generally considered safe in small amounts."}},
  {{"name": "acacia gum", "category": "neutral", "reason": "Natural dietary fibre from \
acacia trees, generally well tolerated."}}
]
"""


class GroqGemmaService(ILLMService):
    """Gemma 3 via Groq's OpenAI-compatible API."""

    provider_name = "groq_gemma"
    _MODEL = "gemma3-12b-it"

    def __init__(self, api_key: str | None = None, timeout_seconds: float = 30.0) -> None:
        if not api_key:
            raise LLMConfigurationError(
                "GROQ_API_KEY is not set on the server."
            )
        self._client = AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
            timeout=timeout_seconds,
        )
        self._timeout = timeout_seconds

    async def generate_summary(self, report_context: str) -> str:
        """Produce a consumer-friendly summary of the deterministic report."""
        try:
            response = await self._client.chat.completions.create(
                model=self._MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": _SYSTEM_PROMPT_SUMMARIZE.format(
                            report_context=report_context
                        ),
                    },
                    {
                        "role": "user",
                        "content": "Please summarize this health report in simple terms.",
                    },
                ],
                temperature=0.5,
                max_tokens=1024,
            )
        except Exception as exc:
            logger.exception("Gemma summary failed")
            raise self._map_error(exc) from exc

        text = response.choices[0].message.content or ""
        return text.strip()

    async def chat(
        self,
        report_context: str,
        messages: list[dict],
        new_message: str,
    ) -> str:
        """Continue a multi-turn conversation."""
        formatted = [
            {
                "role": "system",
                "content": _MAIN_SYSTEM_PROMPT.format(
                    report_context=report_context
                ),
            },
        ]
        for msg in messages:
            formatted.append({"role": msg["role"], "content": msg["content"]})
        formatted.append({"role": "user", "content": new_message})

        try:
            response = await self._client.chat.completions.create(
                model=self._MODEL,
                messages=formatted,
                temperature=0.7,
                max_tokens=2048,
            )
        except Exception as exc:
            logger.exception("Gemma chat failed")
            raise self._map_error(exc) from exc

        text = response.choices[0].message.content or ""
        return text.strip()

    async def resolve_unknown_ingredients(
        self, ingredient_names: list[str]
    ) -> list[dict]:
        """Ask Gemma to classify ingredients not in the deterministic dataset."""
        if not ingredient_names:
            return []

        user_prompt = (
            "Classify each of the following ingredients. "
            "Return ONLY the JSON array — no markdown fences, no preamble.\n\n"
            + json.dumps(ingredient_names)
        )

        try:
            response = await self._client.chat.completions.create(
                model=self._MODEL,
                messages=[
                    {"role": "system", "content": _FALLBACK_RESOLVE_SYSTEM},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,   # low temperature for consistent structured output
                max_tokens=1024,
                # NOTE: response_format=json_object is NOT supported by gemma3 on Groq.
                # We rely on the strict system prompt + post-processing instead.
            )
        except Exception as exc:
            logger.exception("Gemma fallback resolve failed")
            raise self._map_error(exc) from exc

        raw = (response.choices[0].message.content or "").strip()

        # Strip markdown code fences if Gemma ignored the instruction
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        # Groq json_object wraps arrays in {"items": [...]} — unwrap defensively
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                results = parsed
            elif isinstance(parsed, dict):
                # Find the first list value in the dict
                results = next(
                    (v for v in parsed.values() if isinstance(v, list)), []
                )
            else:
                results = []
        except json.JSONDecodeError:
            logger.warning("Gemma returned non-JSON for fallback resolve: %s", raw[:200])
            results = []

        # Validate and normalise each item
        valid: list[dict] = []
        allowed_categories = {"positive", "concerning", "neutral"}
        for item in results:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            category = str(item.get("category", "neutral")).strip().lower()
            reason = str(item.get("reason", "")).strip()
            if not name:
                continue
            if category not in allowed_categories:
                category = "neutral"
            valid.append({"name": name, "category": category, "reason": reason})

        return valid

    # ------------------------------------------------------------------
    @staticmethod
    def _map_error(exc: Exception) -> LLMProviderError:
        """Map Groq/OpenAI SDK exceptions to the LLM failure taxonomy."""
        msg = str(exc)

        if "timeout" in msg.lower() or "timed out" in msg.lower():
            return LLMTimeoutError()
        if "authentication" in msg.lower() or "api key" in msg.lower():
            return LLMConfigurationError("Groq rejected the API key.")
        if "rate limit" in msg.lower():
            return LLMProviderError(
                "Gemma is temporarily rate-limited. Please try again."
            )

        return LLMProviderError(f"Gemma request failed: {msg[:300]}")

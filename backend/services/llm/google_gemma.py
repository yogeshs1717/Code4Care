"""Gemma provider backed by Google AI Studio (google-genai SDK).

Model: gemma-4-31b-it (Gemma 4 31B Instruct) — available on Google AI Studio
free tier. Gemma 4 uses a thinking mode that emits thought=True parts before
the actual response. We always extract only the non-thought parts.

Get a free API key at: https://aistudio.google.com/app/apikey
Set it as GEMINI_API_KEY in backend/.env
"""
from __future__ import annotations

import json
import logging
import re

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from backend.services.llm.base import ILLMService
from backend.services.llm.exceptions import (
    LLMConfigurationError,
    LLMProviderError,
    LLMTimeoutError,
)

logger = logging.getLogger(__name__)

_MODEL = "gemma-4-31b-it"

# Token budgets — Gemma 4 thinking mode consumes tokens before producing output.
_TOKENS_SUMMARY  = 4096
_TOKENS_CHAT     = 4096
_TOKENS_FALLBACK = 4096

# ── System prompts ────────────────────────────────────────────────────────────

_SYSTEM_SUMMARIZE = (
    "You are Gemma, Code4Care's nutrition assistant. "
    "Explain the following health report to an ordinary consumer in simple, "
    "friendly language. Rules: only use the facts in the report, never invent "
    "data, do not recalculate scores, avoid absolute claims like 'healthy' or "
    "'unhealthy', keep it to 3-4 short paragraphs, sign off as '— Gemma'."
)

_SYSTEM_CHAT = (
    "You are Gemma, Code4Care's nutrition assistant. "
    "Answer questions about the food product health report below. "
    "Rules: only reference facts already in the report, never invent data, "
    "do not recalculate scores, be concise, use simple language."
)

_SYSTEM_FALLBACK = (
    "You are a food science assistant. "
    "Classify each ingredient as exactly one of: "
    '"positive" (recognised health benefit), '
    '"concerning" (documented concern, artificial additive, or allergen), or '
    '"neutral" (ordinary ingredient, no notable benefit or concern). '
    "Return ONLY a raw JSON array — no markdown fences, no preamble. "
    'Each element must have exactly the keys "name", "category", "reason" '
    "(one sentence)."
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_text(response: types.GenerateContentResponse) -> str:
    """Return only the non-thought text from a Gemma 4 response.

    Gemma 4 emits a thinking part (thought=True) before the actual answer.
    The SDK's .text shortcut returns None when all content is marked as
    thinking. We filter manually to get the real answer.
    """
    if not response.candidates:
        return ""
    parts = response.candidates[0].content.parts or []
    answer_parts = [p.text or "" for p in parts if not p.thought]
    if any(answer_parts):
        return "".join(answer_parts).strip()
    # Fallback: if MAX_TOKENS hit mid-think, use thought text
    return "".join(p.text or "" for p in parts).strip()


def _strip_fences(raw: str) -> str:
    """Remove markdown code fences Gemma adds despite instructions."""
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


# ── Service ───────────────────────────────────────────────────────────────────

class GoogleGemmaService(ILLMService):
    """Gemma 4 31B via Google AI Studio (google-genai SDK)."""

    provider_name = "google_gemma"

    def __init__(
        self,
        api_key: str | None = None,
        timeout_seconds: float = 30.0,
        model: str = _MODEL,
    ) -> None:
        if not api_key:
            raise LLMConfigurationError(
                "GEMINI_API_KEY is not set. "
                "Get a free key at https://aistudio.google.com/app/apikey"
            )
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._timeout = timeout_seconds

    # ── ILLMService ───────────────────────────────────────────────────────────

    async def generate_summary(self, report_context: str) -> str:
        prompt = (
            f"{_SYSTEM_SUMMARIZE}\n\n"
            f"Health report:\n{report_context}\n\n"
            "Please write the summary now."
        )
        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.5,
                    max_output_tokens=_TOKENS_SUMMARY,
                ),
            )
        except Exception as exc:
            logger.exception("Gemma generate_summary failed")
            raise self._map_error(exc) from exc

        text = _extract_text(response)
        if not text:
            logger.warning(
                "Gemma generate_summary returned empty text; finish=%s",
                response.candidates[0].finish_reason if response.candidates else "?",
            )
        return text

    async def chat(
        self,
        report_context: str,
        messages: list[dict],
        new_message: str,
    ) -> str:
        system_header = f"{_SYSTEM_CHAT}\n\nHealth report:\n{report_context}\n\n---"

        contents: list = []
        for i, msg in enumerate(messages):
            role = "user" if msg["role"] == "user" else "model"
            text = msg["content"]
            if i == 0 and role == "user":
                text = f"{system_header}\n\n{text}"
            contents.append({"role": role, "parts": [{"text": text}]})

        if not contents:
            new_message = f"{system_header}\n\n{new_message}"

        contents.append({"role": "user", "parts": [{"text": new_message}]})

        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=_TOKENS_CHAT,
                ),
            )
        except Exception as exc:
            logger.exception("Gemma chat failed")
            raise self._map_error(exc) from exc

        return _extract_text(response)

    async def resolve_unknown_ingredients(
        self, ingredient_names: list[str]
    ) -> list[dict]:
        if not ingredient_names:
            return []

        prompt = (
            f"{_SYSTEM_FALLBACK}\n\n"
            "Classify the following ingredients. "
            "Return ONLY the raw JSON array — no markdown, no preamble.\n\n"
            f"{json.dumps(ingredient_names, ensure_ascii=False)}"
        )

        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=_TOKENS_FALLBACK,
                ),
            )
        except Exception as exc:
            logger.exception("Gemma resolve_unknown_ingredients failed")
            raise self._map_error(exc) from exc

        raw = _strip_fences(_extract_text(response))

        try:
            parsed = json.loads(raw)
            results: list = (
                parsed
                if isinstance(parsed, list)
                else next((v for v in parsed.values() if isinstance(v, list)), [])
                if isinstance(parsed, dict)
                else []
            )
        except json.JSONDecodeError:
            logger.warning("Gemma fallback resolve non-JSON (%.200s)", raw)
            results = []

        valid: list[dict] = []
        allowed = {"positive", "concerning", "neutral"}
        for item in results:
            if not isinstance(item, dict):
                continue
            name     = str(item.get("name",     "")).strip()
            category = str(item.get("category", "neutral")).strip().lower()
            reason   = str(item.get("reason",   "")).strip()
            if not name:
                continue
            if category not in allowed:
                category = "neutral"
            valid.append({"name": name, "category": category, "reason": reason})

        return valid

    async def score_ingredients(
        self,
        ingredient_text: str,
        rules_context: str,
    ) -> dict:
        """(Legacy) Ask Gemma to score an ingredient list.

        This method is no longer used in the primary path — the deterministic
        rule engine handles scoring. Kept for backward compatibility.
        """
        raise LLMConfigurationError(
            "Gemma scoring is disabled. The deterministic rule engine is the primary scorer."
        )

    # ── Error mapping ─────────────────────────────────────────────────────────

    @staticmethod
    def _map_error(exc: Exception) -> LLMProviderError:
        msg = str(exc).lower()

        if "timeout" in msg or "deadline" in msg:
            return LLMTimeoutError()

        if isinstance(exc, ClientError):
            code = getattr(exc, "status_code", 0)
            if code in (401, 403) or "permission" in msg or "api_key" in msg:
                return LLMConfigurationError(
                    "Google AI Studio rejected the API key. "
                    "Check GEMINI_API_KEY in backend/.env"
                )
            if code == 429 or "quota" in msg or "rate" in msg:
                return LLMProviderError(
                    "Gemma is rate-limited. Please try again in a moment."
                )
            if code == 404 or "not found" in msg:
                return LLMProviderError(
                    "Gemma model not available on this API key."
                )

        return LLMProviderError(f"Gemma request failed: {str(exc)[:300]}")

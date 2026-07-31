"""Text normalization shared by the dataset index and incoming label items.

Both sides go through `normalize`, so a match can never depend on casing,
accents, punctuation or quantity annotations.
"""
from __future__ import annotations

import re
import unicodedata

_PERCENTAGE = re.compile(r"\d+(?:[.,]\d+)?\s*%?")
_NUMBERS = re.compile(r"\b\d+\w*\b")
_NON_TEXT = re.compile(r"[^a-z0-9&\s-]")
_WHITESPACE = re.compile(r"\s+")

_INS_MAP: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(?:ins|e)\s*282\b", re.I), "calcium propionate preservative"),
    (re.compile(r"\b(?:ins|e)\s*211\b", re.I), "sodium benzoate preservative"),
    (re.compile(r"\b(?:ins|e)\s*330\b", re.I), "citric acid"),
    (re.compile(r"\b(?:ins|e)\s*471\b", re.I), "mono and diglycerides"),
    (re.compile(r"\b(?:ins|e)\s*500\b", re.I), "sodium bicarbonate baking soda"),
    (re.compile(r"\b(?:ins|e)\s*322\b", re.I), "lecithin emulsifier"),
    (re.compile(r"\b(?:ins|e)\s*102\b", re.I), "tartrazine yellow dye"),
    (re.compile(r"\b(?:ins|e)\s*110\b", re.I), "sunset yellow dye"),
    (re.compile(r"\b(?:ins|e)\s*129\b", re.I), "allura red dye"),
    (re.compile(r"\b(?:ins|e)\s*150d?\b", re.I), "caramel color"),
    (re.compile(r"\b(?:ins|e)\s*202\b", re.I), "potassium sorbate preservative"),
    (re.compile(r"\b(?:ins|e)\s*319\b", re.I), "tbhq preservative"),
    (re.compile(r"\b(?:ins|e)\s*320\b", re.I), "bha preservative"),
    (re.compile(r"\b(?:ins|e)\s*321\b", re.I), "bht preservative"),
    (re.compile(r"\b(?:ins|e)\s*621\b", re.I), "msg monosodium glutamate"),
    (re.compile(r"\b(?:ins|e)\s*950\b", re.I), "acesulfame potassium artificial sweetener"),
    (re.compile(r"\b(?:ins|e)\s*951\b", re.I), "aspartame artificial sweetener"),
    (re.compile(r"\b(?:ins|e)\s*955\b", re.I), "sucralose artificial sweetener"),
    (re.compile(r"\b(?:ins|e)\s*960\b", re.I), "stevia sweetener"),
]


def simplify_complex_name(raw_name: str) -> str:
    """Translate complex E/INS chemical additive codes into simple, understandable terms."""
    text = raw_name
    for pattern, replacement in _INS_MAP:
        if pattern.search(text):
            text = pattern.sub(replacement, text)
    return text


def normalize(text: str) -> str:
    """Fold `text` to its comparable form.

    Translates E-numbers/INS codes, strips accents, dropped quantities,
    removes numbers, punctuation reduced to spaces, and "&" spelled out.
    """
    text = simplify_complex_name(text)

    decomposed = unicodedata.normalize("NFKD", text)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))

    lowered = without_accents.lower()
    lowered = _PERCENTAGE.sub(" ", lowered)
    lowered = _NUMBERS.sub(" ", lowered)
    lowered = _NON_TEXT.sub(" ", lowered)
    lowered = lowered.replace("&", " and ")
    return _WHITESPACE.sub(" ", lowered).strip()


def tokenize(normalized: str) -> tuple[str, ...]:
    """Split already-normalized text into comparison tokens."""
    return tuple(normalized.split())

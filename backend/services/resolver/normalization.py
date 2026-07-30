"""Text normalization shared by the dataset index and incoming label items.

Both sides go through `normalize`, so a match can never depend on casing,
accents, punctuation or quantity annotations.
"""
from __future__ import annotations

import re
import unicodedata

_PERCENTAGE = re.compile(r"\d+(?:[.,]\d+)?\s*%")
_NON_TEXT = re.compile(r"[^a-z0-9&\s-]")
_WHITESPACE = re.compile(r"\s+")


def normalize(text: str) -> str:
    """Fold `text` to its comparable form.

    Accents are stripped (muesli == müesli), quantities dropped, punctuation
    reduced to spaces, and "&" spelled out so it matches "and".
    """
    decomposed = unicodedata.normalize("NFKD", text)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))

    lowered = without_accents.lower()
    lowered = _PERCENTAGE.sub(" ", lowered)
    lowered = _NON_TEXT.sub(" ", lowered)
    lowered = lowered.replace("&", " and ")
    return _WHITESPACE.sub(" ", lowered).strip()


def tokenize(normalized: str) -> tuple[str, ...]:
    """Split already-normalized text into comparison tokens."""
    return tuple(normalized.split())

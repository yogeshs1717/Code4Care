"""Fuzzy ingredient matcher — resolves unknown ingredients against common_ingredients.json.

Cache-loaded at module level on first call. Uses difflib for fuzzy name matching,
then maps the matched category to a score impact (positive / neutral only).

IMPORTANT: The fuzzy matcher NEVER returns "concerning" — only "positive" or "neutral".
Common food ingredients like sugar, oils, and grains are neutral here. The real
additive concerns come from the keyword-based system in rules.py, which catches
preservatives, artificial sweeteners, trans fats, etc.
"""
from __future__ import annotations

import difflib
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── Category → Score impact mapping ─────────────────────────────────────────────
# Only positive and neutral. No concerning categories — real additive concerns
# come from keyword matches in rules.py.

POSITIVE_CATEGORIES: set[str] = {
    "Vegetables",
    "Fruits",
    "Nuts & seeds",
    "Legumes & pulses",
    "Spices & herbs",
}

# Categories that register as sugar (for sugar-overload penalty in engine.py)
SUGAR_CATEGORIES: set[str] = {"Sugars & syrups"}

# Categories that register as oil/fat (for fat-density heuristics)
OIL_CATEGORIES: set[str] = {"Oils & fats"}

# ── Dataset cache ───────────────────────────────────────────────────────────────

_DATASET_PATH = Path(__file__).resolve().parents[3] / "common_ingredients.json"

_cache: list[dict[str, Any]] | None = None
_name_index: list[str] | None = None
_entry_index: list[dict[str, Any]] | None = None


def _ensure_loaded() -> None:
    """Load and index the dataset on first call."""
    global _cache, _name_index, _entry_index  # noqa: PLW0603
    if _cache is not None:
        return
    try:
        _cache = json.loads(_DATASET_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        logger.warning("Could not load common_ingredients.json: %s", exc)
        _cache = []
        _name_index = []
        _entry_index = []
        return

    _name_index = []
    _entry_index = []
    for entry in _cache:
        name = entry.get("canonical_name", "").lower()
        if name:
            _name_index.append(name)
            _entry_index.append(entry)
        for alias in entry.get("aliases", []):
            alias_lower = alias.lower()
            if alias_lower:
                _name_index.append(alias_lower)
                _entry_index.append(entry)


def get_category_impact(category: str) -> dict:
    """Return the score-impact descriptor for a given ingredient category.

    Returns a dict with keys: impact ("positive"|"neutral"), reason, category.
    """
    cat = category.strip()

    if cat in POSITIVE_CATEGORIES:
        return {
            "impact": "positive",
            "reason": f"Contains ingredients from {cat.lower()} — a beneficial food group.",
            "category": cat,
        }

    # Everything else is neutral — no score impact
    label = cat.lower() if cat else "food group"
    return {
        "impact": "neutral",
        "reason": f"Common ingredient from {label} — standard food component.",
        "category": cat or "Unknown",
    }


def fuzzy_match_ingredient(item: str, cutoff: float = 0.55) -> dict | None:
    """Fuzzy-match a single ingredient string against the canonical dataset.

    Args:
        item: Raw ingredient text.
        cutoff: Similarity threshold 0.0-1.0 (default 0.55).

    Returns:
        A dict with matched entry + confidence + impact (positive or neutral),
        or None if no match meets the cutoff.
    """
    _ensure_loaded()
    if not _name_index:
        return None

    normalized = item.strip().lower()
    if not normalized or len(normalized) < 2:
        return None

    # Step 1: Exact match
    if normalized in _name_index:
        idx = _name_index.index(normalized)
        matched_entry = _entry_index[idx]
        confidence = 1.0
    else:
        # Step 2: Try difflib fuzzy match with word-boundary awareness
        matches = difflib.get_close_matches(normalized, _name_index, n=8, cutoff=cutoff)
        if matches:
            scored: list[tuple[float, str]] = []
            norm_words = set(normalized.split())
            for m in matches:
                matcher = difflib.SequenceMatcher(None, normalized, m)
                ratio = matcher.ratio()
                match_words = set(m.split())
                word_overlap = len(norm_words & match_words)
                all_words_match = norm_words and word_overlap == len(norm_words)
                if all_words_match:
                    ratio += 0.15
                elif word_overlap >= 1:
                    ratio += 0.04 * word_overlap
                norm_first = normalized.split()[0] if normalized.split() else ""
                match_first = m.split()[0] if m.split() else ""
                if norm_first and match_first and norm_first == match_first:
                    ratio += 0.03
                if normalized in m and len(normalized) >= 4:
                    ratio += 0.05
                scored.append((ratio, m))
            scored.sort(reverse=True)
            idx = _name_index.index(scored[0][1])
            matched_entry = _entry_index[idx]
            confidence = scored[0][0]
        else:
            # Step 3: Word-by-word containment
            if len(normalized.split()) >= 2:
                best_score = 0.0
                best_idx = -1
                norm_words = set(normalized.split())
                for i, name in enumerate(_name_index):
                    if not name:
                        continue
                    name_words = set(name.split())
                    overlap = len(norm_words & name_words)
                    if overlap >= 1:
                        total = max(len(norm_words | name_words), 1)
                        score = overlap / total
                        if score > best_score:
                            best_score = score
                            best_idx = i

                if best_score >= 0.4 and best_idx >= 0:
                    matched_entry = _entry_index[best_idx]
                    confidence = best_score
                else:
                    return None
            else:
                return None

    category = matched_entry.get("category") or "Other"
    impact = get_category_impact(category)

    return {
        "id": matched_entry.get("id", ""),
        "canonical_name": matched_entry.get("canonical_name", ""),
        "category": category,
        "subcategory": matched_entry.get("subcategory", ""),
        "match_confidence": round(confidence, 3),
        "impact": impact["impact"],
        "reason": impact["reason"],
    }


def fuzzy_categorise(item: str) -> dict | None:
    """Like fuzzy_match_ingredient but returns category info without full match details.

    Used for sugar/oil density calculations in the engine. Lighter weight.
    """
    result = fuzzy_match_ingredient(item, cutoff=0.55)
    if not result:
        return None
    return {
        "category": result["category"],
        "impact": result["impact"],
        "canonical_name": result["canonical_name"],
    }


def fuzzy_match_all(items: list[str], cutoff: float = 0.55) -> dict:
    """Batch fuzzy-match a list of ingredient strings.

    Returns:
        matched (list) and unmatched (list[str]).
    """
    matched: list[dict] = []
    unmatched: list[str] = []

    for item in items:
        result = fuzzy_match_ingredient(item, cutoff)
        if result:
            matched.append({
                "original": item,
                "canonical_name": result["canonical_name"],
                "category": result["category"],
                "impact": result["impact"],
                "reason": result["reason"],
                "confidence": result["match_confidence"],
            })
        else:
            unmatched.append(item)

    return {"matched": matched, "unmatched": unmatched}


def reload_dataset() -> None:
    """Force-reload the dataset (useful for testing)."""
    global _cache, _name_index, _entry_index  # noqa: PLW0603
    _cache = None
    _name_index = None
    _entry_index = None
    _ensure_loaded()

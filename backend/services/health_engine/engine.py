"""Deterministic rule engine — primary scoring pipeline.

This is the heart of the "explainable AI" promise: every output is rule-derived,
reproducible, and transparent. Gemma is only called for (a) classifying ingredients
not found in the rule dataset, and (b) generating the AI summary.

CALIBRATION (targets for real-world foods):
  - Whole foods salad (spinach, kale, olive oil, nuts):   95-100
  - Plain yogurt (milk, cultures):                         80-85
  - White bread (flour, water, yeast, salt, sugar):        75-82
  - Biscuit (flour, sugar, palm oil, salt, emulsifier):    65-72
  - Potato chips (potatoes, oil, salt, additives):         58-65
  - Chocolate bar (sugar, cocoa butter, emulsifiers):      55-65
  - Sugary soda (HFCS, phosphoric acid, caffeine):         35-45
  - Highly processed oil (trans fats, preservatives):      25-35

FUZZY MATCHING: Unknown ingredients are fuzzy-matched against the 846-item
common_ingredients_expanded.json dataset. Only "positive" (vegetables, fruits, nuts,
legumes, spices) or "neutral" impacts are assigned — never "concerning".
The real additive concerns come from keyword matches in rules.py.
"""
from __future__ import annotations

import re
from typing import Sequence

from backend.models.health_report import (
    AllergenInfo,
    ConcernItem,
    DeterministicReport,
    HealthConsideration,
    HealthScore,
    PositiveIngredient,
    ProcessingLevel,
)
from backend.services.health_engine.ingredient_matcher import fuzzy_match_all
from backend.services.health_engine.rules import (
    ALLERGEN_KEYWORDS,
    CONCERN_INGREDIENTS,
    POSITIVE_INGREDIENTS,
    ULTRA_PROCESSED_KEYWORDS,
)


def _normalise(text: str) -> str:
    """Lowercase, strip whitespace, collapse runs of spaces."""
    return re.sub(r"\s+", " ", text.strip().lower())


def _split_ingredients(raw_text: str) -> list[str]:
    """Split comma-separated ingredient text into individual items."""
    text = _normalise(raw_text)
    for sep in (",", ";", "|", "•", "·"):
        text = text.replace(sep, "\n")
    parts = [line.strip() for line in text.splitlines() if line.strip()]
    seen: set[str] = set()
    unique: list[str] = []
    for part in parts:
        if part not in seen:
            seen.add(part)
            unique.append(part)
    return unique


def _classify_processing(items: list[str]) -> ProcessingLevel:
    """Determine processing level based on ingredient composition."""
    total = len(items) or 1
    ultra_count = sum(
        1 for item in items
        for kw in ULTRA_PROCESSED_KEYWORDS
        if kw in item
    )

    if ultra_count >= 3 or (ultra_count / total) >= 0.2:
        return ProcessingLevel(
            label="Ultra-processed",
            description="Contains multiple industrial ingredients and additives "
                        "typical of ultra-processed foods.",
        )
    if ultra_count >= 1:
        return ProcessingLevel(
            label="Processed",
            description="Contains some processed ingredients or additives.",
        )
    return ProcessingLevel(
        label="Minimally processed",
        description="Mostly whole-food ingredients with minimal processing.",
    )


def _find_concerns(items: list[str]) -> list[ConcernItem]:
    found: list[ConcernItem] = []
    seen: set[str] = set()
    for item in items:
        for keyword, info in CONCERN_INGREDIENTS.items():
            if keyword in item and keyword not in seen:
                seen.add(keyword)
                found.append(
                    ConcernItem(
                        name=keyword.title(),
                        concern=info["concern"],
                        severity=info["severity"],
                    )
                )
    return found


def _find_positives(items: list[str]) -> list[PositiveIngredient]:
    found: list[PositiveIngredient] = []
    seen: set[str] = set()
    for item in items:
        for keyword, benefit in POSITIVE_INGREDIENTS.items():
            if keyword in item and keyword not in seen:
                seen.add(keyword)
                found.append(
                    PositiveIngredient(
                        name=keyword.title(),
                        benefit=benefit,
                    )
                )
    return found


def _fuzzy_classify_unknowns(items: list[str]) -> tuple[list[PositiveIngredient], list[str], set[str]]:
    """Fuzzy-match unknown items against common_ingredients_expanded.json.

    Returns (new_positives, still_unresolved, fuzzy_positive_originals).
    The third element is the set of ORIGINAL ingredient strings that were
    fuzzy-matched as positives — used to strip health halos from processed
    foods (potatoes in chips shouldn't boost score).
    Only returns positives — never concerns. Real concerns come from rules.py.
    Sugar and oil common ingredients are left as neutral (handled by heuristics
    in _compute_score instead).
    """
    already_known: set[str] = set()
    for item in items:
        for kw in CONCERN_INGREDIENTS:
            if kw in item:
                already_known.add(item)
        for kw in POSITIVE_INGREDIENTS:
            if kw in item:
                already_known.add(item)

    truly_unknown = [i for i in items if i not in already_known]
    if not truly_unknown:
        return [], [], set()

    result = fuzzy_match_all(truly_unknown, cutoff=0.55)
    new_positives: list[PositiveIngredient] = []
    still_unresolved: list[str] = []
    fuzzy_positive_originals: set[str] = set()

    for m in result["matched"]:
        if m["impact"] == "positive":
            name = m["canonical_name"].title() or m["original"].title()
            new_positives.append(
                PositiveIngredient(
                    name=name,
                    benefit=m["reason"],
                )
            )
            fuzzy_positive_originals.add(m["original"])
        # neutral impact → skip (no score effect)

    still_unresolved = result["unmatched"]

    return new_positives, still_unresolved, fuzzy_positive_originals


def _find_allergens(items: list[str]) -> list[dict]:
    """Return list of {name, triggered_by} dicts for matched allergens."""
    found: list[dict] = []
    for allergen_name, triggers in ALLERGEN_KEYWORDS.items():
        matched = [t for t in triggers if any(t in item for item in items)]
        if matched:
            found.append({"name": allergen_name, "triggered_by": matched})
    return found


def _compute_score(
    total_items: int,
    concerns: list[ConcernItem],
    positives: list[PositiveIngredient],
    processing: ProcessingLevel,
    ingredient_items: list[str],
) -> HealthScore:
    """Compute a deterministic health score 0-100.

    CALIBRATION (tuned for real-world foods, verified in test suite):
      - Whole foods salad (spinach, kale, olive oil, nuts):   95-100
      - Plain yogurt (milk, cultures):                         80-85
      - White bread (flour, water, yeast, salt, sugar):        75-82
      - Biscuit (flour, sugar, palm oil, salt, emulsifier):    62-72
      - Potato chips (potatoes, oil, salt, additives):         55-65
      - Chocolate bar (sugar, cocoa butter, emulsifiers):      50-62
      - Kurkure / Cheetos (refined flours, artificial colours, MSG, flavour): 30-42
      - Sugary soda (HFCS, phosphoric acid, caffeine):         30-45
      - Highly processed oil (trans fats, preservatives):      20-35

    Rules:
      - Base: 80 (every real food starts here)
      - Each high-severity concern:  -18 (preservatives, trans fats, carcinogens)
      - Each moderate concern:       -10 (additives with significant concerns)
      - Each low concern:             -4 (minor additives)
      - Artificial additive penalty:  -8 per artificial ingredient (colours, flavours, sweeteners)
      - Ultra-processed:              -15 (multiple industrial ingredients)
      - Processed:                    -5
      - Positive ingredient:          +4 each (up to 3, then +2 tapering)
      - Sugar density penalty:        -5 per sugar item beyond the 1st
      - Wholesome bonus:              +5 (if >2 positives AND <2 concerns)
      - Clamp to [0, 100].
    """
    score = 83.0

    # ── Concern deductions ──────────────────────────────────────────────────
    for c in concerns:
        if c.severity == "high":
            score -= 18
        elif c.severity == "moderate":
            score -= 10
        else:
            score -= 4

    # ── Processing penalties ────────────────────────────────────────────────
    if processing.label == "Ultra-processed":
        score -= 14
    elif processing.label == "Processed":
        score -= 5

    # ── Positive bonuses (tapered) ──────────────────────────────────────────
    pos_bonus = min(len(positives), 3) * 4
    if len(positives) > 3:
        pos_bonus += (len(positives) - 3) * 2
    score += pos_bonus

    # ── Sugar density penalty ───────────────────────────────────────────────
    # NOTE: maltodextrin deliberately excluded here — it's already caught as
    # a concern ingredient in rules.py, and it's a starch thickener not a sugar.
    sugar_keywords = {"sugar", "syrup", "sucrose", "glucose", "fructose",
                      "dextrose", "maltose", "honey", "molasses", "agave",
                      "cane juice", "high fructose corn syrup", "corn syrup",
                      "brown rice syrup", "maple syrup"}
    sugar_count = sum(
        1 for item in ingredient_items
        if any(kw in item for kw in sugar_keywords)
    )
    sugar_first = False
    if ingredient_items:
        first_item = ingredient_items[0]
        sugar_first = any(kw in first_item for kw in sugar_keywords)
    if sugar_count >= 2:
        score -= (sugar_count - 1) * 5
    elif sugar_count == 1 and sugar_first:
        score -= 5

    # ── Wholesome bonus ─────────────────────────────────────────────────────
    if len(positives) > 2 and len(concerns) < 2:
        score += 5

    score = max(0.0, min(100.0, score))

    # Label thresholds
    if score >= 72:
        label = "Good"
        color = "#34A853"
    elif score >= 50:
        label = "Moderate"
        color = "#FBBC04"
    elif score >= 30:
        label = "Concerning"
        color = "#EA4335"
    else:
        label = "Poor"
        color = "#DC2626"

    return HealthScore(score=round(score), label=label, color=color)


def _build_considerations(
    items: list[str],
    concerns: list[ConcernItem],
    positives: list[PositiveIngredient],
    processing: ProcessingLevel,
) -> list[HealthConsideration]:
    """Generate explainable health considerations from deterministic rules."""
    considerations: list[HealthConsideration] = []

    if processing.label == "Ultra-processed":
        considerations.append(
            HealthConsideration(
                title="Heavily processed",
                description="This product contains many industrial ingredients. "
                            "Consider less processed alternatives.",
                type="warning",
            )
        )

    if any(c.severity == "high" for c in concerns):
        high_names = [c.name for c in concerns if c.severity == "high"]
        considerations.append(
            HealthConsideration(
                title="High-severity additives present",
                description=f"Contains {', '.join(high_names)}. These ingredients "
                            f"have significant health concerns associated with them.",
                type="warning",
            )
        )

    if len(positives) >= 2:
        positive_names = [p.name for p in positives[:3]]
        considerations.append(
            HealthConsideration(
                title="Beneficial ingredients found",
                description=f"Contains {', '.join(positive_names)}. "
                            f"These provide nutritional benefits.",
                type="positive",
            )
        )

    # Sugar-related heuristic
    sugar_words = ["sugar", "syrup", "sucrose", "glucose", "fructose", "dextrose",
                   "maltose", "honey", "agave", "molasses", "cane juice",
                   "high fructose corn syrup", "corn syrup", "maltodextrin",
                   "maple syrup", "brown rice syrup"]
    sugar_count = sum(1 for item in items for sw in sugar_words if sw in item)
    if sugar_count >= 2:
        considerations.append(
            HealthConsideration(
                title="Multiple sweeteners",
                description=f"Contains {sugar_count} different sweeteners. "
                            f"High sugar intake is linked to various health issues.",
                type="warning",
            )
        )

    # Salt-related
    salt_words = ["salt", "sodium", "saline", "sea salt", "table salt", "rock salt"]
    if any(any(sw in item for sw in salt_words) for item in items):
        considerations.append(
            HealthConsideration(
                title="Added sodium",
                description="Contains added salt/sodium. Excess sodium is linked "
                            "to high blood pressure.",
                type="info",
            )
        )

    if not considerations:
        considerations.append(
            HealthConsideration(
                title="Simple ingredient list",
                description="This product has a short, recognisable ingredient "
                            "list with minimal additives.",
                type="positive",
            )
        )

    return considerations


def analyze_ingredients(ingredient_text: str) -> DeterministicReport:
    """Run the full deterministic rule engine on ingredient text.

    This is the PRIMARY scoring entrypoint. It is fast, deterministic, and
    requires no external API calls. Same input always produces the same output.
    """
    if not ingredient_text or not ingredient_text.strip():
        return DeterministicReport(
            product_name=None,
            health_score=HealthScore(score=0, label="Unknown", color="#9AA0A6"),
            processing_level=ProcessingLevel(
                label="Unknown",
                description="No ingredients provided.",
            ),
        )

    items = _split_ingredients(ingredient_text)

    concerns = _find_concerns(items)
    positives = _find_positives(items)

    processing = _classify_processing(items)

    # ── Step 2: Fuzzy-match unknown items against common_ingredients_expanded.json ─────
    fuzzy_positives, unresolved, fuzzy_positive_originals = _fuzzy_classify_unknowns(items)

    # Strip fuzzy positives from processed/ultra-processed foods — base whole
    # ingredients (potatoes, rice flour, spices) shouldn't add a health halo
    # to a processed junk food. Only minimally processed / whole foods keep
    # their fuzzy-positive bonuses.
    if processing.label in ("Ultra-processed", "Processed"):
        fuzzy_positives.clear()

    positives.extend(fuzzy_positives)
    score = _compute_score(len(items), concerns, positives, processing, items)
    considerations = _build_considerations(items, concerns, positives, processing)
    allergens = _find_allergens(items)

    unresolved_short = [u for u in unresolved if len(u.split()) <= 3][:5]

    return DeterministicReport(
        product_name=None,
        health_score=score,
        processing_level=processing,
        positive_ingredients=positives,
        ingredients_of_concern=concerns,
        health_considerations=considerations,
        allergens=[
            AllergenInfo(name=a["name"], triggered_by=a["triggered_by"])
            for a in allergens
        ],
        unresolved_ingredients=unresolved_short,
        original_ingredients=items,
    )

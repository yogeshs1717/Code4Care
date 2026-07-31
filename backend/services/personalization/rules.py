"""Deterministic keyword rules for user health priorities.

These parallel the scoring rules in `health_engine/rules.py` but represent the
user's *personal* constraints. A product can score 80 for everyone and still be
BLOCKED for a diabetic. Block/flag decisions are hard rules, never delegated to
Gemma — same guarantee as the base scorer.

Severity semantics per priority:
  - "flag"  → warning shown on the report
  - "block" → verdict replaced with a hard rejection (or red highlight)
"""
from __future__ import annotations

# ── Priority → relevant ingredients ──────────────────────────────────────────

DIABETES_KEYWORDS = [
    # Direct sugars / sweeteners
    "sugar", "sucrose", "glucose", "fructose", "dextrose", "maltose",
    "cane sugar", "cane juice", "invert sugar", "invert syrup", "molasses",
    "honey", "agave", "jaggery", "raw sugar", "brown sugar", "palm sugar",
    "coconut sugar", "high fructose corn syrup", "corn syrup", "glucose syrup",
    "fructose syrup", "golden syrup", "brown rice syrup", "maple syrup",
    "sorbitol", "xylitol", "maltitol", "erythritol", "mannitol",
    # High-glycemic ingredients
    "maltodextrin", "white flour", "maida", "refined flour", "corn starch",
    "potato starch", "tapioca starch",
]

HYPERTENSION_KEYWORDS = [
    "salt", "sodium", "sodium chloride", "sea salt", "table salt", "rock salt",
    "black salt", "kala namak", "sodium bicarbonate", "sodium carbonate",
    "monosodium glutamate", "msg", "sodium benzoate", "sodium nitrite",
    "sodium nitrate", "sodium metabisulfite", "sodium citrate", "baking soda",
    "baking powder",
]

HEART_KEYWORDS = [
    "trans fat", "partially hydrogenated", "hydrogenated oil",
    "hydrogenated vegetable oil", "shortening", "palm oil", "palmolein",
    "palm kernel oil", "ghee", "coconut oil", "coconut milk", "butter",
    "cream", "lard", "tallow", "saturated fat",
]

# Free-text personal allergens — checked as raw substring matches (e.g. "peanut").
# The existing ALLERGEN_KEYWORDS from the base engine is a good default list a
# user can pick from; the free-text list here is what they typed themselves.
ALLERGY_KEYWORDS = [
    "peanut", "groundnut", "tree nut", "almond", "walnut", "cashew", "pecan",
    "pistachio", "hazelnut", "milk", "dairy", "casein", "whey", "lactose",
    "butter", "cream", "cheese", "egg", "egg white", "egg yolk", "albumin",
    "gluten", "wheat", "barley", "rye", "spelt", "soy", "soya", "tofu",
    "sesame", "tahini", "shellfish", "shrimp", "prawn", "crab", "lobster",
    "fish", "sulfites", "mustard",
]

# ── Priority metadata (labels + block trigger thresholds) ────────────────────
# Flag/block are decided by matching ingredient PRESENCE + count, not by the
# base score. `block_when_any` products hit the red wall; `block_when_many`
# products hit it only when that many distinct matches appear.

PRIORITIES: dict[str, dict] = {
    "diabetes": {
        "label": "Diabetes",
        "keywords": DIABETES_KEYWORDS,
        "flag_when_any": True,
        # Concentrated added sweeteners — always block, even alone.
        "block_when_any": [
            "high fructose corn syrup", "corn syrup", "glucose syrup",
            "invert syrup", "invert sugar",
        ],
        "block_when_many": 3,   # 3+ distinct sweeteners → very high sugar
        # Special-cased in evaluate_priority: sugar as the FIRST ingredient
        # (labels list by weight) is treated as a block.
        "block_when_dominant": True,
        "block_message": "This product is high in sugar — avoid it.",
    },
    "hypertension": {
        "label": "High blood pressure",
        "keywords": HYPERTENSION_KEYWORDS,
        "flag_when_any": True,
        # MSG is among the highest-sodium seasonings — always block.
        "block_when_any": ["monosodium glutamate", "msg"],
        "block_when_many": 3,   # 3+ distinct sodium sources → high sodium
        "block_message": "This product is high in sodium — avoid it.",
    },
    "heart": {
        "label": "Heart health",
        "keywords": HEART_KEYWORDS,
        "flag_when_any": True,
        # Artificial trans fats are always worth blocking.
        "block_when_any": [
            "trans fat", "partially hydrogenated", "hydrogenated oil",
            "hydrogenated vegetable oil", "shortening",
        ],
        "block_when_many": 2,   # 2+ saturated-fat sources
        "block_message": "This product is high in unhealthy fats — avoid it.",
    },
    "allergies": {
        "label": "Allergies",
        "keywords": ALLERGY_KEYWORDS,
        "flag_when_any": True,
        "block_when_any": ALLERGY_KEYWORDS,
        "block_when_many": None,
        "block_message": "This product contains an allergen you've told us to avoid.",
    },
}


def find_matches(
    items: list[str], keywords: list[str]
) -> list[str]:
    """Return distinct keyword hits found in the ingredient list."""
    hits: list[str] = []
    seen: set[str] = set()
    for item in items:
        for kw in keywords:
            if kw in item and kw not in seen:
                seen.add(kw)
                hits.append(kw)
    return hits


def evaluate_priority(
    priority: str,
    items: list[str],
    personal_allergies: list[str] | None = None,
) -> dict:
    """Evaluate one priority against an ingredient list.

    Returns:
        {
          "key": priority,
          "label": human label,
          "matches": [matched keywords],
          "level": "safe" | "flag" | "block",
          "message": plain-language reason (None when safe),
        }
    """
    meta = PRIORITIES[priority]
    keywords = list(meta["keywords"])
    if priority == "allergies" and personal_allergies:
        keywords = [a for a in personal_allergies if a.strip()]

    matches = find_matches(items, keywords)

    level = "safe"
    message: str | None = None
    # Normalize ingredient order tracking: evaluate_priority is called with
    # report.original_ingredients, which preserves label order.
    items = [i.lower() for i in items]

    if priority == "allergies":
        if matches:
            level = "block"
            message = f"{meta['block_message']} Found: {', '.join(matches)}."
    elif matches:
        # Flag level for any match; escalate to block per the thresholds.
        level = "flag"
        block_any = meta.get("block_when_any") or []
        any_hits = [m for m in matches if any(kw in m for kw in block_any)]
        block_many = meta.get("block_when_many")
        many_hits = len(matches) >= block_many if block_many else False

        # Sugar listed FIRST on the label → it is the dominant ingredient by
        # weight (labels are ordered by proportion). Treat that as a block.
        dominant_hit = False
        if meta.get("block_when_dominant") and items and items[0]:
            first = items[0]
            dominant_hit = any(kw in first for kw in meta["keywords"])

        if any_hits or many_hits or dominant_hit:
            level = "block"
            message = meta.get("block_message")
        else:
            message = (
                f"Contains {', '.join(matches[:4])}{' and more' if len(matches) > 4 else ''}."
            )

    return {
        "key": priority,
        "label": meta["label"],
        "matches": matches,
        "level": level,
        "message": message,
    }

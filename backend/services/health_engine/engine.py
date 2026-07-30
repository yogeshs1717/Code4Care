"""Deterministic health rule engine.

Applies rules from health_rules.json to resolved ingredients to produce a
reproducible health report. Same input always produces the same output.

The engine decides facts. The LLM only explains them. The engine never uses
the LLM, and the LLM never overrides the engine.
"""
from __future__ import annotations

from typing import Any

from backend.models.additives import FoodAdditive, RiskLevel
from backend.models.health import (
    AllergenInfo,
    ConcernItem,
    HealthConsideration,
    HealthReport,
    HealthScore,
    PositiveIngredient,
    ProcessingLevel,
)
from backend.models.ingredients import IngredientResolution, ResolvedIngredient
from backend.repositories.base import AdditiveRepository, RulesRepository
from backend.services.health_engine.base import IHealthEngine


class HealthRuleEngine(IHealthEngine):
    """Rule-based health analysis — deterministic and explainable."""

    def __init__(
        self,
        rules_repository: RulesRepository,
        additive_repository: AdditiveRepository,
    ) -> None:
        self._rules_repo = rules_repository
        self._additive_repo = additive_repository
        self._additive_index: dict[str, FoodAdditive] | None = None

    # ── public ──────────────────────────────────────────────────────────────

    def analyze(self, resolution: IngredientResolution) -> HealthReport:
        rules = self._rules_repo.get_rules()
        additive_index = self._get_additive_index()

        # Classify each resolved ingredient into categories
        category_map = rules.get("ingredient_category_mapping", {})
        matched_categories: dict[str, list[str]] = {}
        matched_additives: list[FoodAdditive] = []

        for item in resolution.resolved:
            name_lower = item.ingredient.canonical_name.lower()

            # Check if it matches any concern/positive category
            for category, keywords in category_map.items():
                for keyword in keywords:
                    if keyword.lower() in name_lower or name_lower in keyword.lower():
                        matched_categories.setdefault(category, []).append(
                            item.ingredient.canonical_name
                        )
                        break

            # Check if it matches a known additive
            additive = self._find_additive(name_lower, additive_index)
            if additive:
                matched_additives.append(additive)

        # ── Scoring ─────────────────────────────────────────────────────────
        scoring = rules.get("scoring", {})
        score = scoring.get("base_score", 70)

        # Apply category bonuses
        for cat, bonus in scoring.get("category_bonuses", {}).items():
            if cat in matched_categories:
                score += bonus

        # Apply category penalties
        for cat, penalty in scoring.get("category_penalties", {}).items():
            if cat in matched_categories:
                score += penalty

        # Apply additive risk penalties
        risk_penalties = scoring.get("additive_risk_penalties", {})
        for additive in matched_additives:
            penalty = risk_penalties.get(additive.risk_level.value, 0)
            score += penalty

        # Penalty for unresolved ingredients
        unresolved_penalty = min(
            len(resolution.unresolved) * scoring.get("unresolved_penalty_per_item", -1),
            scoring.get("max_unresolved_penalty", -10),
        )
        score += unresolved_penalty

        # Clamp
        score = max(scoring.get("min_score", 0), min(scoring.get("max_score", 100), score))

        # ── Score label ─────────────────────────────────────────────────────
        score_labels = rules.get("score_labels", [])
        label_info = {"label": "Unknown", "color": "#5f6368"}
        for sl in score_labels:
            if sl["min"] <= score <= sl["max"]:
                label_info = {"label": sl["label"], "color": sl["color"]}
                break

        health_score = HealthScore(
            score=score, label=label_info["label"], color=label_info["color"]
        )

        # ── Processing level ────────────────────────────────────────────────
        processing_level = self._determine_processing_level(
            rules, matched_categories, matched_additives
        )

        # ── Positive ingredients ────────────────────────────────────────────
        positives = self._find_positives(rules, matched_categories)

        # ── Ingredients of concern ──────────────────────────────────────────
        concerns = self._find_concerns(rules, matched_categories, matched_additives)

        # ── Allergens ───────────────────────────────────────────────────────
        allergens = self._detect_allergens(rules, resolution.resolved, matched_additives)

        # ── Health considerations ───────────────────────────────────────────
        considerations = self._evaluate_considerations(rules, matched_categories)

        # ── Unresolved ──────────────────────────────────────────────────────
        unresolved_names = [u.raw_text for u in resolution.unresolved]

        return HealthReport(
            health_score=health_score,
            processing_level=processing_level,
            positive_ingredients=positives,
            ingredients_of_concern=concerns,
            health_considerations=considerations,
            allergens=allergens,
            unresolved_ingredients=unresolved_names,
            ingredient_count=resolution.stats.total_items,
            resolved_count=resolution.stats.resolved_count,
        )

    # ── private helpers ─────────────────────────────────────────────────────

    def _get_additive_index(self) -> dict[str, FoodAdditive]:
        if self._additive_index is None:
            index: dict[str, FoodAdditive] = {}
            for additive in self._additive_repo.list_all():
                index[additive.name.lower()] = additive
                for alias in additive.aliases:
                    index[alias.lower()] = additive
            self._additive_index = index
        return self._additive_index

    def _find_additive(
        self, name_lower: str, index: dict[str, FoodAdditive]
    ) -> FoodAdditive | None:
        if name_lower in index:
            return index[name_lower]
        # Check if the ingredient name contains an additive name
        for key, additive in index.items():
            if len(key) >= 4 and key in name_lower:
                return additive
        return None

    def _determine_processing_level(
        self,
        rules: dict[str, Any],
        matched_categories: dict[str, list[str]],
        matched_additives: list[FoodAdditive],
    ) -> ProcessingLevel:
        processing = rules.get("processing_levels", {})
        thresholds = processing.get("thresholds", {})
        levels = processing.get("levels", [])

        indicator_categories = thresholds.get("indicators", [])
        indicator_count = sum(
            1 for cat in indicator_categories if cat in matched_categories
        )

        high_risk_count = sum(
            1 for a in matched_additives if a.risk_level == RiskLevel.HIGH
        )
        total_additive_count = len(matched_additives)

        if (
            total_additive_count >= thresholds.get("ultra_processed_additive_count", 4)
            or high_risk_count >= 2
            or indicator_count >= 3
        ):
            level_id = "ultra_processed"
        elif (
            total_additive_count >= thresholds.get("highly_processed_additive_count", 2)
            or high_risk_count >= 1
            or indicator_count >= 2
        ):
            level_id = "highly_processed"
        elif total_additive_count >= 1 or indicator_count >= 1:
            level_id = "processed"
        else:
            level_id = "minimally_processed"

        for level in levels:
            if level["id"] == level_id:
                return ProcessingLevel(**level)

        # Fallback
        return ProcessingLevel(
            id="unknown",
            label="Unknown",
            description="Could not determine processing level.",
            color="#5f6368",
        )

    def _find_positives(
        self, rules: dict[str, Any], matched_categories: dict[str, list[str]]
    ) -> list[PositiveIngredient]:
        positive_defs = rules.get("positive_categories", {})
        positives: list[PositiveIngredient] = []
        seen: set[str] = set()

        for category, benefit in positive_defs.items():
            for ingredient_name in matched_categories.get(category, []):
                if ingredient_name not in seen:
                    seen.add(ingredient_name)
                    positives.append(
                        PositiveIngredient(name=ingredient_name, benefit=benefit)
                    )

        return positives

    def _find_concerns(
        self,
        rules: dict[str, Any],
        matched_categories: dict[str, list[str]],
        matched_additives: list[FoodAdditive],
    ) -> list[ConcernItem]:
        concern_defs = rules.get("concern_categories", {})
        concerns: list[ConcernItem] = []
        seen: set[str] = set()

        # Concerns from ingredient categories
        for category, info in concern_defs.items():
            for ingredient_name in matched_categories.get(category, []):
                if ingredient_name not in seen:
                    seen.add(ingredient_name)
                    concerns.append(
                        ConcernItem(
                            name=ingredient_name,
                            concern=info["concern"],
                            severity=info["severity"],
                        )
                    )

        # Concerns from additives with moderate/high risk
        for additive in matched_additives:
            if additive.risk_level in (RiskLevel.MODERATE, RiskLevel.HIGH):
                if additive.name not in seen:
                    seen.add(additive.name)
                    concern_text = "; ".join(additive.concerns) if additive.concerns else (
                        f"{additive.risk_level.value.title()} risk additive"
                    )
                    concerns.append(
                        ConcernItem(
                            name=additive.name,
                            concern=concern_text,
                            severity=additive.risk_level.value,
                        )
                    )

        return concerns

    def _detect_allergens(
        self,
        rules: dict[str, Any],
        resolved: list[ResolvedIngredient],
        matched_additives: list[FoodAdditive],
    ) -> list[AllergenInfo]:
        allergen_rules = rules.get("allergen_rules", [])
        allergens: list[AllergenInfo] = []

        for rule in allergen_rules:
            triggered_by: list[str] = []
            triggers = [t.lower() for t in rule.get("triggers", [])]

            # Check resolved ingredients
            for item in resolved:
                name_lower = item.ingredient.canonical_name.lower()
                for trigger in triggers:
                    if trigger in name_lower or name_lower in trigger:
                        triggered_by.append(item.ingredient.canonical_name)
                        break

            # Check additives
            additive_triggers = rule.get("additive_triggers", [])
            for additive in matched_additives:
                for flag in additive.allergen_flags:
                    if flag in additive_triggers:
                        triggered_by.append(f"{additive.name} (additive)")
                        break

            if triggered_by:
                allergens.append(
                    AllergenInfo(
                        name=rule["name"],
                        triggered_by=list(set(triggered_by)),
                    )
                )

        return allergens

    def _evaluate_considerations(
        self, rules: dict[str, Any], matched_categories: dict[str, list[str]]
    ) -> list[HealthConsideration]:
        consideration_rules = rules.get("health_considerations", [])
        considerations: list[HealthConsideration] = []

        for rule in consideration_rules:
            trigger_categories = rule.get("trigger_categories", [])
            min_count = rule.get("min_trigger_count", 1)
            total = sum(
                len(matched_categories.get(cat, []))
                for cat in trigger_categories
            )
            if total >= min_count:
                considerations.append(
                    HealthConsideration(
                        title=rule["title"],
                        description=rule["description"],
                        type=rule["type"],
                    )
                )

        return considerations

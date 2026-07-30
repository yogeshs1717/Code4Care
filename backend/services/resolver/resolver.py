"""Deterministic ingredient resolution against the canonical dataset.

Matching is attempted in descending order of certainty — exact, alias, fuzzy,
then partial — and the strategy that succeeded is reported on every result, so
a reader can always see *why* an item resolved the way it did.

Anything that does not match is returned as unresolved. Nothing is guessed.
"""
from __future__ import annotations

import difflib
from dataclasses import dataclass

from backend.models.ingredients import (
    CanonicalIngredient,
    IngredientResolution,
    MatchType,
    ResolutionStats,
    ResolvedIngredient,
    UnresolvedIngredient,
)
from backend.repositories.base import IngredientRepository
from backend.services.resolver.base import IIngredientResolver
from backend.services.resolver.normalization import normalize, tokenize
from backend.services.resolver.parsing import parse_ingredient_list

# Confidence reported for the non-scored match types.
_EXACT_CONFIDENCE = 1.0
_ALIAS_CONFIDENCE = 0.95

# Fuzzy matching on very short strings is noise ("salt" vs "malt").
_MIN_FUZZY_LENGTH = 4


@dataclass(frozen=True)
class _Phrase:
    """A dataset name pre-tokenized for sub-phrase search."""

    tokens: tuple[str, ...]
    ingredient: CanonicalIngredient


class IngredientResolver(IIngredientResolver):
    def __init__(
        self,
        repository: IngredientRepository,
        *,
        fuzzy_threshold: float = 0.85,
        min_partial_coverage: float = 0.5,
    ) -> None:
        """
        Args:
            repository: source of canonical ingredients.
            fuzzy_threshold: minimum similarity ratio for a fuzzy match.
            min_partial_coverage: fraction of an item's tokens a sub-phrase must
                cover to count; stops a single common word matching a long item.
        """
        self._repository = repository
        self._fuzzy_threshold = fuzzy_threshold
        self._min_partial_coverage = min_partial_coverage

        self._exact: dict[str, tuple[CanonicalIngredient, MatchType]] = {}
        self._phrases: dict[str, list[_Phrase]] = {}
        self._fuzzy_names: list[str] = []
        self._indexed = False

    # -- index -------------------------------------------------------------

    def _build_index(self) -> None:
        """Index the dataset once; its contents are immutable at runtime."""
        for ingredient in self._repository.list_all():
            self._add_name(ingredient.canonical_name, ingredient, MatchType.EXACT)
            for alias in ingredient.aliases:
                self._add_name(alias, ingredient, MatchType.ALIAS)
        self._indexed = True

    def _add_name(
        self, name: str, ingredient: CanonicalIngredient, match_type: MatchType
    ) -> None:
        normalized = normalize(name)
        if not normalized:
            return

        # First writer wins: canonical names are indexed before aliases, so an
        # alias can never shadow another ingredient's canonical name.
        if normalized not in self._exact:
            self._exact[normalized] = (ingredient, match_type)
            self._fuzzy_names.append(normalized)

        tokens = tokenize(normalized)
        if tokens:
            self._phrases.setdefault(tokens[0], []).append(
                _Phrase(tokens=tokens, ingredient=ingredient)
            )

    # -- matching ----------------------------------------------------------

    def _match_partial(
        self, tokens: tuple[str, ...]
    ) -> tuple[CanonicalIngredient | None, int]:
        """Longest dataset phrase occurring as a run of whole tokens."""
        best: CanonicalIngredient | None = None
        best_length = 0
        total = len(tokens)

        for start, token in enumerate(tokens):
            for phrase in self._phrases.get(token, ()):
                length = len(phrase.tokens)
                if length <= best_length or start + length > total:
                    continue
                if tokens[start : start + length] == phrase.tokens:
                    best = phrase.ingredient
                    best_length = length

        return best, best_length

    def _match(
        self, normalized: str
    ) -> tuple[CanonicalIngredient, MatchType, float] | None:
        direct = self._exact.get(normalized)
        if direct:
            ingredient, match_type = direct
            confidence = (
                _EXACT_CONFIDENCE
                if match_type is MatchType.EXACT
                else _ALIAS_CONFIDENCE
            )
            return ingredient, match_type, confidence

        if len(normalized) >= _MIN_FUZZY_LENGTH:
            close = difflib.get_close_matches(
                normalized, self._fuzzy_names, n=1, cutoff=self._fuzzy_threshold
            )
            if close:
                ingredient, _ = self._exact[close[0]]
                ratio = difflib.SequenceMatcher(None, normalized, close[0]).ratio()
                return ingredient, MatchType.FUZZY, round(ratio, 4)

        tokens = tokenize(normalized)
        ingredient, matched_tokens = self._match_partial(tokens)
        if ingredient and tokens:
            coverage = matched_tokens / len(tokens)
            if coverage >= self._min_partial_coverage:
                return ingredient, MatchType.PARTIAL, round(coverage, 4)

        return None

    # -- IIngredientResolver ----------------------------------------------

    def resolve(self, text: str) -> IngredientResolution:
        if not self._indexed:
            self._build_index()

        resolved: list[ResolvedIngredient] = []
        unresolved: list[UnresolvedIngredient] = []
        seen_ingredients: set[str] = set()
        seen_unresolved: set[str] = set()
        total_items = 0

        for item in parse_ingredient_list(text):
            normalized = normalize(item.raw_text)
            if not normalized:
                continue
            total_items += 1

            match = self._match(normalized)
            if match is None:
                if normalized not in seen_unresolved:
                    seen_unresolved.add(normalized)
                    unresolved.append(
                        UnresolvedIngredient(
                            raw_text=item.raw_text,
                            normalized_text=normalized,
                            parent=item.parent,
                        )
                    )
                continue

            ingredient, match_type, confidence = match
            if ingredient.id in seen_ingredients:
                continue  # a label may declare the same ingredient twice
            seen_ingredients.add(ingredient.id)
            resolved.append(
                ResolvedIngredient(
                    raw_text=item.raw_text,
                    normalized_text=normalized,
                    ingredient=ingredient,
                    match_type=match_type,
                    match_confidence=confidence,
                    parent=item.parent,
                )
            )

        return IngredientResolution(
            resolved=resolved,
            unresolved=unresolved,
            stats=ResolutionStats(
                total_items=total_items,
                resolved_count=len(resolved),
                unresolved_count=len(unresolved),
                coverage=(
                    round(len(resolved) / total_items, 4) if total_items else 0.0
                ),
            ),
        )

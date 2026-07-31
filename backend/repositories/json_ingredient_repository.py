"""JSON-backed IngredientRepository over the offline dataset.

The dataset is generated offline by `build_ingredient_dataset.py`; there is no
runtime dependency on Open Food Facts. Contents are immutable at runtime, so
they are read once and cached for the process lifetime.
"""
from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path

from pydantic import ValidationError

from backend.models.ingredients import CanonicalIngredient
from backend.repositories.base import DatasetUnavailableError, IngredientRepository

# Repository root: backend/repositories/<this file> -> Care/
_DEFAULT_DATASET = Path(__file__).resolve().parents[2] / "common_ingredients_expanded.json"


class JsonIngredientRepository(IngredientRepository):
    def __init__(self, dataset_path: Path | str | None = None) -> None:
        self._path = Path(dataset_path) if dataset_path else _DEFAULT_DATASET
        self._cache: list[CanonicalIngredient] | None = None

    def list_all(self) -> Sequence[CanonicalIngredient]:
        if self._cache is None:
            self._cache = self._load()
        return self._cache

    def _load(self) -> list[CanonicalIngredient]:
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise DatasetUnavailableError(
                f"Ingredient dataset not found at {self._path}."
            ) from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise DatasetUnavailableError(
                f"Ingredient dataset at {self._path} could not be read."
            ) from exc

        if not isinstance(raw, list):
            raise DatasetUnavailableError(
                "Ingredient dataset must be a list of ingredient records."
            )

        try:
            return [CanonicalIngredient.model_validate(record) for record in raw]
        except ValidationError as exc:
            raise DatasetUnavailableError(
                "Ingredient dataset contains malformed records."
            ) from exc

"""JSON-backed AdditiveRepository over the offline food-additives dataset."""
from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path

from pydantic import ValidationError

from backend.models.additives import FoodAdditive
from backend.repositories.base import AdditiveRepository, DatasetUnavailableError

_DEFAULT_DATASET = Path(__file__).resolve().parents[1] / "data" / "food_additives.json"


class JsonAdditiveRepository(AdditiveRepository):
    def __init__(self, dataset_path: Path | str | None = None) -> None:
        self._path = Path(dataset_path) if dataset_path else _DEFAULT_DATASET
        self._cache: list[FoodAdditive] | None = None

    def list_all(self) -> Sequence[FoodAdditive]:
        if self._cache is None:
            self._cache = self._load()
        return self._cache

    def _load(self) -> list[FoodAdditive]:
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise DatasetUnavailableError(
                f"Additive dataset not found at {self._path}."
            ) from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise DatasetUnavailableError(
                f"Additive dataset at {self._path} could not be read."
            ) from exc

        if not isinstance(raw, list):
            raise DatasetUnavailableError(
                "Additive dataset must be a list of additive records."
            )

        try:
            return [FoodAdditive.model_validate(record) for record in raw]
        except ValidationError as exc:
            raise DatasetUnavailableError(
                "Additive dataset contains malformed records."
            ) from exc

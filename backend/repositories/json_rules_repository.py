"""JSON-backed RulesRepository over the offline health-rules dataset."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.repositories.base import DatasetUnavailableError, RulesRepository

_DEFAULT_DATASET = Path(__file__).resolve().parents[1] / "data" / "health_rules.json"


class JsonRulesRepository(RulesRepository):
    def __init__(self, dataset_path: Path | str | None = None) -> None:
        self._path = Path(dataset_path) if dataset_path else _DEFAULT_DATASET
        self._cache: dict[str, Any] | None = None

    def get_rules(self) -> dict[str, Any]:
        if self._cache is None:
            self._cache = self._load()
        return self._cache

    def _load(self) -> dict[str, Any]:
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise DatasetUnavailableError(
                f"Health rules dataset not found at {self._path}."
            ) from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise DatasetUnavailableError(
                f"Health rules dataset at {self._path} could not be read."
            ) from exc

        if not isinstance(raw, dict):
            raise DatasetUnavailableError(
                "Health rules dataset must be a JSON object."
            )

        return raw

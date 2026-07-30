"""Repository interfaces. Business logic depends on these, never on storage.

Swapping JSON for PostgreSQL means adding an implementation here; no service
changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from backend.models.ingredients import CanonicalIngredient


class RepositoryError(Exception):
    """Base class for data-access failures."""


class DatasetUnavailableError(RepositoryError):
    """The backing dataset is missing or unreadable."""


class IngredientRepository(ABC):
    """Read access to the canonical ingredient dataset."""

    @abstractmethod
    def list_all(self) -> Sequence[CanonicalIngredient]:
        """Return every canonical ingredient.

        Raises:
            DatasetUnavailableError: the dataset could not be loaded.
        """

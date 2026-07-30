"""OCR provider interface. The API layer depends on this, never on an implementation."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import ClassVar

from backend.models.ocr import OCRResult


class IOCRService(ABC):
    """Image bytes -> structured text. Implementations must not interpret content."""

    #: Stable identifier reported as `metadata.provider`.
    provider_name: ClassVar[str]

    @abstractmethod
    async def extract_text(self, image: bytes, content_type: str | None = None) -> OCRResult:
        """Recognise text in `image`.

        Args:
            image: raw image bytes.
            content_type: declared MIME type, used only as a validation hint;
                the real format is determined from the bytes themselves.

        Raises:
            OCRError: any recoverable failure (see `exceptions`).
        """

"""Google Cloud Vision implementation of IOCRService, over the REST API.

DOCUMENT_TEXT_DETECTION is used rather than TEXT_DETECTION: ingredient labels are
dense blocks of small print, which the document model segments far better.

Transport is plain HTTP (`images:annotate`) rather than the Cloud Vision SDK.
Auth is an API key (`GOOGLE_VISION_API_KEY`) — the only method this project
supports — sent in the `X-Goog-Api-Key` header rather than a `?key=` query
parameter, which Google warns exposes the key to URL scans and which would
otherwise be written to logs by any client that records request URLs.
Nothing provider-specific escapes this module.

REST/JSON differs from the protobuf SDK in two ways this module absorbs:
  * enums arrive as names ("LINE_BREAK"), not ordinals;
  * proto3 JSON omits fields holding default values, so `confidence: 0.0` and
    zero-valued vertex coordinates are simply absent. Defaults below restore
    the exact values the SDK reported.
"""
from __future__ import annotations

import asyncio
import base64
import logging

import httpx

from backend.models.ocr import BoundingBox, OCRBlock, OCRMetadata, OCRResult
from backend.services.ocr.base import IOCRService
from backend.services.ocr.exceptions import (
    EmptyOCRResultError,
    InvalidImageError,
    OCRConfigurationError,
    OCRProviderError,
    OCRTimeoutError,
)
from backend.services.ocr.image_validation import validate_image

logger = logging.getLogger(__name__)

_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate"

# Text appended after a symbol for each Vision break type. Keyed by enum name
# (what REST returns); ordinals are kept as a defensive fallback, since an
# unmapped break would silently concatenate words with no separator.
_BREAK_SUFFIX: dict[object, str] = {
    "SPACE": " ",
    "SURE_SPACE": " ",
    "EOL_SURE_SPACE": "\n",
    "LINE_BREAK": "\n",
    "HYPHEN": "",  # word continues on the next line; drop the hyphen
    1: " ",  # SPACE
    2: " ",  # SURE_SPACE
    3: "\n",  # EOL_SURE_SPACE
    4: "",  # HYPHEN
    5: "\n",  # LINE_BREAK
}


class GoogleVisionOCRService(IOCRService):
    provider_name = "google_vision"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        timeout_seconds: float = 30.0,
        max_image_bytes: int = 10 * 1024 * 1024,
        language_hints: list[str] | None = None,
    ) -> None:
        self._api_key = api_key
        self._timeout = timeout_seconds
        self._max_image_bytes = max_image_bytes
        self._language_hints = language_hints or []
        self._client: httpx.AsyncClient | None = None
        self._client_lock = asyncio.Lock()

    # -- transport ---------------------------------------------------------

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            async with self._client_lock:
                if self._client is None:
                    self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client

    # -- IOCRService -------------------------------------------------------

    async def extract_text(
        self, image: bytes, content_type: str | None = None
    ) -> OCRResult:
        validate_image(image, content_type, self._max_image_bytes)
        if not self._api_key:
            raise OCRConfigurationError(
                "GOOGLE_VISION_API_KEY is not set on the server."
            )

        request: dict = {
            "image": {"content": base64.b64encode(image).decode("ascii")},
            "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
        }
        if self._language_hints:
            request["imageContext"] = {"languageHints": self._language_hints}

        client = await self._get_client()
        try:
            response = await client.post(
                _ENDPOINT,
                json={"requests": [request]},
                headers={"X-Goog-Api-Key": self._api_key},
                timeout=self._timeout,
            )
        except httpx.TimeoutException as exc:
            raise OCRTimeoutError() from exc
        except httpx.RequestError as exc:
            logger.exception("Google Cloud Vision request failed")
            raise OCRProviderError() from exc

        if response.is_error:
            self._raise_for_status(response)

        return self._to_result(self._annotation(response))

    # -- response handling -------------------------------------------------

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        """Map a Vision HTTP error onto the OCR failure taxonomy."""
        try:
            detail = (response.json() or {}).get("error") or {}
        except ValueError:
            detail = {}
        message = detail.get("message", "")

        if response.status_code in (401, 403):
            raise OCRConfigurationError(
                "Google Cloud Vision rejected the API key."
            )
        if response.status_code == 400:
            # Vision reports an undecodable image as INVALID_ARGUMENT.
            raise InvalidImageError(
                "Google Cloud Vision could not decode the image."
            )
        if response.status_code in (408, 504):
            raise OCRTimeoutError()
        logger.error(
            "Google Cloud Vision returned %s: %s", response.status_code, message
        )
        raise OCRProviderError()

    @staticmethod
    def _annotation(response: httpx.Response) -> dict:
        """Unwrap the single per-image annotation from the batch envelope."""
        try:
            body = response.json()
        except ValueError as exc:
            raise OCRProviderError(
                "Google Cloud Vision returned a malformed response."
            ) from exc

        responses = body.get("responses") or []
        if not responses:
            raise OCRProviderError("Google Cloud Vision returned no annotation.")

        first = responses[0] or {}
        error = first.get("error") or {}
        if error.get("message"):
            # Per-image error inside a successful batch call.
            logger.error("Vision per-image error: %s", error["message"])
            raise OCRProviderError(error["message"])

        # Absent when no text was found; `_to_result` raises EmptyOCRResultError.
        return first.get("fullTextAnnotation") or {}

    # -- mapping -----------------------------------------------------------

    @staticmethod
    def _block_text(block: dict) -> str:
        parts: list[str] = []
        for paragraph in block.get("paragraphs", []):
            for word in paragraph.get("words", []):
                for symbol in word.get("symbols", []):
                    parts.append(symbol.get("text", ""))
                    break_type = (
                        symbol.get("property", {}).get("detectedBreak", {}).get("type")
                    )
                    parts.append(_BREAK_SUFFIX.get(break_type, ""))
        return "".join(parts).strip()

    @staticmethod
    def _bounding_box(block: dict) -> BoundingBox | None:
        vertices = block.get("boundingBox", {}).get("vertices") or []
        if not vertices:
            return None
        # Zero coordinates are omitted by proto3 JSON, hence the defaults.
        xs = [v.get("x", 0) for v in vertices]
        ys = [v.get("y", 0) for v in vertices]
        return BoundingBox(
            x=min(xs), y=min(ys), width=max(xs) - min(xs), height=max(ys) - min(ys)
        )

    @classmethod
    def _to_result(cls, annotation: dict) -> OCRResult:
        text = (annotation.get("text") or "").strip()
        if not text:
            raise EmptyOCRResultError()

        blocks: list[OCRBlock] = []
        for page in annotation.get("pages", []):
            for block in page.get("blocks", []):
                block_text = cls._block_text(block)
                if not block_text:
                    continue
                blocks.append(
                    OCRBlock(
                        text=block_text,
                        # Omitted by proto3 JSON when 0.0, which is what the
                        # SDK reported for a block carrying no confidence.
                        confidence=block.get("confidence", 0.0),
                        bounding_box=cls._bounding_box(block),
                    )
                )

        return OCRResult(
            text=text,
            blocks=blocks,
            metadata=OCRMetadata(
                provider=cls.provider_name,
                confidence=cls._aggregate_confidence(blocks),
            ),
        )

    @staticmethod
    def _aggregate_confidence(blocks: list[OCRBlock]) -> float | None:
        """Document-level confidence.

        Limitation: Cloud Vision reports no single confidence for a document —
        only per page, block, word and symbol. We report the character-count
        weighted mean of block confidences, which approximates how much of the
        returned text is reliable. Longer blocks therefore dominate the score.
        """
        weighted = 0.0
        total_chars = 0
        for block in blocks:
            if block.confidence is None:
                continue
            chars = len(block.text)
            weighted += block.confidence * chars
            total_chars += chars
        if total_chars == 0:
            return None
        return round(weighted / total_chars, 4)

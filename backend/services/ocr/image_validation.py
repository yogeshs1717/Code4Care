"""Server-side image validation.

Format is decided by magic bytes, not by the client-declared MIME type, so a
mislabelled upload is rejected before it reaches the paid OCR provider.
"""
from __future__ import annotations

from backend.services.ocr.exceptions import (
    ImageTooLargeError,
    InvalidImageError,
    UnsupportedImageFormatError,
)

# Formats accepted by Google Cloud Vision that are realistic for label photos.
SUPPORTED_MIME_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/bmp"}
)

_MIN_HEADER_BYTES = 12


def _sniff_mime_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith(b"BM"):
        return "image/bmp"
    # HEIC/HEIF: default iOS camera format, not supported by Cloud Vision.
    if data[4:8] == b"ftyp" and data[8:12] in {b"heic", b"heix", b"hevc", b"mif1"}:
        return "image/heic"
    return None


def validate_image(data: bytes, content_type: str | None, max_bytes: int) -> str:
    """Validate size and format. Returns the sniffed MIME type.

    `content_type` is advisory only; the sniffed type wins.
    """
    if not data:
        raise InvalidImageError("The uploaded file is empty.")
    if len(data) > max_bytes:
        raise ImageTooLargeError(
            f"Image is {len(data) // 1024} KB; the maximum is {max_bytes // 1024} KB."
        )
    if len(data) < _MIN_HEADER_BYTES:
        raise InvalidImageError("The uploaded file is too small to be an image.")

    sniffed = _sniff_mime_type(data)
    if sniffed is None:
        raise InvalidImageError(
            "The uploaded file could not be recognised as an image."
        )
    if sniffed == "image/heic":
        raise UnsupportedImageFormatError(
            "HEIC images are not supported. Please upload a JPEG, PNG, WEBP or BMP image."
        )
    if sniffed not in SUPPORTED_MIME_TYPES:
        raise UnsupportedImageFormatError(
            f"{sniffed} is not supported. Supported formats: "
            f"{', '.join(sorted(SUPPORTED_MIME_TYPES))}."
        )
    return sniffed

"""OCR failure taxonomy.

Every failure the OCR stage can produce is one of these, carrying its own stable
error code and HTTP status so the API layer needs no provider-specific knowledge.
"""
from __future__ import annotations


class OCRError(Exception):
    """Base class for all recoverable OCR failures."""

    code = "OCR_ERROR"
    http_status = 502
    default_message = "OCR failed."

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.default_message)
        self.message = message or self.default_message


class InvalidImageError(OCRError):
    code = "INVALID_IMAGE"
    http_status = 400
    default_message = "The uploaded file is missing or is not a readable image."


class UnsupportedImageFormatError(OCRError):
    code = "UNSUPPORTED_IMAGE_FORMAT"
    http_status = 415
    default_message = "Unsupported image format."


class ImageTooLargeError(OCRError):
    code = "IMAGE_TOO_LARGE"
    http_status = 413
    default_message = "The image exceeds the maximum allowed size."


class EmptyOCRResultError(OCRError):
    code = "EMPTY_OCR_RESULT"
    http_status = 422
    default_message = "No text was found in the image. Retake or re-crop the label."


class OCRTimeoutError(OCRError):
    code = "OCR_TIMEOUT"
    http_status = 504
    default_message = "The OCR provider did not respond in time."


class OCRProviderError(OCRError):
    code = "OCR_PROVIDER_ERROR"
    http_status = 502
    default_message = "The OCR provider returned an error."


class OCRConfigurationError(OCRError):
    code = "OCR_NOT_CONFIGURED"
    http_status = 503
    default_message = "OCR is not configured correctly on the server."

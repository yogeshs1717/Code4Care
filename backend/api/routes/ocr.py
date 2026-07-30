"""OCR endpoint. Thin controller: validate transport, delegate, return contract."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from backend.api.dependencies import get_ocr_service
from backend.config import get_settings
from backend.models.errors import ErrorResponse
from backend.models.ocr import OCRResult
from backend.services.ocr.base import IOCRService
from backend.services.ocr.exceptions import ImageTooLargeError, InvalidImageError

router = APIRouter(tags=["ocr"])

_CHUNK_SIZE = 64 * 1024


async def _read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    """Read the upload, aborting as soon as it exceeds `max_bytes`."""
    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(_CHUNK_SIZE):
        total += len(chunk)
        if total > max_bytes:
            raise ImageTooLargeError(
                f"Image exceeds the maximum size of {max_bytes // 1024} KB."
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post(
    "/ocr",
    response_model=OCRResult,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
        504: {"model": ErrorResponse},
    },
    summary="Extract text from an ingredient-label image",
)
async def run_ocr(
    image: UploadFile = File(...),
    ocr_service: IOCRService = Depends(get_ocr_service),
) -> OCRResult:
    if image.filename is None and image.content_type is None:
        raise InvalidImageError("No image file was provided.")

    settings = get_settings()
    data = await _read_limited(image, settings.max_image_bytes)
    return await ocr_service.extract_text(data, image.content_type)

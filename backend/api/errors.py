"""Maps domain errors to the uniform API error envelope."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.models.errors import ErrorDetail, ErrorResponse
from backend.services.auth.errors import AuthError
from backend.services.llm.exceptions import LLMError
from backend.services.ocr.exceptions import OCRError

logger = logging.getLogger(__name__)


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=payload.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OCRError)
    async def _handle_ocr_error(_: Request, exc: OCRError) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.http_status)

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            "INVALID_REQUEST", "The request payload is invalid.", 422
        )

    @app.exception_handler(LLMError)
    async def _handle_llm_error(_: Request, exc: LLMError) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.http_status)

    @app.exception_handler(AuthError)
    async def _handle_auth_error(_: Request, exc: AuthError) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.http_status)

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server error [%s]: %s", type(exc).__name__, exc)
        return error_response("INTERNAL_ERROR", "An unexpected error occurred.", 500)

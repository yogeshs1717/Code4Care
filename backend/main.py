"""FastAPI application entrypoint.

Run locally:  uvicorn backend.main:app --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.errors import register_exception_handlers
from backend.api.routes import analyze, gemma, ocr
from backend.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Care API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(ocr.router)
    app.include_router(analyze.router)
    app.include_router(gemma.router)
    return app


app = create_app()

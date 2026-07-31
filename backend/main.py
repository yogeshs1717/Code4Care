"""FastAPI application entrypoint.

Run locally:  uvicorn backend.main:app --reload
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.errors import register_exception_handlers
from backend.api.routes import analyze, auth, gemma, history, ocr, profile
from backend.config import get_settings
from backend.db.base import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Care API", version="0.2.0", lifespan=lifespan)

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
    app.include_router(auth.router)
    app.include_router(profile.router)
    app.include_router(history.router)
    return app


app = create_app()

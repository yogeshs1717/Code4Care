"""FastAPI application entrypoint.

Run locally:  uvicorn backend.main:app --host 0.0.0.0 --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.errors import register_exception_handlers
from backend.api.routes import analyze, gemma, ocr


def create_app() -> FastAPI:
    app = FastAPI(title="Care API", version="0.2.0")

    # Permissive CORS to allow seamless local network connections across devices
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(ocr.router)
    app.include_router(analyze.router)
    app.include_router(gemma.router)

    @app.get("/health", tags=["system"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

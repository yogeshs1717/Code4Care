"""Gemma endpoints for AI-powered explanation and chat.

Gemma receives only the structured report context from the deterministic
health engine. It explains facts — it never decides, scores, or classifies.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.api.dependencies import get_health_engine, get_llm_service, get_resolver
from backend.models.health import HealthReport
from backend.services.health_engine.base import IHealthEngine
from backend.services.llm.base import ILLMService
from backend.services.resolver.base import IIngredientResolver

router = APIRouter(tags=["gemma"])


# ── Request / Response models ───────────────────────────────────────────────


class ExplainRequest(BaseModel):
    """Request body for the explain endpoint."""

    ingredient_text: str = Field(
        ..., min_length=1, description="The ingredient text that was analyzed."
    )


class ExplainResponse(BaseModel):
    summary: str


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for the chat endpoint."""

    ingredient_text: str = Field(
        ..., min_length=1, description="The ingredient text that was analyzed."
    )
    messages: list[ChatMessage] = Field(default_factory=list)
    new_message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    reply: str


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.post(
    "/api/v1/gemma/explain",
    response_model=ExplainResponse,
    summary="Get an AI summary of the health report",
)
@router.post(
    "/gemma/explain",
    response_model=ExplainResponse,
    include_in_schema=False,
)
async def explain_report(
    request: ExplainRequest,
    resolver: IIngredientResolver = Depends(get_resolver),
    engine: IHealthEngine = Depends(get_health_engine),
    llm: ILLMService = Depends(get_llm_service),
) -> ExplainResponse:
    """Run the pipeline and then ask the LLM to explain the report."""
    resolution = resolver.resolve(request.ingredient_text)
    report = engine.analyze(resolution)
    summary = await llm.explain(report)
    return ExplainResponse(summary=summary)


@router.post(
    "/api/v1/gemma/chat",
    response_model=ChatResponse,
    summary="Chat with Gemma about the product",
)
@router.post(
    "/gemma/chat",
    response_model=ChatResponse,
    include_in_schema=False,
)
async def chat_with_gemma(
    request: ChatRequest,
    resolver: IIngredientResolver = Depends(get_resolver),
    engine: IHealthEngine = Depends(get_health_engine),
    llm: ILLMService = Depends(get_llm_service),
) -> ChatResponse:
    """Answer a user question about the product based on the structured report."""
    resolution = resolver.resolve(request.ingredient_text)
    report = engine.analyze(resolution)
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    reply = await llm.chat(report, messages, request.new_message)
    return ChatResponse(reply=reply)

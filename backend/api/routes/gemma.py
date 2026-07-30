"""Gemma-powered explanation and chat endpoints.

Routes in this module are the ONLY place the LLM is called. The deterministic
pipeline (health engine) never touches this module.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.api.dependencies import get_llm_service
from backend.models.errors import ErrorResponse
from backend.services.llm.base import ILLMService
from backend.services.llm.exceptions import LLMConfigurationError
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/gemma", tags=["gemma"])


class ExplainRequest(BaseModel):
    report_json: str


class ExplainResponse(BaseModel):
    summary: str


class GemmaMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    report_json: str
    messages: list[GemmaMessage] = []
    new_message: str


class ChatResponse(BaseModel):
    reply: str


@router.post(
    "/explain",
    response_model=ExplainResponse,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    summary="Ask Gemma to explain a health report in plain language",
)
async def explain_report(
    body: ExplainRequest,
    llm_service: ILLMService = Depends(get_llm_service),
) -> ExplainResponse:
    """Generate a consumer-friendly summary of a deterministic report.

    Gemma receives the structured report JSON and returns a plain-language
    explanation. It never modifies or determines the facts.
    """
    if llm_service is None:
        raise LLMConfigurationError("Gemma is not configured on this server.")

    summary = await llm_service.generate_summary(body.report_json)
    return ExplainResponse(summary=summary)


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    summary="Multi-turn chat with Gemma about a health report",
)
async def chat_with_gemma(
    body: ChatRequest,
    llm_service: ILLMService = Depends(get_llm_service),
) -> ChatResponse:
    """Continue a multi-turn conversation about a given health report.

    The full structured report is sent alongside message history so Gemma
    stays grounded in the deterministic facts.
    """
    if llm_service is None:
        raise LLMConfigurationError("Gemma is not configured on this server.")

    messages_dict = [m.model_dump() for m in body.messages]

    reply = await llm_service.chat(
        report_context=body.report_json,
        messages=messages_dict,
        new_message=body.new_message,
    )
    return ChatResponse(reply=reply)

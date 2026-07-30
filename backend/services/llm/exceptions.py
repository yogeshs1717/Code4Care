"""LLM failure taxonomy -- one base + every distinct failure mode."""
from __future__ import annotations


class LLMError(Exception):
    """Base class for all Gemma-related failures."""

    code = "LLM_ERROR"
    http_status = 502
    default_message = "The AI explanation service failed."

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.default_message)
        self.message = message or self.default_message


class LLMTimeoutError(LLMError):
    code = "LLM_TIMEOUT"
    http_status = 504
    default_message = "The AI service did not respond in time."


class LLMProviderError(LLMError):
    code = "LLM_PROVIDER_ERROR"
    http_status = 502
    default_message = "The AI provider returned an error."


class LLMConfigurationError(LLMError):
    code = "LLM_NOT_CONFIGURED"
    http_status = 503
    default_message = "The AI service is not configured correctly on the server."

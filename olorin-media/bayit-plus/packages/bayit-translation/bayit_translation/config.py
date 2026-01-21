"""
Configuration protocol for Bayit translation services.
Defines interface for translation configuration to enable dependency injection.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class TranslationConfig(Protocol):
    """Protocol for translation service configuration."""

    @property
    def anthropic_api_key(self) -> str:
        """Anthropic API key for Claude-based translation."""
        ...

    @property
    def openai_api_key(self) -> str:
        """OpenAI API key for GPT-based translation."""
        ...

    @property
    def claude_model(self) -> str:
        """Claude model to use for translation."""
        ...

    @property
    def claude_max_tokens_short(self) -> int:
        """Maximum tokens for short translations."""
        ...

    @property
    def claude_max_tokens_long(self) -> int:
        """Maximum tokens for long translations."""
        ...


class SimpleTranslationConfig:
    """Simple implementation of TranslationConfig for testing or direct usage."""

    def __init__(
        self,
        anthropic_api_key: str = "",
        openai_api_key: str = "",
        claude_model: str = "claude-sonnet-4-5-20250929",
        claude_max_tokens_short: int = 300,
        claude_max_tokens_long: int = 1000,
    ):
        """Initialize translation configuration."""
        self._anthropic_api_key = anthropic_api_key
        self._openai_api_key = openai_api_key
        self._claude_model = claude_model
        self._claude_max_tokens_short = claude_max_tokens_short
        self._claude_max_tokens_long = claude_max_tokens_long

    @property
    def anthropic_api_key(self) -> str:
        return self._anthropic_api_key

    @property
    def openai_api_key(self) -> str:
        return self._openai_api_key

    @property
    def claude_model(self) -> str:
        return self._claude_model

    @property
    def claude_max_tokens_short(self) -> int:
        return self._claude_max_tokens_short

    @property
    def claude_max_tokens_long(self) -> int:
        return self._claude_max_tokens_long

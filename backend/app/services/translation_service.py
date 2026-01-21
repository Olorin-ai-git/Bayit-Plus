"""
BACKWARD-COMPATIBLE WRAPPER: Import from bayit_translation instead
This file wraps the extracted bayit-translation package for backward compatibility.
"""

import warnings

from bayit_translation import TranslationService as _ExtractedService

from app.core.config import settings


class _SettingsTranslationConfigAdapter:
    """Adapter to make Settings compatible with TranslationConfig protocol."""

    @property
    def anthropic_api_key(self) -> str:
        return settings.ANTHROPIC_API_KEY

    @property
    def openai_api_key(self) -> str:
        return settings.OPENAI_API_KEY

    @property
    def claude_model(self) -> str:
        return settings.CLAUDE_MODEL

    @property
    def claude_max_tokens_short(self) -> int:
        return settings.CLAUDE_MAX_TOKENS_SHORT

    @property
    def claude_max_tokens_long(self) -> int:
        return settings.CLAUDE_MAX_TOKENS_LONG


class TranslationService(_ExtractedService):
    """
    Backward-compatible wrapper for TranslationService.

    DEPRECATED: Import directly from bayit_translation.TranslationService instead.
    This wrapper will be removed in a future version.
    """

    def __init__(self):
        """Initialize with settings adapter for backward compatibility."""
        warnings.warn(
            "Importing TranslationService from app.services is deprecated. "
            "Use 'from bayit_translation import TranslationService' instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(config=_SettingsTranslationConfigAdapter())

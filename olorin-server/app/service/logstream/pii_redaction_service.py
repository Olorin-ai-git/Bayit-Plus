"""
PII Redaction Service
Feature: 021-live-merged-logstream

Service for sanitizing log messages by redacting personally identifiable information.
Uses configuration-driven regex patterns with performance optimization.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

from typing import Dict, Optional, Pattern
from app.service.logging import get_bridge_logger
from .pii_redaction_patterns import (
    PIIRedactionConfig,
    get_redaction_patterns
)

logger = get_bridge_logger(__name__)


class PIIRedactionService:
    """
    Service for redacting PII from log messages.

    Applies configured regex patterns to sanitize sensitive data.
    Maintains performance through compiled regex caching.
    """

    def __init__(self, config: Optional[PIIRedactionConfig] = None):
        """
        Initialize PII redaction service.

        Args:
            config: PII redaction configuration (loads from env if not provided)
        """
        self.config = config or PIIRedactionConfig()
        self.patterns: Dict[str, tuple[Pattern, str]] = get_redaction_patterns(self.config)

        enabled_patterns = list(self.patterns.keys())
        logger.info(
            f"PII redaction service initialized with {len(enabled_patterns)} patterns: {enabled_patterns}"
        )

    def redact_message(self, message: str) -> str:
        """
        Redact PII from log message.

        Applies all enabled redaction patterns sequentially.
        Returns original message if redaction is disabled or message is empty.

        Args:
            message: Original log message

        Returns:
            Sanitized message with PII replaced by redaction tokens
        """
        if not message or not self.patterns:
            return message

        redacted = message

        for pattern_name, (pattern, replacement) in self.patterns.items():
            try:
                redacted = pattern.sub(replacement, redacted)
            except Exception as e:
                logger.warning(
                    f"Failed to apply {pattern_name} redaction pattern: {e}",
                    extra={"pattern": pattern_name, "error": str(e)}
                )
                continue

        return redacted

    def redact_context(self, context: Dict) -> Dict:
        """
        Redact PII from log context dictionary.

        Recursively processes nested dictionaries and lists.
        Redacts string values while preserving structure.

        Args:
            context: Log context dictionary

        Returns:
            Sanitized context with PII redacted
        """
        if not context:
            return context

        redacted_context = {}

        for key, value in context.items():
            if isinstance(value, str):
                redacted_context[key] = self.redact_message(value)
            elif isinstance(value, dict):
                redacted_context[key] = self.redact_context(value)
            elif isinstance(value, list):
                redacted_context[key] = [
                    self.redact_message(item) if isinstance(item, str)
                    else self.redact_context(item) if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                redacted_context[key] = value

        return redacted_context

    def is_enabled(self) -> bool:
        """
        Check if any redaction patterns are enabled.

        Returns:
            True if at least one pattern is active, False otherwise
        """
        return len(self.patterns) > 0

    def get_enabled_patterns(self) -> list[str]:
        """
        Get list of enabled pattern names.

        Returns:
            List of active pattern names
        """
        return list(self.patterns.keys())


_redaction_service_instance: Optional[PIIRedactionService] = None


def get_pii_redaction_service() -> PIIRedactionService:
    """
    Get or create singleton PII redaction service instance.

    Returns:
        Configured PII redaction service
    """
    global _redaction_service_instance
    if _redaction_service_instance is None:
        _redaction_service_instance = PIIRedactionService()
    return _redaction_service_instance


def reset_pii_redaction_service() -> None:
    """Reset PII redaction service instance (for testing)."""
    global _redaction_service_instance
    _redaction_service_instance = None

"""
Trivia Text Sanitizer - XSS and Injection Prevention
Sanitizes trivia text before translation to prevent security vulnerabilities
"""

import html
import logging
import re

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class TriviaTextSanitizer:
    """Sanitize trivia text before translation to prevent injection attacks."""

    # Dangerous patterns (security check)
    # These patterns match complete dangerous constructs, not just opening tags
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Match entire script tags with content
        r'<script[^>]*>',               # Also match unclosed script tags
        r'javascript:[^\s<>]*',         # Match javascript: URLs with content
        r'data:text/html[^\s<>]*',      # Match data:text/html URLs
        r'<iframe[^>]*>.*?</iframe>',   # Match entire iframe tags with content
        r'<iframe[^>]*>',               # Also match unclosed iframe tags
        r'onerror\s*=\s*["\'][^"\']*["\']',  # Match onerror= with value
        r'onload\s*=\s*["\'][^"\']*["\']',   # Match onload= with value
        r'\{%[^}]*%\}',                 # Template injection (Jinja2)
        r'\{\{[^}]*\}\}',               # Template injection (Handlebars)
        r'exec\s*\([^)]*\)',            # Match exec() with content
        r'eval\s*\([^)]*\)',            # Match eval() with content
    ]

    @staticmethod
    def sanitize(text: str) -> str:
        """
        Sanitize text for safe translation.

        Args:
            text: Input text to sanitize

        Returns:
            Sanitized text safe for translation

        Security measures:
            - Dangerous pattern removal (BEFORE encoding)
            - HTML encoding
            - Length limiting (DoS prevention)
            - Whitespace normalization
        """
        if not text:
            return ""

        sanitized = text

        # Remove dangerous patterns FIRST (before HTML encoding)
        for pattern in TriviaTextSanitizer.DANGEROUS_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(
                    "Dangerous pattern detected in trivia text",
                    extra={
                        "pattern": pattern,
                        "text_preview": sanitized[:50] + "..."
                    }
                )
                # Remove pattern completely
                sanitized = re.sub(pattern, '[removed]', sanitized, flags=re.IGNORECASE)

        # HTML encode after pattern removal
        sanitized = html.escape(sanitized)

        # Limit length (DoS prevention)
        if len(sanitized) > 1000:
            logger.warning(
                f"Trivia text too long ({len(sanitized)} chars), truncating",
                extra={"original_length": len(sanitized)}
            )
            sanitized = sanitized[:1000]

        # Remove excessive whitespace
        sanitized = ' '.join(sanitized.split())

        return sanitized

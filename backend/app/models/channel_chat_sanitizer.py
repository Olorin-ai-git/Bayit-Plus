"""Channel chat message sanitization utilities.

Multi-layer input sanitization for XSS prevention in chat messages.
"""

import html
import re

# Dangerous patterns for XSS prevention
_DANGEROUS_PATTERNS = [
    r"<script",
    r"javascript:",
    r"onerror\s*=",
    r"eval\s*\(",
    r"expression\s*\(",
    r"import\s*\(",
    r"data:text/html",
    r"vbscript:",
    r"<iframe",
    r"on\w+\s*=",
]


def _sanitize_message_text(text: str) -> str:
    """Multi-layer input sanitization (Security Expert).

    Layer 1: Length enforcement (done by Pydantic max_length)
    Layer 2: Strip HTML tags completely (no HTML in chat)
    Layer 3: Dangerous pattern blocking
    Layer 4: html.escape as final fallback
    """
    # Strip leading/trailing whitespace
    cleaned = text.strip()

    # Layer 2: Remove all HTML tags
    cleaned = re.sub(r"<[^>]+>", "", cleaned)

    # Layer 3: Check for dangerous patterns
    for pattern in _DANGEROUS_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            # Layer 4: Escape if dangerous pattern detected
            cleaned = html.escape(cleaned)
            break

    return cleaned

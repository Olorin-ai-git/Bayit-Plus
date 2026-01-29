"""
PII Detection and Masking (P1-5)

Lightweight regex-based PII detection for dubbing transcripts.
Applied before MongoDB storage, not in the real-time pipeline path.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Pattern

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PIIDetectionResult:
    """Result of PII scan on a text."""

    has_pii: bool
    masked_text: str
    detected_types: List[str] = field(default_factory=list)
    detection_count: int = 0


# Compiled regex patterns for common PII types
_PII_PATTERNS: Dict[str, Pattern] = {
    "credit_card": re.compile(
        r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"
    ),
    "email": re.compile(
        r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
    ),
    "phone_intl": re.compile(
        r"\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}"
    ),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "israeli_id": re.compile(r"\b\d{9}\b"),
}

# Mask replacement per type
_MASK_REPLACEMENTS: Dict[str, str] = {
    "credit_card": "[CARD_REDACTED]",
    "email": "[EMAIL_REDACTED]",
    "phone_intl": "[PHONE_REDACTED]",
    "ssn": "[SSN_REDACTED]",
    "israeli_id": "[ID_REDACTED]",
}


def detect_and_mask(text: str) -> PIIDetectionResult:
    """
    Detect PII patterns and return masked version of the text.

    Args:
        text: Input text to scan for PII

    Returns:
        PIIDetectionResult with masked text and detection metadata
    """
    if not settings.olorin.dubbing.pii_detection_enabled:
        return PIIDetectionResult(
            has_pii=False,
            masked_text=text,
        )

    if not text or not text.strip():
        return PIIDetectionResult(has_pii=False, masked_text=text)

    detected_types: List[str] = []
    total_count = 0
    masked = text

    for pii_type, pattern in _PII_PATTERNS.items():
        matches = pattern.findall(masked)
        if matches:
            detected_types.append(pii_type)
            total_count += len(matches)
            replacement = _MASK_REPLACEMENTS.get(
                pii_type, "[REDACTED]"
            )
            masked = pattern.sub(replacement, masked)

    has_pii = total_count > 0

    if has_pii:
        logger.info(
            f"PII detected: {total_count} instances of "
            f"{', '.join(detected_types)}"
        )

    return PIIDetectionResult(
        has_pii=has_pii,
        masked_text=masked,
        detected_types=detected_types,
        detection_count=total_count,
    )

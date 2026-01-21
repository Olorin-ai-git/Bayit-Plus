"""
Chat Utilities Module
Helper functions for voice chat processing including escalation detection and TTS formatting.
"""

import re
from typing import Optional, Tuple

from app.services.support.constants import (BILLING_KEYWORDS,
                                            ESCALATION_KEYWORDS,
                                            ESCALATION_REASON_BILLING,
                                            ESCALATION_REASON_LOW_CONFIDENCE,
                                            ESCALATION_REASON_NO_DOCS,
                                            ESCALATION_REASON_SECURITY,
                                            SECURITY_KEYWORDS,
                                            UNCERTAIN_PHRASES)


def check_escalation(
    query: str,
    response: str,
    context: dict,
) -> Tuple[bool, Optional[str]]:
    """Check if the conversation should be escalated to a ticket."""
    query_lower = query.lower()

    if any(kw in query_lower for kw in BILLING_KEYWORDS):
        return True, ESCALATION_REASON_BILLING

    if any(kw in query_lower for kw in SECURITY_KEYWORDS):
        return True, ESCALATION_REASON_SECURITY

    if not context.get("docs") and not context.get("faq"):
        if any(kw in query_lower for kw in ESCALATION_KEYWORDS):
            return True, ESCALATION_REASON_NO_DOCS

    response_lower = response.lower()
    if any(phrase in response_lower for phrase in UNCERTAIN_PHRASES):
        return True, ESCALATION_REASON_LOW_CONFIDENCE

    return False, None


def clean_for_tts(text: str) -> str:
    """Clean text for TTS readability by removing markdown and URLs."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
    text = re.sub(r"https?://\S+", "", text)
    return text.strip()


def build_chat_result(
    response_text: str,
    conversation_id: str,
    language: str,
    doc_paths: list,
    escalation_needed: bool,
    escalation_reason: Optional[str],
    confidence: float,
) -> dict:
    """Build the chat response dictionary."""
    return {
        "message": response_text,
        "conversation_id": conversation_id,
        "language": language,
        "spoken_response": clean_for_tts(response_text),
        "docs_referenced": doc_paths,
        "escalation_needed": escalation_needed,
        "escalation_reason": escalation_reason,
        "confidence": confidence,
    }

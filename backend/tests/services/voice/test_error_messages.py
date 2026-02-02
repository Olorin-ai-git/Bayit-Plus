"""
Test error messages module
"""

import pytest
from app.services.voice.error_messages import get_error_message, ERROR_MESSAGES


def test_error_messages_structure():
    """Test that all error types have all 3 languages."""
    for error_type, messages in ERROR_MESSAGES.items():
        assert "he" in messages, f"{error_type} missing Hebrew"
        assert "en" in messages, f"{error_type} missing English"
        assert "es" in messages, f"{error_type} missing Spanish"

        # Verify messages are not empty
        assert len(messages["he"]) > 0
        assert len(messages["en"]) > 0
        assert len(messages["es"]) > 0


def test_get_error_message_hebrew():
    """Test getting Hebrew error messages."""
    msg = get_error_message("claude_api_failure", "he")
    assert "מצטער" in msg
    assert len(msg) > 0


def test_get_error_message_english():
    """Test getting English error messages."""
    msg = get_error_message("search_failure", "en")
    assert "Sorry" in msg
    assert len(msg) > 0


def test_get_error_message_spanish():
    """Test getting Spanish error messages."""
    msg = get_error_message("kids_content_empty", "es")
    assert "Lo siento" in msg or "No se" in msg
    assert len(msg) > 0


def test_get_error_message_unknown_type():
    """Test that unknown error types fallback to unknown_error."""
    msg = get_error_message("nonexistent_error", "en")
    assert "Unexpected error" in msg


def test_get_error_message_unknown_language():
    """Test that unknown languages fallback to English."""
    msg = get_error_message("timeout", "fr")
    assert "Search is taking time" in msg


def test_all_error_types():
    """Test all documented error types."""
    error_types = [
        "claude_api_failure",
        "search_failure",
        "kids_content_empty",
        "family_controls_block",
        "timeout",
        "unknown_error",
        "no_results",
        "age_detection_failed"
    ]

    for error_type in error_types:
        for lang in ["he", "en", "es"]:
            msg = get_error_message(error_type, lang)
            assert isinstance(msg, str)
            assert len(msg) > 0

"""Unit tests for the multi-language profanity filter."""

import unittest
from unittest.mock import patch

from app.services.profanity_filter import censor_profanity, contains_profanity


class TestContainsProfanity(unittest.TestCase):
    """Tests for contains_profanity function."""

    def test_clean_english_text(self):
        """Clean English text passes through."""
        assert contains_profanity("Hello, how are you?") is False

    def test_clean_hebrew_text(self):
        """Clean Hebrew text passes through."""
        assert contains_profanity("שלום מה קורה") is False

    def test_english_profanity_detected(self):
        """English profanity is detected."""
        assert contains_profanity("what the fuck") is True

    def test_hebrew_profanity_detected(self):
        """Hebrew romanized profanity is detected."""
        assert contains_profanity("you are a ben zona") is True

    def test_arabic_profanity_detected(self):
        """Arabic romanized profanity is detected."""
        assert contains_profanity("kos omak what") is True

    def test_russian_profanity_detected(self):
        """Russian romanized profanity is detected."""
        assert contains_profanity("idi nahui friend") is True

    def test_case_insensitive_detection(self):
        """Profanity detection is case-insensitive."""
        assert contains_profanity("BEN ZONA") is True
        assert contains_profanity("Sharmouta") is True

    @patch("app.services.profanity_filter.settings")
    def test_disabled_filter_allows_all(self, mock_settings):
        """When profanity_filter_enabled is False, nothing is flagged."""
        mock_settings.olorin.channel_chat.profanity_filter_enabled = False
        assert contains_profanity("fuck shit damn") is False


class TestCensorProfanity(unittest.TestCase):
    """Tests for censor_profanity function."""

    def test_clean_text_unchanged(self):
        """Clean text passes through unchanged."""
        text = "Hello, welcome to Bayit+"
        assert censor_profanity(text) == text

    def test_english_profanity_censored(self):
        """English profanity is replaced with asterisks."""
        result = censor_profanity("what the fuck")
        assert "fuck" not in result
        assert "****" in result

    def test_hebrew_profanity_censored(self):
        """Hebrew romanized profanity is censored."""
        result = censor_profanity("he is a ben zona")
        assert "ben zona" not in result.lower()

    def test_arabic_profanity_censored(self):
        """Arabic romanized profanity is censored."""
        result = censor_profanity("kos omak dude")
        assert "kos omak" not in result.lower()

    def test_message_structure_preserved(self):
        """Non-profane parts of the message are preserved."""
        result = censor_profanity("hello fuck world")
        assert "hello" in result
        assert "world" in result

    @patch("app.services.profanity_filter.settings")
    def test_disabled_filter_returns_original(self, mock_settings):
        """When disabled, original text is returned unchanged."""
        mock_settings.olorin.channel_chat.profanity_filter_enabled = False
        text = "fuck shit damn"
        assert censor_profanity(text) == text


if __name__ == "__main__":
    unittest.main()

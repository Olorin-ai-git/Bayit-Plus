"""
Tests for TriviaTranslationValidator - Output Validation

Verifies that translated text is safe and reasonable.
"""

import pytest
from app.services.trivia.trivia_translation_validator import TriviaTranslationValidator


class TestTriviaTranslationValidator:
    """Test suite for TriviaTranslationValidator."""

    def test_validate_normal_translation(self):
        """Normal translation should be valid."""
        validator = TriviaTranslationValidator()
        original = "This movie won an Oscar"
        translated = "הסרט הזה זכה באוסקר"
        assert validator.validate_translation_output(original, translated, "he") is True

    def test_validate_empty_translation_fails(self):
        """Empty translation should fail validation."""
        validator = TriviaTranslationValidator()
        original = "This movie won an Oscar"
        translated = ""
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_whitespace_only_translation_fails(self):
        """Whitespace-only translation should fail validation."""
        validator = TriviaTranslationValidator()
        original = "This movie won an Oscar"
        translated = "   \n\t  "
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_script_tag_in_translation_fails(self):
        """Translation containing script tags should fail."""
        validator = TriviaTranslationValidator()
        original = "This movie won an Oscar"
        translated = "הסרט <script>alert('xss')</script> זכה"
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_javascript_url_in_translation_fails(self):
        """Translation containing javascript: URL should fail."""
        validator = TriviaTranslationValidator()
        original = "Click here"
        translated = "javascript:alert('xss')"
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_data_url_in_translation_fails(self):
        """Translation containing data: URL should fail."""
        validator = TriviaTranslationValidator()
        original = "Image here"
        translated = "data:text/html,<script>alert(1)</script>"
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_length_ratio_too_high_fails(self):
        """Translation more than 3x original length should fail."""
        validator = TriviaTranslationValidator()
        original = "Short"
        translated = "A" * 100  # 20x longer
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_length_ratio_exactly_3x_passes(self):
        """Translation exactly 3x original length should pass."""
        validator = TriviaTranslationValidator()
        original = "Short"  # 5 chars
        translated = "A" * 15  # 15 chars = 3.0x
        assert validator.validate_translation_output(original, translated, "he") is True

    def test_validate_length_ratio_low_passes_with_warning(self):
        """Translation less than 0.3x original length should pass (with warning)."""
        validator = TriviaTranslationValidator()
        original = "This is a very long sentence with many words"  # 44 chars
        translated = "זה"  # 2 chars = 0.045x
        # Should pass but log warning (we can't test logging here)
        assert validator.validate_translation_output(original, translated, "he") is True

    def test_validate_english_to_hebrew_realistic_ratio(self):
        """Realistic English→Hebrew translation should pass."""
        validator = TriviaTranslationValidator()
        original = "The movie won an Oscar in 2020"  # 31 chars
        translated = "הסרט זכה באוסקר בשנת 2020"  # ~25 chars (0.8x ratio)
        assert validator.validate_translation_output(original, translated, "he") is True

    def test_validate_english_to_spanish_realistic_ratio(self):
        """Realistic English→Spanish translation should pass."""
        validator = TriviaTranslationValidator()
        original = "The movie won an Oscar in 2020"  # 31 chars
        translated = "La película ganó un Oscar en 2020"  # 34 chars (1.1x ratio)
        assert validator.validate_translation_output(original, translated, "es") is True

    def test_validate_hebrew_to_english_realistic_ratio(self):
        """Realistic Hebrew→English translation should pass."""
        validator = TriviaTranslationValidator()
        original = "הסרט זכה באוסקר"  # ~14 chars
        translated = "The movie won an Oscar"  # 22 chars (1.6x ratio)
        assert validator.validate_translation_output(original, translated, "en") is True

    def test_validate_same_text_passes(self):
        """Same text in both fields should pass (e.g., proper names)."""
        validator = TriviaTranslationValidator()
        original = "Steven Spielberg"
        translated = "Steven Spielberg"
        assert validator.validate_translation_output(original, translated, "he") is True

    def test_validate_case_insensitive_malicious_detection(self):
        """Malicious content should be detected case-insensitively."""
        validator = TriviaTranslationValidator()
        original = "Normal text"
        translated = "Text <SCRIPT>alert(1)</SCRIPT>"
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_mixed_case_javascript_url(self):
        """Mixed-case JavaScript URL should be detected."""
        validator = TriviaTranslationValidator()
        original = "Click here"
        translated = "JaVaScRiPt:alert(1)"
        assert validator.validate_translation_output(original, translated, "he") is False

    def test_validate_special_characters_pass(self):
        """Special characters in translation should pass."""
        validator = TriviaTranslationValidator()
        original = "Question?"
        translated = "¿Pregunta?"
        assert validator.validate_translation_output(original, translated, "es") is True

    def test_validate_numbers_and_punctuation(self):
        """Numbers and punctuation should pass validation."""
        validator = TriviaTranslationValidator()
        original = "Released in 2020!"
        translated = "¡Lanzado en 2020!"
        assert validator.validate_translation_output(original, translated, "es") is True

    def test_validate_unicode_characters(self):
        """Unicode characters should pass validation."""
        validator = TriviaTranslationValidator()
        original = "Director's name"
        translated = "名前"  # Japanese
        assert validator.validate_translation_output(original, translated, "ja") is True

    def test_validate_rtl_text(self):
        """Right-to-left text should pass validation."""
        validator = TriviaTranslationValidator()
        original = "The movie won an award"
        translated = "הסרט זכה בפרס"  # Hebrew RTL
        assert validator.validate_translation_output(original, translated, "he") is True

    def test_validate_with_newlines_and_spaces(self):
        """Translation with newlines and spaces should pass."""
        validator = TriviaTranslationValidator()
        original = "First sentence. Second sentence."
        translated = "Primera oración.\nSegunda oración."
        assert validator.validate_translation_output(original, translated, "es") is True

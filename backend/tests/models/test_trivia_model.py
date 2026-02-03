"""
Tests for updated TriviaFactModel with new translation schema.
"""

import pytest
from pydantic import ValidationError

from app.models.trivia import TriviaFactModel, TriviaFactResponse


class TestTriviaFactModelNewSchema:
    """Test new translation schema with text, source_language, and translations."""

    def test_create_english_source_trivia(self):
        """Test creating trivia with English source text."""
        fact = TriviaFactModel(
            text="This is an interesting fact about movies",
            source_language="en",
            translations={
                "he": "זו עובדה מעניינת על סרטים",
                "es": "Este es un hecho interesante sobre películas"
            },
            category="production",
            trigger_type="random",
            source="ai"
        )

        assert fact.text == "This is an interesting fact about movies"
        assert fact.source_language == "en"
        assert fact.translations["he"] == "זו עובדה מעניינת על סרטים"
        assert fact.translations["es"] == "Este es un hecho interesante sobre películas"

    def test_create_hebrew_source_trivia(self):
        """Test creating trivia with Hebrew source text."""
        fact = TriviaFactModel(
            text="זו עובדה מעניינת",
            source_language="he",
            translations={
                "es": "Este es un hecho interesante"
            },
            category="cultural",
            trigger_type="random",
            source="ai"
        )

        assert fact.text == "זו עובדה מעניינת"
        assert fact.source_language == "he"
        assert fact.translations.get("es") == "Este es un hecho interesante"
        # English translation not required for Hebrew source
        assert "en" not in fact.translations

    def test_default_source_language_is_english(self):
        """Test that source_language defaults to 'en'."""
        fact = TriviaFactModel(
            text="Default test fact",
            category="cast",
            trigger_type="random",
            source="manual"
        )

        assert fact.source_language == "en"

    def test_translations_field_defaults_to_empty_dict(self):
        """Test that translations field defaults to empty dictionary."""
        fact = TriviaFactModel(
            text="Fact without translations",
            category="historical",
            trigger_type="random",
            source="manual"
        )

        assert fact.translations == {}

    def test_text_field_cannot_be_empty(self):
        """Test that text field cannot be empty or whitespace."""
        with pytest.raises(ValidationError) as exc_info:
            TriviaFactModel(
                text="",
                category="production",
                trigger_type="random",
                source="manual"
            )

        # Verify validation error occurred for text field
        errors = exc_info.value.errors()
        assert any(err["loc"] == ("text",) for err in errors)

    def test_text_field_whitespace_stripped(self):
        """Test that text field whitespace is stripped."""
        fact = TriviaFactModel(
            text="  Fact with whitespace  ",
            category="location",
            trigger_type="random",
            source="ai"
        )

        assert fact.text == "Fact with whitespace"

    def test_translations_whitespace_stripped(self):
        """Test that translation values have whitespace stripped."""
        fact = TriviaFactModel(
            text="Test fact",
            translations={
                "he": "  Hebrew text  ",
                "es": "  Spanish text  "
            },
            category="cast",
            trigger_type="random",
            source="ai"
        )

        assert fact.translations["he"] == "Hebrew text"
        assert fact.translations["es"] == "Spanish text"

    def test_translations_empty_values_removed(self):
        """Test that empty translation values are removed."""
        fact = TriviaFactModel(
            text="Test fact",
            translations={
                "he": "Hebrew text",
                "es": "",  # Empty - should be removed
                "fr": "   "  # Whitespace only - should be removed
            },
            category="production",
            trigger_type="random",
            source="ai"
        )

        assert "he" in fact.translations
        assert "es" not in fact.translations
        assert "fr" not in fact.translations

    def test_source_language_not_in_translations(self):
        """Test that source language is removed from translations if present."""
        fact = TriviaFactModel(
            text="English fact",
            source_language="en",
            translations={
                "en": "English translation",  # Should be removed
                "he": "Hebrew text",
                "es": "Spanish text"
            },
            category="cast",
            trigger_type="random",
            source="ai"
        )

        # Source language should not be in translations
        assert "en" not in fact.translations
        assert "he" in fact.translations
        assert "es" in fact.translations


class TestTriviaFactModelGetTextForLanguage:
    """Test get_text_for_language helper method."""

    def test_get_source_language_text(self):
        """Test getting text in source language returns source text."""
        fact = TriviaFactModel(
            text="English source fact",
            source_language="en",
            translations={"he": "Hebrew", "es": "Spanish"},
            category="production",
            trigger_type="random",
            source="ai"
        )

        assert fact.get_text_for_language("en") == "English source fact"

    def test_get_translated_text(self):
        """Test getting text in translated language."""
        fact = TriviaFactModel(
            text="English source",
            source_language="en",
            translations={"he": "עברית", "es": "Español"},
            category="cast",
            trigger_type="random",
            source="ai"
        )

        assert fact.get_text_for_language("he") == "עברית"
        assert fact.get_text_for_language("es") == "Español"

    def test_get_unavailable_language_falls_back_to_english(self):
        """Test that unavailable language falls back to English source."""
        fact = TriviaFactModel(
            text="English source",
            source_language="en",
            translations={"he": "Hebrew"},
            category="cultural",
            trigger_type="random",
            source="ai"
        )

        # French not available - should fall back to English
        assert fact.get_text_for_language("fr") == "English source"
        assert fact.get_text_for_language("zh") == "English source"


class TestTriviaFactModelBackwardCompatibility:
    """Test backward compatibility with legacy text_en, text_es fields."""

    def test_legacy_fields_still_accepted(self):
        """Test that legacy text_en, text_es fields are still accepted."""
        fact = TriviaFactModel(
            text="Primary text",
            text_en="English text",
            text_es="Spanish text",
            category="production",
            trigger_type="random",
            source="manual"
        )

        assert fact.text_en == "English text"
        assert fact.text_es == "Spanish text"

    def test_legacy_fields_whitespace_stripped(self):
        """Test that legacy fields have whitespace stripped."""
        fact = TriviaFactModel(
            text="Test",
            text_en="  English  ",
            text_es="  Spanish  ",
            category="cast",
            trigger_type="random",
            source="manual"
        )

        assert fact.text_en == "English"
        assert fact.text_es == "Spanish"


class TestTriviaFactResponse:
    """Test TriviaFactResponse with new schema and legacy field population."""

    def test_response_includes_new_schema_fields(self):
        """Test that response includes source_language and translations."""
        response = TriviaFactResponse(
            fact_id="test-123",
            text="English fact",
            source_language="en",
            translations={"he": "Hebrew", "es": "Spanish"},
            category="production",
            display_duration=15,
            priority=5
        )

        assert response.source_language == "en"
        assert response.translations["he"] == "Hebrew"
        assert response.translations["es"] == "Spanish"

    def test_response_populates_legacy_text_en(self):
        """Test that text_en is populated from source text."""
        response = TriviaFactResponse(
            fact_id="test-123",
            text="English source",
            source_language="en",
            translations={},
            category="cast",
            display_duration=15,
            priority=5
        )

        # text_en should be populated from text (always English)
        assert response.text_en == "English source"

    def test_response_populates_legacy_text_he_from_translations(self):
        """Test that text_he is populated from translations."""
        response = TriviaFactResponse(
            fact_id="test-123",
            text="English",
            translations={"he": "עברית"},
            category="cultural",
            display_duration=15,
            priority=5
        )

        assert response.text_he == "עברית"

    def test_response_populates_legacy_text_es_from_translations(self):
        """Test that text_es is populated from translations."""
        response = TriviaFactResponse(
            fact_id="test-123",
            text="English",
            translations={"es": "Español"},
            category="historical",
            display_duration=15,
            priority=5
        )

        assert response.text_es == "Español"

    def test_response_legacy_fields_not_overwritten_if_present(self):
        """Test that existing legacy fields are not overwritten."""
        response = TriviaFactResponse(
            fact_id="test-123",
            text="English",
            text_he="Existing Hebrew",
            translations={"he": "New Hebrew"},
            category="production",
            display_duration=15,
            priority=5
        )

        # Should keep existing value, not overwrite
        assert response.text_he == "Existing Hebrew"

    def test_response_handles_missing_translations_gracefully(self):
        """Test that response handles missing translations without errors."""
        response = TriviaFactResponse(
            fact_id="test-123",
            text="English only",
            translations={},
            category="location",
            display_duration=15,
            priority=5
        )

        assert response.text_en == "English only"
        assert response.text_he is None
        assert response.text_es is None

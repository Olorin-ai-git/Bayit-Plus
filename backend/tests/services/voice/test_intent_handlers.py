"""
Test intent handlers
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.voice.intent_handlers.search_handler import _classify_search_type
from app.services.voice.voice_formatters import format_voice_search_results as _format_voice_search_results
from app.services.voice.voice_formatters import format_kids_response as _format_kids_response
from app.services.voice.intent_handlers.kids_handler import (
    _detect_age_from_transcript,
    AGE_PATTERNS
)


class TestSearchClassification:
    """Test search type classification."""

    def test_classify_live_search_hebrew(self):
        """Test live search classification with Hebrew keywords."""
        assert _classify_search_type("מה משודר עכשיו", "he") == "live"
        assert _classify_search_type("ערוץ 13 הלילה", "he") == "live"

    def test_classify_live_search_english(self):
        """Test live search classification with English keywords."""
        assert _classify_search_type("what's on now", "en") == "live"
        assert _classify_search_type("channel tonight", "en") == "live"

    def test_classify_live_search_spanish(self):
        """Test live search classification with Spanish keywords."""
        assert _classify_search_type("qué hay ahora", "es") == "live"
        assert _classify_search_type("canal esta noche", "es") == "live"

    def test_classify_complex_vod_search(self):
        """Test complex VOD search classification."""
        # Long query
        assert _classify_search_type("סרטי אקשן משנות ה-90 עם ברוס וויליס", "he") == "complex_vod"

        # Multiple criteria
        assert _classify_search_type("action movies 1990", "en") == "complex_vod"

    def test_classify_simple_vod_search(self):
        """Test simple VOD search classification."""
        assert _classify_search_type("action", "en") == "simple_vod"
        assert _classify_search_type("קומדיה", "he") == "simple_vod"


class TestSearchResultsFormatting:
    """Test search results formatting."""

    def test_format_no_results_hebrew(self):
        """Test formatting zero results in Hebrew."""
        result = _format_voice_search_results([], "he")
        assert "לא מצאתי תוצאות" in result

    def test_format_no_results_english(self):
        """Test formatting zero results in English."""
        result = _format_voice_search_results([], "en")
        assert "no results" in result.lower()

    def test_format_no_results_spanish(self):
        """Test formatting zero results in Spanish."""
        result = _format_voice_search_results([], "es")
        assert "no encontré" in result.lower()

    def test_format_single_result_hebrew(self):
        """Test formatting single result in Hebrew."""
        results = [{"title": "Ice Age", "year": 2002}]
        result = _format_voice_search_results(results, "he")
        assert "Ice Age" in result
        assert "2002" in result

    def test_format_multiple_results_english(self):
        """Test formatting multiple results in English."""
        results = [
            {"title": "Movie 1", "year": 2020},
            {"title": "Movie 2", "year": 2021},
            {"title": "Movie 3", "year": 2022}
        ]
        result = _format_voice_search_results(results, "en")
        assert "3 results" in result.lower()
        assert "Movie 1" in result


class TestAgeDetection:
    """Test age detection from transcript."""

    def test_detect_age_hebrew(self):
        """Test age detection with Hebrew patterns."""
        age, group, is_youngsters = _detect_age_from_transcript("לילדים בגיל 5", "he")
        assert age == 5
        assert group == "preschool"
        assert is_youngsters is False

    def test_detect_age_english(self):
        """Test age detection with English patterns."""
        age, group, is_youngsters = _detect_age_from_transcript("for 8 year old", "en")
        assert age == 8
        assert group == "elementary"
        assert is_youngsters is False

    def test_detect_age_spanish(self):
        """Test age detection with Spanish patterns."""
        age, group, is_youngsters = _detect_age_from_transcript("para niños de 10 años", "es")
        assert age == 10
        assert group == "elementary"
        assert is_youngsters is False

    def test_detect_age_youngsters(self):
        """Test youngsters age detection."""
        age, group, is_youngsters = _detect_age_from_transcript("age 15", "en")
        assert age == 15
        assert group == "preteen"
        assert is_youngsters is True

    def test_detect_age_default(self):
        """Test default age when no age found."""
        age, group, is_youngsters = _detect_age_from_transcript("kids content", "en")
        assert age == 8
        assert group == "elementary"
        assert is_youngsters is False

    def test_age_group_toddler(self):
        """Test toddler age group."""
        age, group, is_youngsters = _detect_age_from_transcript("for 2 year old", "en")
        assert age == 2
        assert group == "toddler"

    def test_age_group_preschool(self):
        """Test preschool age group."""
        age, group, is_youngsters = _detect_age_from_transcript("age 5", "en")
        assert age == 5
        assert group == "preschool"

    def test_age_patterns_exist_for_all_languages(self):
        """Test that age patterns exist for all languages."""
        assert "he" in AGE_PATTERNS
        assert "en" in AGE_PATTERNS
        assert "es" in AGE_PATTERNS

        # Each language should have multiple patterns
        assert len(AGE_PATTERNS["he"]) >= 3
        assert len(AGE_PATTERNS["en"]) >= 3
        assert len(AGE_PATTERNS["es"]) >= 3


class TestKidsResponseFormatting:
    """Test kids content response formatting."""

    def test_format_kids_no_results_hebrew(self):
        """Test formatting zero results in Hebrew."""
        result = _format_kids_response([], 5, "he")
        assert "לא מצאתי תוכן" in result

    def test_format_kids_no_results_english(self):
        """Test formatting zero results in English."""
        result = _format_kids_response([], 5, "en")
        assert "No content found" in result

    def test_format_kids_no_results_spanish(self):
        """Test formatting zero results in Spanish."""
        result = _format_kids_response([], 5, "es")
        assert "No se encontró" in result

    def test_format_kids_with_results_hebrew(self):
        """Test formatting with results in Hebrew."""
        items = [{"title": "Item 1"}, {"title": "Item 2"}]
        result = _format_kids_response(items, 7, "he")
        assert "2" in result
        assert "7" in result

    def test_format_kids_with_results_english(self):
        """Test formatting with results in English."""
        items = [{"title": "Item 1"}, {"title": "Item 2"}, {"title": "Item 3"}]
        result = _format_kids_response(items, 10, "en")
        assert "3" in result
        assert "10" in result

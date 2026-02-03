"""
Tests for trivia response formatting with new multilingual schema.

Verifies that format_trivia_response() correctly handles:
- New schema (source_language + translations)
- Legacy schema (text_he, text_en, text_es)
- Backward compatibility
- Single-language mode vs multilingual mode
"""

import pytest
from datetime import datetime, timezone
from bson import ObjectId
from unittest.mock import MagicMock

from app.api.routes.trivia.trivia_utils import format_trivia_response


def create_mock_fact(
    fact_id: str,
    text: str,
    source_language: str = None,
    translations: dict = None,
    text_he: str = None,
    text_en: str = None,
    text_es: str = None,
    trigger_time: float = 120.0,
    trigger_type: str = "scene",
    category: str = "production",
    display_duration: int = 10,
    priority: int = 1,
    related_person: str = None,
    chain_id: str = None,
    chain_order: int = None,
    has_follow_up: bool = False,
):
    """Create a mock trivia fact with specified attributes."""
    fact = MagicMock()
    fact.fact_id = fact_id
    fact.text = text
    fact.source_language = source_language
    fact.translations = translations or {}
    fact.text_he = text_he
    fact.text_en = text_en
    fact.text_es = text_es
    fact.trigger_time = trigger_time
    fact.trigger_type = trigger_type
    fact.category = category
    fact.display_duration = display_duration
    fact.priority = priority
    fact.related_person = related_person
    fact.chain_id = chain_id
    fact.chain_order = chain_order
    fact.has_follow_up = has_follow_up

    # Mock the get_text_for_language method
    def get_text_for_language(lang_code: str) -> str:
        # NEW SCHEMA: Check translations first
        if translations and lang_code in translations:
            return translations[lang_code]

        # Source language check
        if source_language and lang_code == source_language:
            return text

        # LEGACY SCHEMA: Fallback to text_* fields
        if lang_code == "he":
            return text_he or (text if source_language == "he" else None)
        elif lang_code == "en":
            return text_en or (text if source_language == "en" else None)
        elif lang_code == "es":
            return text_es or None

        # Final fallback
        if source_language == "en":
            return text
        return text_en or text

    fact.get_text_for_language = get_text_for_language
    return fact


def create_mock_trivia(
    content_id: str,
    content_type: str,
    facts: list,
    fact_count: int = None,
    is_enriched: bool = False,
    sources_used: list = None,
    tmdb_id: int = None,
    created_at: datetime = None,
    updated_at: datetime = None,
    enriched_at: datetime = None,
):
    """Create a mock ContentTrivia with specified attributes."""
    trivia = MagicMock()
    trivia.content_id = content_id
    trivia.content_type = content_type
    trivia.facts = facts
    trivia.fact_count = fact_count or len(facts)
    trivia.is_enriched = is_enriched
    trivia.sources_used = sources_used or []
    trivia.tmdb_id = tmdb_id
    trivia.created_at = created_at or datetime.now(timezone.utc)
    trivia.updated_at = updated_at or datetime.now(timezone.utc)
    trivia.enriched_at = enriched_at
    return trivia


@pytest.fixture
def new_schema_trivia():
    """ContentTrivia with new schema (source_language + translations)."""
    facts = [
        create_mock_fact(
            fact_id="fact1",
            text="This movie won an Oscar",
            source_language="en",
            translations={
                "he": "הסרט הזה זכה באוסקר",
                "es": "Esta película ganó un Oscar"
            },
        ),
        create_mock_fact(
            fact_id="fact2",
            text="Filmed in Jerusalem",
            source_language="en",
            translations={
                "he": "צולם בירושלים",
                "es": "Filmado en Jerusalén"
            },
            trigger_time=300.0,
            category="location",
            priority=2,
            related_person="Director Name",
            chain_id="chain1",
            chain_order=1,
            has_follow_up=True,
        ),
    ]

    return create_mock_trivia(
        content_id=str(ObjectId()),
        content_type="vod",
        facts=facts,
        fact_count=2,
        is_enriched=True,
        sources_used=["tmdb", "ai"],
        tmdb_id=12345,
        enriched_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def legacy_schema_trivia():
    """ContentTrivia with legacy schema (text_he, text_en, text_es)."""
    facts = [
        create_mock_fact(
            fact_id="fact1",
            text="הסרט הזה זכה באוסקר",  # Legacy Hebrew in text field
            text_he="הסרט הזה זכה באוסקר",
            text_en="This movie won an Oscar",
            text_es="Esta película ganó un Oscar",
        ),
    ]

    return create_mock_trivia(
        content_id=str(ObjectId()),
        content_type="vod",
        facts=facts,
        fact_count=1,
    )


def test_new_schema_multilingual_mode(new_schema_trivia):
    """Test new schema in multilingual mode - returns all language fields."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=True
    )

    assert response["content_id"] == new_schema_trivia.content_id
    assert response["fact_count"] == 2
    assert response["is_enriched"] is True
    assert len(response["facts"]) == 2

    fact = response["facts"][0]
    # Should include new schema fields
    assert fact["source_language"] == "en"
    assert fact["translations"] == {
        "he": "הסרט הזה זכה באוסקר",
        "es": "Esta película ganó un Oscar"
    }

    # Should include legacy fields for backward compatibility
    assert fact["text_he"] == "הסרט הזה זכה באוסקר"
    assert fact["text_en"] == "This movie won an Oscar"
    assert fact["text_es"] == "Esta película ganó un Oscar"


def test_new_schema_single_language_english(new_schema_trivia):
    """Test new schema in single-language mode (English)."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=False
    )

    fact = response["facts"][0]
    # Primary text should be English
    assert fact["text"] == "This movie won an Oscar"

    # Should include new schema fields
    assert fact["source_language"] == "en"
    assert fact["translations"]["he"] == "הסרט הזה זכה באוסקר"

    # Should include English legacy field
    assert fact["text_en"] == "This movie won an Oscar"


def test_new_schema_single_language_hebrew(new_schema_trivia):
    """Test new schema in single-language mode (Hebrew)."""
    response = format_trivia_response(
        new_schema_trivia, language="he", multilingual=False
    )

    fact = response["facts"][0]
    # Primary text should be Hebrew (from translations)
    assert fact["text"] == "הסרט הזה זכה באוסקר"

    # Should include new schema fields
    assert fact["source_language"] == "en"
    assert fact["translations"]["he"] == "הסרט הזה זכה באוסקר"

    # Should include Hebrew legacy field
    assert fact["text_he"] == "הסרט הזה זכה באוסקר"


def test_new_schema_single_language_spanish(new_schema_trivia):
    """Test new schema in single-language mode (Spanish)."""
    response = format_trivia_response(
        new_schema_trivia, language="es", multilingual=False
    )

    fact = response["facts"][0]
    # Primary text should be Spanish (from translations)
    assert fact["text"] == "Esta película ganó un Oscar"

    # Should include new schema fields
    assert fact["source_language"] == "en"
    assert fact["translations"]["es"] == "Esta película ganó un Oscar"

    # Should include Spanish legacy field
    assert fact["text_es"] == "Esta película ganó un Oscar"


def test_new_schema_unsupported_language_fallback(new_schema_trivia):
    """Test new schema with unsupported language - should fallback to English."""
    response = format_trivia_response(
        new_schema_trivia, language="fr", multilingual=False  # French not supported
    )

    fact = response["facts"][0]
    # Should fallback to English (source language)
    assert fact["text"] == "This movie won an Oscar"
    assert fact["source_language"] == "en"


def test_legacy_schema_multilingual_mode(legacy_schema_trivia):
    """Test legacy schema in multilingual mode - returns all language fields."""
    response = format_trivia_response(
        legacy_schema_trivia, language="en", multilingual=True
    )

    fact = response["facts"][0]
    # Legacy schema doesn't have source_language or translations
    assert "source_language" not in fact
    assert "translations" not in fact

    # Should include legacy fields
    assert fact["text_he"] == "הסרט הזה זכה באוסקר"
    assert fact["text_en"] == "This movie won an Oscar"
    assert fact["text_es"] == "Esta película ganó un Oscar"


def test_legacy_schema_single_language_english(legacy_schema_trivia):
    """Test legacy schema in single-language mode (English)."""
    response = format_trivia_response(
        legacy_schema_trivia, language="en", multilingual=False
    )

    fact = response["facts"][0]
    # Primary text should be English (from legacy field)
    assert fact["text"] == "This movie won an Oscar"

    # Should include English legacy field
    assert fact["text_en"] == "This movie won an Oscar"


def test_legacy_schema_single_language_hebrew(legacy_schema_trivia):
    """Test legacy schema in single-language mode (Hebrew)."""
    response = format_trivia_response(
        legacy_schema_trivia, language="he", multilingual=False
    )

    fact = response["facts"][0]
    # Primary text should be Hebrew (from text field)
    assert fact["text"] == "הסרט הזה זכה באוסקר"

    # Should include Hebrew legacy field
    assert fact["text_he"] == "הסרט הזה זכה באוסקר"


def test_chain_fields_included(new_schema_trivia):
    """Test that chain fields are always included."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=False
    )

    # First fact (standalone)
    fact1 = response["facts"][0]
    assert fact1["chain_id"] is None
    assert fact1["chain_order"] is None
    assert fact1["has_follow_up"] is False

    # Second fact (part of chain)
    fact2 = response["facts"][1]
    assert fact2["chain_id"] == "chain1"
    assert fact2["chain_order"] == 1
    assert fact2["has_follow_up"] is True


def test_optional_fields_included(new_schema_trivia):
    """Test that optional fields like related_person are included when present."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=False
    )

    # First fact (no related_person)
    fact1 = response["facts"][0]
    assert "related_person" not in fact1

    # Second fact (has related_person)
    fact2 = response["facts"][1]
    assert fact2["related_person"] == "Director Name"


def test_metadata_included_when_requested(new_schema_trivia):
    """Test that metadata is included when include_metadata=True."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=False, include_metadata=True
    )

    assert "sources_used" in response
    assert response["sources_used"] == ["tmdb", "ai"]
    assert response["tmdb_id"] == 12345
    assert "created_at" in response
    assert "updated_at" in response
    assert "enriched_at" in response


def test_metadata_excluded_when_not_requested(new_schema_trivia):
    """Test that metadata is excluded when include_metadata=False."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=False, include_metadata=False
    )

    assert "sources_used" not in response
    assert "tmdb_id" not in response
    assert "created_at" not in response
    assert "updated_at" not in response
    assert "enriched_at" not in response


def test_basic_fact_fields_always_included(new_schema_trivia):
    """Test that basic fact fields are always included."""
    response = format_trivia_response(
        new_schema_trivia, language="en", multilingual=False
    )

    fact = response["facts"][0]
    assert fact["fact_id"] == "fact1"
    assert fact["text"] is not None
    assert fact["trigger_time"] == 120.0
    assert fact["trigger_type"] == "scene"
    assert fact["category"] == "production"
    assert fact["display_duration"] == 10
    assert fact["priority"] == 1

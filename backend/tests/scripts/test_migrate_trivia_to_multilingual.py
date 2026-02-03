"""
Tests for trivia migration script.

Verifies that migration correctly converts legacy schema to new schema
while preserving data integrity and backward compatibility.
"""

import pytest
from unittest.mock import MagicMock

# Import the migrator (will work after we add scripts to path)
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from scripts.migrate_trivia_to_multilingual import TriviaDataMigrator
from app.models.trivia import TriviaFactModel


def create_mock_fact(
    fact_id: str,
    text: str,
    text_he: str = None,
    text_en: str = None,
    text_es: str = None,
    source_language: str = None,
    translations: dict = None,
):
    """Create a mock trivia fact for testing."""
    fact = MagicMock(spec=TriviaFactModel)
    fact.fact_id = fact_id
    fact.text = text
    fact.text_he = text_he
    fact.text_en = text_en
    fact.text_es = text_es
    fact.source_language = source_language
    fact.translations = translations or {}
    return fact


@pytest.fixture
def migrator():
    """Create a migrator instance for testing."""
    return TriviaDataMigrator(dry_run=True, batch_size=10)


def test_detect_source_language_english(migrator):
    """Test source language detection for English facts."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he="זה עובדה",
    )

    source_lang = migrator.detect_source_language(fact)
    assert source_lang == "en"


def test_detect_source_language_hebrew(migrator):
    """Test source language detection for Hebrew facts."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="זה עובדה",
        text_he="זה עובדה",
        text_en="This is a fact",
    )

    source_lang = migrator.detect_source_language(fact)
    assert source_lang == "he"


def test_detect_source_language_default_english(migrator):
    """Test source language defaults to English when ambiguous."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="Some text",
        text_he="זה עובדה",
        text_en="Different text",
    )

    source_lang = migrator.detect_source_language(fact)
    assert source_lang == "en"  # Default to English


def test_build_translations_dict_all_languages(migrator):
    """Test building translations dict with all languages present."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_he="זה עובדה",
        text_en="This is a fact",
        text_es="Esto es un hecho",
    )

    translations = migrator.build_translations_dict(fact)
    assert translations == {
        "he": "זה עובדה",
        "en": "This is a fact",
        "es": "Esto es un hecho",
    }


def test_build_translations_dict_partial_languages(migrator):
    """Test building translations dict with only some languages."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he="זה עובדה",
        text_es=None,  # No Spanish translation
    )

    translations = migrator.build_translations_dict(fact)
    assert translations == {
        "he": "זה עובדה",
        "en": "This is a fact",
    }
    assert "es" not in translations


def test_build_translations_dict_empty(migrator):
    """Test building translations dict with no legacy fields."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="Some text",
        text_he=None,
        text_en=None,
        text_es=None,
    )

    translations = migrator.build_translations_dict(fact)
    assert translations == {}


def test_migrate_fact_legacy_english(migrator):
    """Test migrating a legacy English fact."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he="זה עובדה",
        text_es="Esto es un hecho",
        source_language=None,  # Legacy: no source_language
        translations=None,  # Legacy: no translations
    )

    was_migrated = migrator.migrate_fact(fact)
    assert was_migrated is True

    # Verify new schema fields
    assert fact.source_language == "en"
    assert fact.translations == {
        "he": "זה עובדה",
        "en": "This is a fact",
        "es": "Esto es un hecho",
    }
    assert fact.text == "This is a fact"  # Source text


def test_migrate_fact_legacy_hebrew(migrator):
    """Test migrating a legacy Hebrew fact."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="זה עובדה",
        text_he="זה עובדה",
        text_en="This is a fact",
        text_es="Esto es un hecho",
        source_language=None,
        translations=None,
    )

    was_migrated = migrator.migrate_fact(fact)
    assert was_migrated is True

    # Verify new schema fields
    assert fact.source_language == "he"
    assert fact.translations == {
        "he": "זה עובדה",
        "en": "This is a fact",
        "es": "Esto es un hecho",
    }
    assert fact.text == "זה עובדה"  # Source text


def test_migrate_fact_already_new_schema(migrator):
    """Test that facts already using new schema are skipped."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he="זה עובדה",
        source_language="en",  # Already has source_language
        translations={"he": "זה עובדה", "en": "This is a fact"},  # Already has translations
    )

    was_migrated = migrator.migrate_fact(fact)
    assert was_migrated is False

    # Verify fields unchanged
    assert fact.source_language == "en"
    assert fact.translations == {"he": "זה עובדה", "en": "This is a fact"}


def test_migrate_fact_partial_legacy_fields(migrator):
    """Test migrating fact with only some legacy fields."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he=None,  # No Hebrew translation
        text_es=None,  # No Spanish translation
        source_language=None,
        translations=None,
    )

    was_migrated = migrator.migrate_fact(fact)
    assert was_migrated is True

    # Verify new schema with only English
    assert fact.source_language == "en"
    assert fact.translations == {"en": "This is a fact"}


def test_migrator_stats_initialization(migrator):
    """Test that migrator stats are initialized correctly."""
    assert migrator.stats["total_trivia"] == 0
    assert migrator.stats["migrated_trivia"] == 0
    assert migrator.stats["already_new_schema"] == 0
    assert migrator.stats["total_facts"] == 0
    assert migrator.stats["migrated_facts"] == 0
    assert migrator.stats["errors"] == 0


def test_migrator_dry_run_mode(migrator):
    """Test that migrator respects dry-run mode."""
    assert migrator.dry_run is True


def test_migrator_batch_size():
    """Test that migrator respects custom batch size."""
    migrator = TriviaDataMigrator(dry_run=False, batch_size=50)
    assert migrator.batch_size == 50
    assert migrator.dry_run is False


def test_migrate_fact_preserves_legacy_fields(migrator):
    """Test that migration preserves legacy fields for backward compatibility."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he="זה עובדה",
        text_es="Esto es un hecho",
        source_language=None,
        translations=None,
    )

    migrator.migrate_fact(fact)

    # Legacy fields should be preserved
    assert fact.text_en == "This is a fact"
    assert fact.text_he == "זה עובדה"
    assert fact.text_es == "Esto es un hecho"


def test_detect_source_language_with_only_english(migrator):
    """Test source language detection with only English translation."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="This is a fact",
        text_en="This is a fact",
        text_he=None,
        text_es=None,
    )

    source_lang = migrator.detect_source_language(fact)
    assert source_lang == "en"


def test_detect_source_language_with_only_hebrew(migrator):
    """Test source language detection with only Hebrew translation."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="זה עובדה",
        text_he="זה עובדה",
        text_en=None,
        text_es=None,
    )

    source_lang = migrator.detect_source_language(fact)
    assert source_lang == "he"


def test_migrate_fact_updates_text_field_for_english_source(migrator):
    """Test that text field is updated to English when source is English."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="Different text",  # Text doesn't match any language
        text_en="This is a fact",
        text_he="זה עובדה",
        source_language=None,
        translations=None,
    )

    migrator.migrate_fact(fact)

    # Source defaults to English, text should be updated to English
    assert fact.text == "This is a fact"
    assert fact.source_language == "en"


def test_migrate_fact_keeps_text_field_for_hebrew_source(migrator):
    """Test that text field stays Hebrew when source is Hebrew."""
    fact = create_mock_fact(
        fact_id="fact1",
        text="זה עובדה",
        text_he="זה עובדה",
        text_en="This is a fact",
        source_language=None,
        translations=None,
    )

    migrator.migrate_fact(fact)

    # Text should remain Hebrew source
    assert fact.text == "זה עובדה"
    assert fact.source_language == "he"

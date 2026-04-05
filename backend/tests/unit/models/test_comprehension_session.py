"""Unit tests for ComprehensionSession Beanie document (Phase 2 Plan 01-01 Task 2).

Covers D-01 (new Document, natural-key non-unique index), D-02 (ScoredExchange
embeds RubricScore), D-17 (resume-only, no restart affordance), denormalization
pattern mirrored from VODInteractionSession.
"""
from unittest.mock import MagicMock, patch

from pymongo import IndexModel

from app.models.comprehension_session import ComprehensionSession, ScoredExchange
from app.schemas.comprehension import AdaptLevel, RubricScore


def _make_session(**overrides):
    """Instantiate ComprehensionSession without hitting MongoDB."""
    defaults = dict(
        user_id="u1",
        profile_id="p1",
        content_id="c1",
        character_name="Walter Burns",
        scene_context="office",
        character_voice_id="v1",
    )
    defaults.update(overrides)
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock()
    ):
        return ComprehensionSession(**defaults)


def test_session_defaults_to_active_status():
    """D-17: default status is 'active'; resume-only lifecycle."""
    session = _make_session()
    assert session.status == "active"
    assert session.current_adapt_level == AdaptLevel.INITIAL
    assert session.exchanges == []
    assert session.last_trigger_at_playback_seconds == 0.0


def test_session_has_no_restart_or_reset_method():
    """D-17: no restart affordance on the model, ever."""
    assert not hasattr(ComprehensionSession, "restart")
    assert not hasattr(ComprehensionSession, "reset")


def test_scored_exchange_validates_with_rubric_score():
    """D-02: ScoredExchange embeds RubricScore + AdaptLevel."""
    exchange = ScoredExchange(
        question_text="Why print the story?",
        student_answer="To expose corruption.",
        score=RubricScore(score=2, rationale="captures the civic motive"),
        adapt_level=AdaptLevel.INITIAL,
        moment_timestamp=12.5,
    )
    assert exchange.score.score == 2
    assert exchange.adapt_level == AdaptLevel.INITIAL
    assert exchange.answer_modality == "text"
    assert exchange.memory_retry_pending is False
    assert exchange.parent_exchange_index is None


def test_session_collection_name():
    """D-01: new collection named 'comprehension_sessions'."""
    assert ComprehensionSession.Settings.name == "comprehension_sessions"


def test_session_index_is_not_unique_on_natural_key():
    """D-01: compound (user_id, profile_id, content_id) index is NOT unique.

    Multiple comprehension sessions per (user, profile, content) are allowed
    over time - unlike VODFilmMemory which has a unique index there.
    """
    indexes = ComprehensionSession.Settings.indexes
    compound = [i for i in indexes if isinstance(i, IndexModel)]
    assert len(compound) >= 1, "expected at least one IndexModel"
    # Find the natural-key compound index
    natural_key = None
    for idx in compound:
        doc = idx.document
        key_fields = [k for k, _ in doc["key"].items()]
        if key_fields == ["user_id", "profile_id", "content_id"]:
            natural_key = doc
            break
    assert natural_key is not None, "natural-key compound index missing"
    assert not natural_key.get("unique", False), (
        "natural-key index must NOT be unique per D-01"
    )


def test_session_importable():
    """D-01: ComprehensionSession is importable from app.models namespace."""
    from app.models.comprehension_session import ComprehensionSession as CS
    assert CS is ComprehensionSession


def test_session_denormalizes_character_fields():
    """Pattern from VODInteractionSession: denormalize for prompt-build efficiency."""
    session = _make_session(
        character_frame_url="gs://frames/walter.jpg",
        rubric_config_id="hgf-v1",
    )
    assert session.character_name == "Walter Burns"
    assert session.character_voice_id == "v1"
    assert session.character_frame_url == "gs://frames/walter.jpg"
    assert session.rubric_config_id == "hgf-v1"


def test_session_registered_in_database_document_models():
    """D-01: ComprehensionSession must be registered so collection initializes.

    database.py builds document_models as a local list inside connect_to_mongo.
    Verify the registration by reading the source text - this is the current
    registration style and matches how VODFilmMemory is registered.
    """
    from pathlib import Path
    import app.core.database as db_module
    source = Path(db_module.__file__).read_text()
    assert "from app.models.comprehension_session import ComprehensionSession" in source, (
        "ComprehensionSession must be imported in app/core/database.py"
    )
    assert "ComprehensionSession," in source, (
        "ComprehensionSession must be in the document_models list"
    )

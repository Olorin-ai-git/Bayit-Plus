"""Knowledge corpus settings defaults."""

from app.core.config import settings


def test_knowledge_pinecone_top_k_defaults():
    assert settings.KNOWLEDGE_PINECONE_TOP_K_ORG == 40
    assert settings.KNOWLEDGE_PINECONE_TOP_K_TEAM == 20


def test_knowledge_boost_defaults():
    assert settings.KNOWLEDGE_CANONICAL_BOOST == 1.4
    assert settings.KNOWLEDGE_DOC_BOOST == 1.2
    assert settings.KNOWLEDGE_STALE_BOOST == 0.8


def test_knowledge_confidence_threshold_default():
    assert settings.KNOWLEDGE_CANONICAL_CONFIDENCE_THRESHOLD == 0.85


def test_knowledge_max_sources_default():
    assert settings.KNOWLEDGE_MAX_SOURCES_DEFAULT == 5


def test_knowledge_history_limits():
    assert settings.KNOWLEDGE_HISTORY_USER_LIMIT == 30
    assert settings.KNOWLEDGE_HISTORY_USER_WINDOW_DAYS == 90

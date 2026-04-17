"""Knowledge document ingestion settings — tier caps."""

from app.core.config import settings


def test_per_file_caps_by_tier():
    assert settings.KNOWLEDGE_DOC_PER_FILE_MB_ORG == 25
    assert settings.KNOWLEDGE_DOC_PER_FILE_MB_ENTERPRISE == 100


def test_total_storage_caps_by_tier():
    assert settings.KNOWLEDGE_DOC_TOTAL_MB_ORG == 1024
    assert settings.KNOWLEDGE_DOC_TOTAL_MB_ENTERPRISE == 10240


def test_url_rate_caps_by_tier():
    assert settings.KNOWLEDGE_DOC_URL_HOURLY_ORG == 10
    assert settings.KNOWLEDGE_DOC_URL_HOURLY_ENTERPRISE == 50


def test_chunk_params():
    assert settings.KNOWLEDGE_DOC_CHUNK_TOKENS == 512
    assert settings.KNOWLEDGE_DOC_CHUNK_OVERLAP == 50

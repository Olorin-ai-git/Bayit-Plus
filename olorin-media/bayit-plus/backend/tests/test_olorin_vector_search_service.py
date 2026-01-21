"""
Comprehensive Tests for Olorin Vector Search Service

Tests cover:
- Service initialization
- Embedding generation
- Content indexing
- Semantic search
- Dialogue search
- Result ranking and scoring
"""

from typing import List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from app.core.config import settings
from app.models.content import Content
from app.models.content_embedding import (
    ContentEmbedding,
    DialogueSearchQuery,
    SearchQuery,
    SemanticSearchResult,
)
from app.models.integration_partner import IntegrationPartner, UsageRecord
from app.services.olorin.search.service import VectorSearchService
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# ============================================
# Test Fixtures
# ============================================


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_search_test"],
        document_models=[Content, ContentEmbedding, IntegrationPartner, UsageRecord],
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_search_test")
    client.close()


@pytest_asyncio.fixture
async def search_service(db_client):
    """Create vector search service instance."""
    service = VectorSearchService()
    return service


@pytest_asyncio.fixture
async def sample_content(db_client):
    """Create sample content for testing."""
    content = Content(
        title="בדיקה - סרט ישראלי",
        title_en="Test - Israeli Movie",
        description="סרט דרמה ישראלי על חיים בתל אביב",
        description_en="Israeli drama about life in Tel Aviv",
        content_type="movie",
        category_id="movies",
        stream_url="https://example.com/stream/test",
        is_active=True,
    )
    await content.insert()
    return content


@pytest_asyncio.fixture
async def sample_partner(db_client):
    """Create sample integration partner."""
    partner = IntegrationPartner(
        partner_id="test-partner-search",
        name="Test Search Partner",
        api_key_hash="$2b$12$test_hash_value_here_placeholder",
        api_key_prefix="test1234",
        contact_email="search@example.com",
        enabled_capabilities=["semantic_search"],
        billing_tier="standard",
    )
    await partner.insert()
    return partner


# ============================================
# Service Initialization Tests
# ============================================


@pytest.mark.asyncio
async def test_service_initialization(search_service, db_client):
    """Test search service can be instantiated."""
    assert search_service is not None


@pytest.mark.asyncio
@patch("app.services.olorin.search.client.client_manager.initialize")
async def test_service_initialize_success(mock_init, search_service, db_client):
    """Test service initialization succeeds."""
    mock_init.return_value = True
    result = await search_service.initialize()
    assert result is True


@pytest.mark.asyncio
@patch("app.services.olorin.search.client.client_manager.initialize")
async def test_service_initialize_failure(mock_init, search_service, db_client):
    """Test service initialization handles failure."""
    mock_init.return_value = False
    result = await search_service.initialize()
    assert result is False


# ============================================
# Embedding Generation Tests
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.generate_embedding")
async def test_generate_embedding(mock_embed, search_service, db_client):
    """Test embedding generation."""
    mock_vector = [0.1] * 1536  # OpenAI ada-002 dimension
    mock_embed.return_value = mock_vector

    result = await search_service.generate_embedding("test text")

    assert result is not None
    assert len(result) == 1536


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.generate_embedding")
async def test_generate_embedding_empty_text(mock_embed, search_service, db_client):
    """Test embedding generation with empty text."""
    mock_embed.return_value = None

    result = await search_service.generate_embedding("")

    assert result is None


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.generate_embedding")
async def test_generate_embedding_hebrew(mock_embed, search_service, db_client):
    """Test embedding generation with Hebrew text."""
    mock_vector = [0.2] * 1536
    mock_embed.return_value = mock_vector

    result = await search_service.generate_embedding("שלום עולם")

    assert result is not None
    assert len(result) == 1536


# ============================================
# Content Indexing Tests
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.index_content")
async def test_index_content_success(
    mock_index, search_service, sample_content, db_client
):
    """Test content indexing success."""
    mock_index.return_value = {
        "status": "indexed",
        "segments_indexed": 5,
    }

    result = await search_service.index_content(
        content_id=str(sample_content.id),
    )

    assert result["status"] == "indexed"
    assert result["segments_indexed"] == 5


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.index_content")
async def test_index_content_not_found(mock_index, search_service, db_client):
    """Test indexing non-existent content."""
    mock_index.return_value = {
        "status": "failed",
        "error": "Content not found",
    }

    result = await search_service.index_content(
        content_id="nonexistent-content",
    )

    assert result["status"] == "failed"


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.index_content")
async def test_index_content_force_reindex(
    mock_index, search_service, sample_content, db_client
):
    """Test force reindexing content."""
    mock_index.return_value = {
        "status": "reindexed",
        "segments_indexed": 10,
    }

    result = await search_service.index_content(
        content_id=str(sample_content.id),
        force_reindex=True,
    )

    mock_index.assert_called_once()
    assert result["status"] == "reindexed"


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.index_content")
async def test_index_content_with_partner(
    mock_index, search_service, sample_content, sample_partner, db_client
):
    """Test indexing with partner ID."""
    mock_index.return_value = {"status": "indexed", "segments_indexed": 3}

    result = await search_service.index_content(
        content_id=str(sample_content.id),
        partner_id=sample_partner.partner_id,
    )

    mock_index.assert_called_with(
        str(sample_content.id), False, sample_partner.partner_id
    )


# ============================================
# Subtitle Indexing Tests
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.index_subtitles")
async def test_index_subtitles(mock_index, search_service, sample_content, db_client):
    """Test subtitle indexing."""
    mock_index.return_value = {
        "status": "indexed",
        "segments_indexed": 20,
    }

    subtitles = [
        {"text": "שלום", "start_time": 0.0, "end_time": 2.0},
        {"text": "מה שלומך", "start_time": 2.0, "end_time": 4.0},
    ]

    result = await search_service.index_subtitles(
        content_id=str(sample_content.id),
        subtitles=subtitles,
        language="he",
    )

    assert result["status"] == "indexed"
    assert result["segments_indexed"] == 20


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.index_subtitles")
async def test_index_subtitles_custom_segment_duration(
    mock_index, search_service, sample_content, db_client
):
    """Test subtitle indexing with custom segment duration."""
    mock_index.return_value = {"status": "indexed", "segments_indexed": 10}

    subtitles = [{"text": "test", "start_time": 0.0, "end_time": 1.0}]

    await search_service.index_subtitles(
        content_id=str(sample_content.id),
        subtitles=subtitles,
        segment_duration=60.0,
    )

    mock_index.assert_called_with(str(sample_content.id), subtitles, "he", 60.0, None)


# ============================================
# Semantic Search Tests
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_semantic_search_basic(mock_search, search_service, db_client):
    """Test basic semantic search."""
    mock_results = [
        SemanticSearchResult(
            content_id="test-content-001",
            title="Test Movie",
            matched_text="matching text",
            match_type="title",
            relevance_score=0.95,
        )
    ]
    mock_search.return_value = mock_results

    query = SearchQuery(
        query="test query",
        language="he",
    )

    results = await search_service.semantic_search(query)

    assert len(results) == 1
    assert results[0].content_id == "test-content-001"
    assert results[0].relevance_score == 0.95


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_semantic_search_with_filters(mock_search, search_service, db_client):
    """Test semantic search with content type filter."""
    mock_search.return_value = []

    query = SearchQuery(
        query="drama",
        language="he",
        content_types=["movie", "series"],
    )

    results = await search_service.semantic_search(query)

    mock_search.assert_called_once()
    assert isinstance(results, list)


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_semantic_search_with_timestamps(mock_search, search_service, db_client):
    """Test semantic search with timestamp results."""
    mock_results = [
        SemanticSearchResult(
            content_id="test-content-001",
            title="Test Movie",
            matched_text="dialogue at this point",
            match_type="dialogue",
            relevance_score=0.88,
            timestamp_seconds=125.5,
            timestamp_formatted="02:05",
        )
    ]
    mock_search.return_value = mock_results

    query = SearchQuery(
        query="dialogue query",
        include_timestamps=True,
    )

    results = await search_service.semantic_search(query)

    assert len(results) == 1
    assert results[0].timestamp_seconds == 125.5
    assert results[0].timestamp_formatted == "02:05"


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_semantic_search_min_score_filter(mock_search, search_service, db_client):
    """Test search with minimum score filter."""
    mock_search.return_value = []

    query = SearchQuery(
        query="specific query",
        min_score=0.85,
    )

    await search_service.semantic_search(query)

    # Verify min_score was passed in query
    call_args = mock_search.call_args
    assert call_args[0][0].min_score == 0.85


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_semantic_search_pagination(mock_search, search_service, db_client):
    """Test search with limit."""
    mock_search.return_value = []

    query = SearchQuery(
        query="test",
        limit=10,
    )

    await search_service.semantic_search(query)

    call_args = mock_search.call_args
    assert call_args[0][0].limit == 10


# ============================================
# Dialogue Search Tests
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.dialogue_search", new_callable=AsyncMock)
async def test_dialogue_search_basic(mock_search, search_service, db_client):
    """Test basic dialogue search."""
    mock_results = [
        SemanticSearchResult(
            content_id="test-content-001",
            title="Test Movie",
            matched_text="שלום, מה נשמע",
            match_type="dialogue",
            relevance_score=0.92,
            timestamp_seconds=45.0,
        )
    ]
    mock_search.return_value = mock_results

    query = DialogueSearchQuery(
        query="שלום",
        language="he",
    )

    results = await search_service.dialogue_search(query)

    assert len(results) == 1
    assert results[0].match_type == "dialogue"
    assert results[0].timestamp_seconds == 45.0


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.dialogue_search", new_callable=AsyncMock)
async def test_dialogue_search_specific_content(
    mock_search, search_service, sample_content, db_client
):
    """Test dialogue search within specific content."""
    mock_search.return_value = []

    query = DialogueSearchQuery(
        query="quote",
        content_id=str(sample_content.id),
    )

    await search_service.dialogue_search(query)

    call_args = mock_search.call_args
    assert call_args[0][0].content_id == str(sample_content.id)


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.dialogue_search", new_callable=AsyncMock)
async def test_dialogue_search_with_partner(
    mock_search, search_service, sample_partner, db_client
):
    """Test dialogue search with partner ID for metering."""
    mock_search.return_value = []

    query = DialogueSearchQuery(query="test")

    await search_service.dialogue_search(
        query=query,
        partner_id=sample_partner.partner_id,
    )

    mock_search.assert_called_with(query, sample_partner.partner_id)


# ============================================
# Edge Cases and Error Handling
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_search_empty_results(mock_search, search_service, db_client):
    """Test handling of empty search results."""
    mock_search.return_value = []

    query = SearchQuery(query="nonexistent term xyz123")

    results = await search_service.semantic_search(query)

    assert results == []


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_search_many_results(mock_search, search_service, db_client):
    """Test handling of many search results."""
    mock_results = [
        SemanticSearchResult(
            content_id=f"content-{i}",
            title=f"Movie {i}",
            matched_text=f"Match {i}",
            match_type="title",
            relevance_score=0.9 - (i * 0.01),
        )
        for i in range(50)
    ]
    mock_search.return_value = mock_results

    query = SearchQuery(query="popular term", limit=100)

    results = await search_service.semantic_search(query)

    assert len(results) == 50


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.generate_embedding")
async def test_embedding_error_handling(mock_embed, search_service, db_client):
    """Test error handling in embedding generation."""
    mock_embed.side_effect = Exception("API error")

    with pytest.raises(Exception, match="API error"):
        await search_service.generate_embedding("test")


# ============================================
# Performance Tests
# ============================================


@pytest.mark.asyncio
@patch("app.services.olorin.search.service.semantic_search", new_callable=AsyncMock)
async def test_search_performance(mock_search, search_service, db_client):
    """Test search performance."""
    import time

    mock_search.return_value = []

    start = time.time()
    for _ in range(10):
        query = SearchQuery(query="test query")
        await search_service.semantic_search(query)
    duration = (time.time() - start) * 1000

    # 10 searches should complete in under 2 seconds (with mocks)
    assert duration < 2000, f"Searches took {duration}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

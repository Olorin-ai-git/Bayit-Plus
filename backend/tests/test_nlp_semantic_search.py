"""
Tests for NLP Semantic Search Service

Validates semantic search functionality using Claude for understanding and re-ranking.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.nlp.semantic_search import SemanticSearchService, SearchResults, SearchResult


@pytest.mark.asyncio
async def test_semantic_search_basic():
    """Test basic semantic search"""
    service = SemanticSearchService()

    # Mock Claude API response for filter generation
    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(
            type="text",
            text='{"section_ids": ["education", "science"], "topic_tags": ["educational", "science"]}'
        )
    ]

    # Mock database query results
    mock_content_items = [
        Mock(
            id="content1",
            title="Science for Kids",
            content_type="series",
            description="Educational science series",
            to_dict=lambda: {
                "id": "content1",
                "title": "Science for Kids",
                "content_type": "series",
                "description": "Educational science series"
            }
        ),
        Mock(
            id="content2",
            title="Physics Explained",
            content_type="series",
            description="Science education",
            to_dict=lambda: {
                "id": "content2",
                "title": "Physics Explained",
                "content_type": "series",
                "description": "Science education"
            }
        )
    ]

    # Mock re-ranking response
    mock_rerank_response = Mock()
    mock_rerank_response.content = [
        Mock(
            type="text",
            text='[{"content_id": "content1", "score": 0.95, "reason": "Perfect match for educational science"}, {"content_id": "content2", "score": 0.82, "reason": "Good match for science education"}]'
        )
    ]

    with patch.object(service.client.messages, 'create', side_effect=[mock_filter_response, mock_rerank_response]):
        with patch('app.services.nlp.semantic_search.Content') as MockContent:
            MockContent.find = AsyncMock(return_value=mock_content_items)

            results = await service.search("educational science content")

    assert results.total_found == 2
    assert len(results.results) == 2
    assert results.results[0].content_id == "content1"
    assert results.results[0].relevance_score == 0.95


@pytest.mark.asyncio
async def test_semantic_search_with_content_type():
    """Test semantic search with content type filter"""
    service = SemanticSearchService()

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(
            type="text",
            text='{"topic_tags": ["jewish", "holiday"]}'
        )
    ]

    mock_content_items = [
        Mock(
            id="content1",
            title="Hanukkah Songs",
            content_type="podcast",
            description="Jewish holiday music",
            to_dict=lambda: {
                "id": "content1",
                "title": "Hanukkah Songs",
                "content_type": "podcast",
                "description": "Jewish holiday music"
            }
        )
    ]

    mock_rerank_response = Mock()
    mock_rerank_response.content = [
        Mock(
            type="text",
            text='[{"content_id": "content1", "score": 0.98, "reason": "Exact match for jewish holiday podcast"}]'
        )
    ]

    with patch.object(service.client.messages, 'create', side_effect=[mock_filter_response, mock_rerank_response]):
        with patch('app.services.nlp.semantic_search.Content') as MockContent:
            MockContent.find = AsyncMock(return_value=mock_content_items)

            results = await service.search(
                "jewish holiday content",
                content_type="podcast",
                limit=10
            )

    assert results.total_found == 1
    assert results.results[0].content_type == "podcast"


@pytest.mark.asyncio
async def test_semantic_search_no_rerank():
    """Test semantic search without re-ranking"""
    service = SemanticSearchService()

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(
            type="text",
            text='{"topic_tags": ["kids"]}'
        )
    ]

    mock_content_items = [
        Mock(
            id="content1",
            title="Kids Show",
            content_type="series",
            description="For children",
            to_dict=lambda: {
                "id": "content1",
                "title": "Kids Show",
                "content_type": "series",
                "description": "For children"
            }
        )
    ]

    with patch.object(service.client.messages, 'create', return_value=mock_filter_response):
        with patch('app.services.nlp.semantic_search.Content') as MockContent:
            MockContent.find = AsyncMock(return_value=mock_content_items)

            results = await service.search(
                "kids content",
                rerank=False
            )

    assert results.total_found == 1
    # No re-ranking, so scores should be 1.0 (default)
    assert results.results[0].relevance_score == 1.0


@pytest.mark.asyncio
async def test_semantic_search_empty_results():
    """Test semantic search with no results"""
    service = SemanticSearchService()

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(
            type="text",
            text='{"topic_tags": ["nonexistent"]}'
        )
    ]

    with patch.object(service.client.messages, 'create', return_value=mock_filter_response):
        with patch('app.services.nlp.semantic_search.Content') as MockContent:
            MockContent.find = AsyncMock(return_value=[])

            results = await service.search("nonexistent content")

    assert results.total_found == 0
    assert len(results.results) == 0


@pytest.mark.asyncio
async def test_semantic_search_limit():
    """Test semantic search respects limit parameter"""
    service = SemanticSearchService()

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(
            type="text",
            text='{"topic_tags": ["popular"]}'
        )
    ]

    # Create 10 mock items
    mock_content_items = [
        Mock(
            id=f"content{i}",
            title=f"Title {i}",
            content_type="series",
            description=f"Description {i}",
            to_dict=lambda i=i: {
                "id": f"content{i}",
                "title": f"Title {i}",
                "content_type": "series",
                "description": f"Description {i}"
            }
        )
        for i in range(10)
    ]

    # Mock re-ranking to return only top 5
    mock_rerank_response = Mock()
    rerank_results = [
        f'{{"content_id": "content{i}", "score": {0.9 - i*0.1}, "reason": "Match {i}"}}'
        for i in range(5)
    ]
    mock_rerank_response.content = [
        Mock(
            type="text",
            text=f'[{", ".join(rerank_results)}]'
        )
    ]

    with patch.object(service.client.messages, 'create', side_effect=[mock_filter_response, mock_rerank_response]):
        with patch('app.services.nlp.semantic_search.Content') as MockContent:
            MockContent.find = AsyncMock(return_value=mock_content_items)

            results = await service.search(
                "popular content",
                limit=5
            )

    assert len(results.results) <= 5

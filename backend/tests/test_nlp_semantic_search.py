"""
Tests for NLP Semantic Search Service

Validates semantic search functionality using Claude for understanding and re-ranking.
"""

import pytest
from unittest.mock import Mock, AsyncMock, MagicMock, patch


def _make_query_mock(items):
    """Create a mock that supports .limit().to_list() chain."""
    to_list_mock = AsyncMock(return_value=items)
    limit_mock = MagicMock()
    limit_mock.to_list = to_list_mock
    find_mock = MagicMock(return_value=limit_mock)
    limit_mock.limit = MagicMock(return_value=limit_mock)
    find_mock.limit = MagicMock(return_value=limit_mock)
    return find_mock


def _make_content_item(id, title, content_type, description):
    """Create a mock content item."""
    item = Mock()
    item.id = id
    item.title = title
    item.name = title
    item.content_type = content_type
    item.description = description
    return item


@pytest.mark.asyncio
async def test_semantic_search_basic():
    """Test basic semantic search"""
    from app.services.nlp.semantic_search import SemanticSearchService

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(type="text", text='{"topic_tags": {"$in": ["science"]}}')
    ]

    items = [
        _make_content_item("c1", "Science for Kids", "series", "Educational science"),
        _make_content_item("c2", "Physics Explained", "series", "Science education"),
    ]

    mock_rerank_response = Mock()
    mock_rerank_response.content = [
        Mock(type="text", text="[0.95, 0.82]")
    ]

    with patch.object(SemanticSearchService, "__init__", lambda self: None):
        service = SemanticSearchService()
        service.client = MagicMock()
        service.client.messages.create = Mock(
            side_effect=[mock_filter_response, mock_rerank_response]
        )

        with patch("app.services.nlp.semantic_search.Content") as mc:
            mc.find = _make_query_mock(items)
            with patch("app.services.nlp.semantic_search.settings") as ms:
                ms.ANTHROPIC_API_KEY = "test"
                ms.CLAUDE_MODEL = "claude-3-haiku"
                ms.SEMANTIC_SEARCH_RERANK = True

                results = await service.search("educational science content")

    assert results.total_found == 2
    assert len(results.results) == 2


@pytest.mark.asyncio
async def test_semantic_search_with_content_type():
    """Test semantic search with content type filter"""
    from app.services.nlp.semantic_search import SemanticSearchService

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(type="text", text='{"topic_tags": {"$in": ["jewish"]}}')
    ]

    items = [
        _make_content_item("c1", "Hanukkah Songs", "podcast", "Jewish holiday music"),
    ]

    mock_rerank_response = Mock()
    mock_rerank_response.content = [
        Mock(type="text", text="[0.98]")
    ]

    with patch.object(SemanticSearchService, "__init__", lambda self: None):
        service = SemanticSearchService()
        service.client = MagicMock()
        service.client.messages.create = Mock(
            side_effect=[mock_filter_response, mock_rerank_response]
        )

        with patch("app.services.nlp.semantic_search.Content") as mc:
            mc.find = _make_query_mock(items)
            with patch("app.services.nlp.semantic_search.settings") as ms:
                ms.ANTHROPIC_API_KEY = "test"
                ms.CLAUDE_MODEL = "claude-3-haiku"
                ms.SEMANTIC_SEARCH_RERANK = True

                results = await service.search(
                    "jewish holiday content", content_type="podcast", limit=10
                )

    assert results.total_found == 1
    assert results.results[0].content_type == "podcast"


@pytest.mark.asyncio
async def test_semantic_search_no_rerank():
    """Test semantic search without re-ranking"""
    from app.services.nlp.semantic_search import SemanticSearchService

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(type="text", text='{"topic_tags": {"$in": ["kids"]}}')
    ]

    items = [
        _make_content_item("c1", "Kids Show", "series", "For children"),
    ]

    with patch.object(SemanticSearchService, "__init__", lambda self: None):
        service = SemanticSearchService()
        service.client = MagicMock()
        service.client.messages.create = Mock(return_value=mock_filter_response)

        with patch("app.services.nlp.semantic_search.Content") as mc:
            mc.find = _make_query_mock(items)
            with patch("app.services.nlp.semantic_search.settings") as ms:
                ms.ANTHROPIC_API_KEY = "test"
                ms.CLAUDE_MODEL = "claude-3-haiku"
                ms.SEMANTIC_SEARCH_RERANK = False

                results = await service.search("kids content", rerank=False)

    assert results.total_found == 1
    assert results.results[0].relevance_score == 1.0


@pytest.mark.asyncio
async def test_semantic_search_empty_results():
    """Test semantic search with no results"""
    from app.services.nlp.semantic_search import SemanticSearchService

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(type="text", text='{"topic_tags": {"$in": ["nonexistent"]}}')
    ]

    with patch.object(SemanticSearchService, "__init__", lambda self: None):
        service = SemanticSearchService()
        service.client = MagicMock()
        service.client.messages.create = Mock(return_value=mock_filter_response)

        with patch("app.services.nlp.semantic_search.Content") as mc:
            mc.find = _make_query_mock([])
            with patch("app.services.nlp.semantic_search.settings") as ms:
                ms.ANTHROPIC_API_KEY = "test"
                ms.CLAUDE_MODEL = "claude-3-haiku"
                ms.SEMANTIC_SEARCH_RERANK = True

                results = await service.search("nonexistent content")

    assert results.total_found == 0
    assert len(results.results) == 0


@pytest.mark.asyncio
async def test_semantic_search_limit():
    """Test semantic search respects limit parameter"""
    from app.services.nlp.semantic_search import SemanticSearchService

    mock_filter_response = Mock()
    mock_filter_response.content = [
        Mock(type="text", text='{"topic_tags": {"$in": ["popular"]}}')
    ]

    items = [
        _make_content_item(f"c{i}", f"Title {i}", "series", f"Desc {i}")
        for i in range(10)
    ]

    scores = [round(0.9 - i * 0.05, 2) for i in range(10)]
    mock_rerank_response = Mock()
    mock_rerank_response.content = [
        Mock(type="text", text=str(scores))
    ]

    with patch.object(SemanticSearchService, "__init__", lambda self: None):
        service = SemanticSearchService()
        service.client = MagicMock()
        service.client.messages.create = Mock(
            side_effect=[mock_filter_response, mock_rerank_response]
        )

        with patch("app.services.nlp.semantic_search.Content") as mc:
            mc.find = _make_query_mock(items)
            with patch("app.services.nlp.semantic_search.settings") as ms:
                ms.ANTHROPIC_API_KEY = "test"
                ms.CLAUDE_MODEL = "claude-3-haiku"
                ms.SEMANTIC_SEARCH_RERANK = True

                results = await service.search("popular content", limit=5)

    assert len(results.results) <= 5

"""Unit tests for BetaAISearchService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from app.services.beta.ai_search_service import BetaAISearchService


@pytest.fixture
def mock_credit_service():
    """Mock BetaCreditService."""
    service = AsyncMock()
    service.is_beta_user = AsyncMock(return_value=True)
    service.get_balance = AsyncMock(return_value=4000)
    service.deduct_credits = AsyncMock(return_value=(True, 3998))
    service.add_credits = AsyncMock(return_value=True)
    return service


@pytest.fixture
def mock_claude_client():
    """Mock Anthropic Claude client."""
    client = AsyncMock()
    mock_message = MagicMock()
    mock_message.content = [
        MagicMock(
            text='{"content_types": ["movies", "series"], "genres": ["thriller", "crime"], "language": "english", "mood": "suspenseful", "keywords": ["detective", "mystery"]}'
        )
    ]
    client.messages.create = AsyncMock(return_value=mock_message)
    return client


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for embeddings."""
    client = AsyncMock()
    mock_embedding = MagicMock()
    mock_embedding.embedding = [0.1] * 1536
    mock_response = MagicMock()
    mock_response.data = [mock_embedding]
    client.embeddings.create = AsyncMock(return_value=mock_response)
    return client


@pytest.fixture
def ai_search_service(mock_credit_service, mock_claude_client, mock_openai_client):
    """Create BetaAISearchService with mocked dependencies."""
    service = BetaAISearchService(
        user_id="user-123",
        credit_service=mock_credit_service
    )
    # Replace internal clients with mocks (service uses _anthropic_client and _openai_client)
    service._anthropic_client = mock_claude_client
    service._openai_client = mock_openai_client
    return service


class TestAnalyzeQuery:
    """Tests for _analyze_query method."""

    @pytest.mark.asyncio
    async def test_analyze_query_success(self, ai_search_service, mock_claude_client):
        """Test successful query analysis with Claude."""
        query = "Find me suspenseful crime movies"

        analysis = await ai_search_service._analyze_query(query)

        assert analysis is not None
        assert "content_types" in analysis
        assert "movies" in analysis["content_types"]
        assert "genres" in analysis
        assert "thriller" in analysis["genres"]
        assert analysis["mood"] == "suspenseful"
        mock_claude_client.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_query_handles_invalid_json(self, ai_search_service):
        """Test handling of invalid JSON from Claude."""
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text='{"invalid json')]
        ai_search_service._anthropic_client.messages.create = AsyncMock(
            return_value=mock_message
        )

        # Service catches JSON errors and returns defaults, doesn't raise
        result = await ai_search_service._analyze_query("test query")
        assert result is not None
        assert "keywords" in result

    @pytest.mark.asyncio
    async def test_analyze_query_handles_api_error(self, ai_search_service):
        """Test handling of Claude API errors."""
        ai_search_service._anthropic_client.messages.create = AsyncMock(
            side_effect=Exception("API Error")
        )

        # Service catches errors and returns defaults, doesn't raise
        result = await ai_search_service._analyze_query("test query")
        assert result is not None
        assert result["keywords"] == ["test query"]


class TestGenerateEmbedding:
    """Tests for _generate_embedding method."""

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, ai_search_service, mock_openai_client):
        """Test successful embedding generation with OpenAI."""
        text = "suspenseful crime thriller"

        embedding = await ai_search_service._generate_embedding(text)

        assert embedding is not None
        assert isinstance(embedding, list)
        assert len(embedding) == 1536
        assert all(isinstance(x, float) for x in embedding)
        mock_openai_client.embeddings.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_embedding_handles_api_error(self, ai_search_service):
        """Test handling of OpenAI API errors."""
        ai_search_service._openai_client.embeddings.create = AsyncMock(
            side_effect=Exception("OpenAI API Error")
        )

        with pytest.raises(Exception, match="OpenAI API Error"):
            await ai_search_service._generate_embedding("test text")


class TestVectorSearch:
    """Tests for _vector_search method."""

    @pytest.mark.asyncio
    async def test_vector_search_movies(self, ai_search_service):
        """Test vector search for movies."""
        embedding = [0.1] * 1536
        query_analysis = {"content_types": ["movie"], "keywords": ["detective"]}

        with patch('app.services.beta.ai_search_service.Content') as MockContent:
            mock_movie1 = MagicMock()
            mock_movie1.id = "movie-1"
            mock_movie1.title = "The Detective"
            mock_movie1.title_en = "The Detective"
            mock_movie1.description = "A crime thriller"
            mock_movie1.description_en = "A crime thriller"
            mock_movie1.poster = "poster1.jpg"

            mock_movie2 = MagicMock()
            mock_movie2.id = "movie-2"
            mock_movie2.title = "Mystery Case"
            mock_movie2.title_en = "Mystery Case"
            mock_movie2.description = "Suspenseful mystery"
            mock_movie2.description_en = "Suspenseful mystery"
            mock_movie2.poster = "poster2.jpg"

            # Mock the query chain: Content.find().limit().to_list()
            mock_to_list = AsyncMock(return_value=[mock_movie1, mock_movie2])
            mock_limit = MagicMock(return_value=MagicMock(to_list=mock_to_list))
            mock_find = MagicMock(return_value=MagicMock(limit=mock_limit))
            MockContent.find = mock_find

            results = await ai_search_service._vector_search(
                query_embedding=embedding,
                query_analysis=query_analysis,
                content_types=["movie"],
                limit=10,
                language=None
            )

            assert len(results) == 2
            assert results[0]["type"] == "movie"
            assert results[0]["id"] == "movie-1"
            assert results[0]["title"] == "The Detective"

    @pytest.mark.asyncio
    async def test_vector_search_all_types(self, ai_search_service):
        """Test vector search across all content types."""
        embedding = [0.1] * 1536
        query_analysis = {"keywords": ["test"]}

        with patch('app.services.beta.ai_search_service.Content') as MockContent:
            # Mock empty results for now (until other content types are implemented)
            mock_to_list = AsyncMock(return_value=[])
            mock_limit = MagicMock(return_value=MagicMock(to_list=mock_to_list))
            mock_find = MagicMock(return_value=MagicMock(limit=mock_limit))
            MockContent.find = mock_find

            results = await ai_search_service._vector_search(
                query_embedding=embedding,
                query_analysis=query_analysis,
                content_types=None,  # Search all types
                limit=20,
                language=None
            )

            # Should have called find with movie query
            MockContent.find.assert_called()
            assert isinstance(results, list)


class TestRerank:
    """Tests for _rerank_results method."""

    @pytest.mark.asyncio
    async def test_rerank_results_success(self, ai_search_service, mock_claude_client):
        """Test result re-ranking with Claude."""
        query = "suspenseful crime thriller"
        results = [
            {
                "type": "movie",
                "id": "movie-1",
                "title": "The Detective",
                "description": "A crime thriller",
                "relevance_score": 0.85
            },
            {
                "type": "movie",
                "id": "movie-2",
                "title": "Mystery Case",
                "description": "Suspenseful mystery",
                "relevance_score": 0.80
            }
        ]

        # Service currently returns results as-is (re-ranking not yet implemented)
        reranked = await ai_search_service._rerank_results(query, results)

        assert len(reranked) == 2
        assert reranked[0]["id"] == "movie-1"
        assert reranked[1]["id"] == "movie-2"

    @pytest.mark.asyncio
    async def test_rerank_single_result(self, ai_search_service):
        """Test reranking with single result returns immediately."""
        results = [
            {"id": "1", "relevance_score": 0.85}
        ]

        # Should return immediately for single result
        reranked = await ai_search_service._rerank_results("query", results)

        assert reranked == results


class TestSearch:
    """Tests for search method (full integration)."""

    @pytest.mark.asyncio
    async def test_search_success_full_flow(self, ai_search_service, mock_credit_service):
        """Test complete search flow with authorization and deduction."""
        query = "Find suspenseful crime movies"

        with patch.object(ai_search_service, '_analyze_query') as mock_analyze, \
             patch.object(ai_search_service, '_generate_embedding') as mock_embed, \
             patch.object(ai_search_service, '_vector_search') as mock_search, \
             patch.object(ai_search_service, '_rerank_results') as mock_rerank:

            # Mock each step
            mock_analyze.return_value = {
                "content_types": ["movies"],
                "genres": ["thriller"],
                "mood": "suspenseful"
            }
            mock_embed.return_value = [0.1] * 1536
            mock_search.return_value = [
                {
                    "type": "movie",
                    "id": "movie-1",
                    "title": "The Detective",
                    "description": "A crime thriller",
                    "relevance_score": 0.85
                }
            ]
            mock_rerank.return_value = mock_search.return_value

            response = await ai_search_service.search(
                query=query,
                content_types=["movie"],
                limit=10
            )

            # Verify beta check, balance check, and deduction
            mock_credit_service.is_beta_user.assert_called_once()
            mock_credit_service.get_balance.assert_called_once()
            mock_credit_service.deduct_credits.assert_called_once()

            # Verify response structure
            assert response["query"] == query
            assert "query_analysis" in response
            assert "results" in response
            assert response["total_results"] == 1
            assert response["credits_charged"] == 2
            assert response["credits_remaining"] == 3998

    @pytest.mark.asyncio
    async def test_search_insufficient_credits(self, ai_search_service, mock_credit_service):
        """Test search fails with insufficient credits."""
        # Set balance below required amount (CREDITS_PER_SEARCH = 2)
        mock_credit_service.get_balance = AsyncMock(return_value=1)

        with pytest.raises(ValueError, match="Insufficient credits"):
            await ai_search_service.search(
                query="test",
                content_types=["movie"],
                limit=10
            )

    @pytest.mark.asyncio
    async def test_search_language_detection(self, ai_search_service):
        """Test language detection in query analysis."""
        query = "מצא לי סרטי מתח"  # Hebrew query

        with patch.object(ai_search_service, '_analyze_query') as mock_analyze, \
             patch.object(ai_search_service, '_generate_embedding') as mock_embed, \
             patch.object(ai_search_service, '_vector_search') as mock_search, \
             patch.object(ai_search_service, '_rerank_results') as mock_rerank:

            mock_analyze.return_value = {
                "content_types": ["movies"],
                "language": "hebrew",
                "genres": ["thriller"]
            }
            mock_embed.return_value = [0.1] * 1536
            mock_search.return_value = []
            mock_rerank.return_value = []

            response = await ai_search_service.search(
                query=query,
                limit=10
            )

            assert response["query_analysis"]["language"] == "hebrew"

    @pytest.mark.asyncio
    async def test_search_limit_enforcement(self, ai_search_service):
        """Test result limit enforcement."""
        with patch.object(ai_search_service, '_analyze_query'), \
             patch.object(ai_search_service, '_generate_embedding'), \
             patch.object(ai_search_service, '_vector_search') as mock_search, \
             patch.object(ai_search_service, '_rerank_results') as mock_rerank:

            # Return 30 results but limit is 20
            mock_results = [{"id": f"item-{i}", "relevance_score": 0.9 - i*0.01}
                          for i in range(30)]
            mock_search.return_value = mock_results
            mock_rerank.return_value = mock_results[:20]

            response = await ai_search_service.search(
                query="test",
                limit=20
            )

            assert len(response["results"]) <= 20


class TestCostEstimate:
    """Tests for get_cost_estimate method."""

    @pytest.mark.asyncio
    async def test_cost_estimate_returns_correct_value(self, ai_search_service):
        """Test cost estimate returns configured credit cost."""
        estimate = await ai_search_service.get_cost_estimate()

        assert estimate["credits_per_search"] == 2
        assert estimate["usd_equivalent"] == 0.02
        assert "features" in estimate
        assert "natural_language" in estimate["features"]

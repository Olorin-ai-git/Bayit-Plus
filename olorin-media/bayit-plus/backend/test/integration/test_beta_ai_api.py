"""Integration tests for Beta 500 AI API endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_beta_user():
    """Mock authenticated Beta user."""
    user = MagicMock()
    user.id = "user-123"
    user.email = "beta@example.com"
    user.status = "active"
    return user


@pytest.fixture
def mock_beta_credit():
    """Mock user's Beta credits."""
    credit = MagicMock()
    credit.user_id = "user-123"
    credit.remaining_credits = 4000
    credit.is_expired = False
    return credit


class TestAISearchAPI:
    """Integration tests for POST /api/v1/beta/search endpoint."""

    @pytest.mark.asyncio
    async def test_search_success(self, client):
        """Test successful AI search request."""
        with patch('app.api.routes.beta.ai_search.create_ai_search_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.search = AsyncMock(return_value={
                "query": "suspenseful crime movies",
                "query_analysis": {
                    "content_types": ["movies"],
                    "genres": ["thriller", "crime"],
                    "mood": "suspenseful"
                },
                "results": [
                    {
                        "type": "movie",
                        "id": "movie-1",
                        "title": "The Detective",
                        "description": "A gripping crime thriller",
                        "poster": "poster1.jpg",
                        "relevance_score": 0.92
                    }
                ],
                "total_results": 1,
                "credits_charged": 2,
                "credits_remaining": 3998
            })
            mock_factory.return_value = mock_service

            response = client.post(
                "/api/v1/beta/search",
                json={
                    "query": "suspenseful crime movies",
                    "content_types": ["movies"],
                    "limit": 10
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["query"] == "suspenseful crime movies"
            assert "query_analysis" in data
            assert len(data["results"]) == 1
            assert data["results"][0]["relevance_score"] == 0.92
            assert data["credits_charged"] == 2

    @pytest.mark.asyncio
    async def test_search_missing_query(self, client):
        """Test search with missing query parameter."""
        response = client.post(
            "/api/v1/beta/search",
            json={
                "content_types": ["movies"],
                "limit": 10
            }
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_search_insufficient_credits(self, client):
        """Test search with insufficient credits."""
        with patch('app.api.routes.beta.ai_search.create_ai_search_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.search = AsyncMock(
                side_effect=ValueError("Insufficient credits for AI search")
            )
            mock_factory.return_value = mock_service

            response = client.post(
                "/api/v1/beta/search",
                json={
                    "query": "test query",
                    "limit": 10
                }
            )

            assert response.status_code == 400
            assert "insufficient credits" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_search_language_parameter(self, client):
        """Test search with language filter."""
        with patch('app.api.routes.beta.ai_search.create_ai_search_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.search = AsyncMock(return_value={
                "query": "מצא סרטים",
                "query_analysis": {"language": "hebrew"},
                "results": [],
                "total_results": 0,
                "credits_charged": 2,
                "credits_remaining": 3998
            })
            mock_factory.return_value = mock_service

            response = client.post(
                "/api/v1/beta/search",
                json={
                    "query": "מצא סרטים",
                    "language": "hebrew",
                    "limit": 10
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["query_analysis"]["language"] == "hebrew"

    @pytest.mark.asyncio
    async def test_search_limit_validation(self, client):
        """Test search limit validation."""
        with patch('app.api.routes.beta.ai_search.create_ai_search_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.search = AsyncMock(return_value={
                "query": "test",
                "query_analysis": {},
                "results": [],
                "total_results": 0,
                "credits_charged": 2,
                "credits_remaining": 3998
            })
            mock_factory.return_value = mock_service

            # Valid limit
            response = client.post(
                "/api/v1/beta/search",
                json={"query": "test", "limit": 50}
            )
            assert response.status_code == 200

            # Invalid limit (too high)
            response = client.post(
                "/api/v1/beta/search",
                json={"query": "test", "limit": 200}
            )
            assert response.status_code == 422


class TestAISearchCostEstimate:
    """Tests for GET /api/v1/beta/search/cost-estimate endpoint."""

    @pytest.mark.asyncio
    async def test_cost_estimate_success(self, client):
        """Test cost estimate retrieval."""
        with patch('app.api.routes.beta.ai_search.BetaAISearchService') as MockService:
            mock_instance = AsyncMock()
            mock_instance.get_cost_estimate = AsyncMock(return_value={
                "credits_per_search": 2,
                "usd_equivalent": 0.02,
                "features": [
                    "Natural language understanding",
                    "Vector similarity search",
                    "Multi-language support"
                ]
            })
            MockService.return_value = mock_instance

            response = client.get("/api/v1/beta/search/cost-estimate")

            assert response.status_code == 200
            data = response.json()
            assert data["credits_per_search"] == 2
            assert data["usd_equivalent"] == 0.02


class TestAIRecommendationsAPI:
    """Integration tests for GET /api/v1/beta/recommendations endpoint."""

    @pytest.mark.asyncio
    async def test_recommendations_success(self, client):
        """Test successful recommendations request."""
        with patch('app.api.routes.beta.ai_recommendations.create_ai_recommendations_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.get_recommendations = AsyncMock(return_value={
                "user_profile": {
                    "favorite_genres": ["thriller", "crime"],
                    "preferred_languages": ["english"],
                    "content_types_watched": ["movies", "series"]
                },
                "recommendations": [
                    {
                        "type": "movie",
                        "id": "movie-1",
                        "title": "New Thriller",
                        "description": "Exciting thriller",
                        "poster": "poster.jpg",
                        "match_score": 0.92,
                        "explanation": "Perfect match for your taste in thrillers"
                    }
                ],
                "total_recommendations": 1,
                "credits_charged": 3,
                "credits_remaining": 3997
            })
            mock_factory.return_value = mock_service

            response = client.get(
                "/api/v1/beta/recommendations",
                params={
                    "content_type": "movies",
                    "limit": 10,
                    "context": "Looking for something exciting"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "user_profile" in data
            assert len(data["recommendations"]) == 1
            assert data["recommendations"][0]["match_score"] == 0.92
            assert "explanation" in data["recommendations"][0]
            assert data["credits_charged"] == 3

    @pytest.mark.asyncio
    async def test_recommendations_no_parameters(self, client):
        """Test recommendations with no filtering parameters."""
        with patch('app.api.routes.beta.ai_recommendations.create_ai_recommendations_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.get_recommendations = AsyncMock(return_value={
                "user_profile": {},
                "recommendations": [],
                "total_recommendations": 0,
                "credits_charged": 3,
                "credits_remaining": 3997
            })
            mock_factory.return_value = mock_service

            response = client.get("/api/v1/beta/recommendations")

            assert response.status_code == 200
            data = response.json()
            assert "recommendations" in data

    @pytest.mark.asyncio
    async def test_recommendations_insufficient_credits(self, client):
        """Test recommendations with insufficient credits."""
        with patch('app.api.routes.beta.ai_recommendations.create_ai_recommendations_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.get_recommendations = AsyncMock(
                side_effect=ValueError("Insufficient credits for recommendations")
            )
            mock_factory.return_value = mock_service

            response = client.get(
                "/api/v1/beta/recommendations",
                params={"content_type": "movies", "limit": 10}
            )

            assert response.status_code == 400
            assert "insufficient credits" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_recommendations_content_type_filter(self, client):
        """Test recommendations with content type filtering."""
        with patch('app.api.routes.beta.ai_recommendations.create_ai_recommendations_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.get_recommendations = AsyncMock(return_value={
                "user_profile": {},
                "recommendations": [
                    {"type": "podcast", "id": "pod-1", "match_score": 0.85}
                ],
                "total_recommendations": 1,
                "credits_charged": 3,
                "credits_remaining": 3997
            })
            mock_factory.return_value = mock_service

            response = client.get(
                "/api/v1/beta/recommendations",
                params={"content_type": "podcasts"}
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data["recommendations"]) == 1
            assert data["recommendations"][0]["type"] == "podcast"

    @pytest.mark.asyncio
    async def test_recommendations_with_context(self, client):
        """Test recommendations with user context."""
        with patch('app.api.routes.beta.ai_recommendations.create_ai_recommendations_service') as mock_factory:
            mock_service = AsyncMock()
            mock_service.get_recommendations = AsyncMock(return_value={
                "user_profile": {},
                "recommendations": [
                    {
                        "type": "movie",
                        "id": "movie-1",
                        "match_score": 0.88,
                        "explanation": "Perfect for a cozy evening"
                    }
                ],
                "total_recommendations": 1,
                "credits_charged": 3,
                "credits_remaining": 3997
            })
            mock_factory.return_value = mock_service

            response = client.get(
                "/api/v1/beta/recommendations",
                params={
                    "content_type": "movies",
                    "context": "Something for a cozy evening"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "cozy evening" in data["recommendations"][0]["explanation"].lower()


class TestAIRecommendationsCostEstimate:
    """Tests for GET /api/v1/beta/recommendations/cost-estimate endpoint."""

    @pytest.mark.asyncio
    async def test_cost_estimate_success(self, client):
        """Test cost estimate retrieval."""
        with patch('app.api.routes.beta.ai_recommendations.BetaAIRecommendationsService') as MockService:
            mock_instance = AsyncMock()
            mock_instance.get_cost_estimate = AsyncMock(return_value={
                "credits_per_request": 3,
                "usd_equivalent": 0.03,
                "features": [
                    "Personalized recommendations",
                    "Match score calculation",
                    "Detailed explanations"
                ]
            })
            MockService.return_value = mock_instance

            response = client.get("/api/v1/beta/recommendations/cost-estimate")

            assert response.status_code == 200
            data = response.json()
            assert data["credits_per_request"] == 3
            assert data["usd_equivalent"] == 0.03


class TestCrossFeatureIntegration:
    """Tests for cross-feature integration scenarios."""

    @pytest.mark.asyncio
    async def test_search_then_recommendations(self, client):
        """Test using search followed by recommendations."""
        with patch('app.api.routes.beta.ai_search.create_ai_search_service') as search_factory, \
             patch('app.api.routes.beta.ai_recommendations.create_ai_recommendations_service') as rec_factory:

            # Mock search service
            mock_search = AsyncMock()
            mock_search.search = AsyncMock(return_value={
                "query": "thrillers",
                "query_analysis": {},
                "results": [],
                "total_results": 0,
                "credits_charged": 2,
                "credits_remaining": 3998
            })
            search_factory.return_value = mock_search

            # Mock recommendations service
            mock_rec = AsyncMock()
            mock_rec.get_recommendations = AsyncMock(return_value={
                "user_profile": {},
                "recommendations": [],
                "total_recommendations": 0,
                "credits_charged": 3,
                "credits_remaining": 3995
            })
            rec_factory.return_value = mock_rec

            # First search
            search_response = client.post(
                "/api/v1/beta/search",
                json={"query": "thrillers", "limit": 10}
            )
            assert search_response.status_code == 200
            assert search_response.json()["credits_remaining"] == 3998

            # Then recommendations
            rec_response = client.get(
                "/api/v1/beta/recommendations",
                params={"content_type": "movies", "limit": 10}
            )
            assert rec_response.status_code == 200
            assert rec_response.json()["credits_remaining"] == 3995

    @pytest.mark.asyncio
    async def test_credit_depletion_across_features(self, client):
        """Test credit depletion across multiple AI features."""
        with patch('app.api.routes.beta.ai_search.create_ai_search_service') as search_factory:
            mock_search = AsyncMock()
            # First call succeeds with low balance
            mock_search.search = AsyncMock(return_value={
                "query": "test",
                "query_analysis": {},
                "results": [],
                "total_results": 0,
                "credits_charged": 2,
                "credits_remaining": 1  # Very low
            })
            search_factory.return_value = mock_search

            # First search succeeds
            response1 = client.post(
                "/api/v1/beta/search",
                json={"query": "test", "limit": 10}
            )
            assert response1.status_code == 200
            assert response1.json()["credits_remaining"] == 1

            # Second search fails (insufficient credits)
            mock_search.search = AsyncMock(
                side_effect=ValueError("Insufficient credits")
            )

            response2 = client.post(
                "/api/v1/beta/search",
                json={"query": "another test", "limit": 10}
            )
            assert response2.status_code == 400

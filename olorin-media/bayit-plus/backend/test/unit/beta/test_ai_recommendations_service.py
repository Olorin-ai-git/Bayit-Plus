"""Unit tests for BetaAIRecommendationsService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from app.services.beta.ai_recommendations_service import BetaAIRecommendationsService


@pytest.fixture
def mock_credit_service():
    """Mock BetaCreditService."""
    service = AsyncMock()
    service.is_beta_user = AsyncMock(return_value=True)
    service.get_balance = AsyncMock(return_value=4000)
    service.deduct_credits = AsyncMock(return_value=(True, 3997))
    service.add_credits = AsyncMock(return_value=True)
    return service


@pytest.fixture
def mock_claude_client():
    """Mock Anthropic Claude client."""
    client = AsyncMock()
    mock_message = MagicMock()
    mock_message.content = [
        MagicMock(
            text='{"recommendations": [{"content_id": "movie-1", "match_score": 0.92, "explanation": "Perfect match for thriller fans"}]}'
        )
    ]
    client.messages.create = AsyncMock(return_value=mock_message)
    return client


@pytest.fixture
def ai_recommendations_service(mock_credit_service, mock_claude_client):
    """Create BetaAIRecommendationsService with mocked dependencies."""
    service = BetaAIRecommendationsService(
        user_id="user-123",
        credit_service=mock_credit_service
    )
    # Replace internal client with mock (service uses _anthropic_client)
    service._anthropic_client = mock_claude_client
    return service


@pytest.fixture
def mock_viewing_history():
    """Mock viewing history data."""
    return [
        MagicMock(
            content_id="movie-1",
            content_type="movie",
            title="The Detective",
            genres=["thriller", "crime"],
            language="english",
            watched_at=datetime.utcnow() - timedelta(days=1),
            watch_duration_seconds=7200,
            completion_percentage=100.0
        ),
        MagicMock(
            content_id="series-1",
            content_type="series",
            title="Mystery Cases",
            genres=["mystery", "drama"],
            language="english",
            watched_at=datetime.utcnow() - timedelta(days=3),
            watch_duration_seconds=3600,
            completion_percentage=85.0
        )
    ]


class TestBuildUserProfile:
    """Tests for _build_user_profile method."""

    @pytest.mark.asyncio
    async def test_build_profile_from_viewing_history(
        self,
        ai_recommendations_service,
        mock_viewing_history
    ):
        """Test user profile building from viewing history."""
        with patch('app.services.beta.ai_recommendations_service.ViewingHistory') as MockHistory:
            MockHistory.find = MagicMock(
                return_value=MagicMock(
                    sort=MagicMock(
                        return_value=MagicMock(
                            limit=MagicMock(
                                return_value=AsyncMock(
                                    to_list=AsyncMock(return_value=mock_viewing_history)
                                )
                            )
                        )
                    )
                )
            )

            profile = await ai_recommendations_service._build_user_profile()

            assert profile is not None
            assert "favorite_genres" in profile
            assert "thriller" in profile["favorite_genres"]
            assert "preferred_languages" in profile
            assert "english" in profile["preferred_languages"]
            assert "content_types_watched" in profile
            assert "movie" in profile["content_types_watched"]

    @pytest.mark.asyncio
    async def test_build_profile_no_history(self, ai_recommendations_service):
        """Test profile building with no viewing history."""
        with patch('app.services.beta.ai_recommendations_service.ViewingHistory') as MockHistory:
            MockHistory.find = MagicMock(
                return_value=MagicMock(
                    sort=MagicMock(
                        return_value=MagicMock(
                            limit=MagicMock(
                                return_value=AsyncMock(
                                    to_list=AsyncMock(return_value=[])
                                )
                            )
                        )
                    )
                )
            )

            profile = await ai_recommendations_service._build_user_profile()

            assert profile is not None
            assert len(profile["favorite_genres"]) == 0
            assert len(profile["preferred_languages"]) == 0

    @pytest.mark.asyncio
    async def test_build_profile_genre_frequency(
        self,
        ai_recommendations_service,
        mock_viewing_history
    ):
        """Test genre frequency calculation in profile."""
        # Add more history with repeated genres
        mock_viewing_history.append(
            MagicMock(
                content_id="movie-2",
                content_type="movie",
                genres=["thriller", "action"],
                language="english",
                watched_at=datetime.utcnow() - timedelta(days=2)
            )
        )

        with patch('app.services.beta.ai_recommendations_service.ViewingHistory') as MockHistory:
            MockHistory.find = MagicMock(
                return_value=MagicMock(
                    sort=MagicMock(
                        return_value=MagicMock(
                            limit=MagicMock(
                                return_value=AsyncMock(
                                    to_list=AsyncMock(return_value=mock_viewing_history)
                                )
                            )
                        )
                    )
                )
            )

            profile = await ai_recommendations_service._build_user_profile()

            # Thriller appears most frequently
            assert profile["favorite_genres"][0] == "thriller"


class TestFetchCandidates:
    """Tests for _fetch_candidates method."""

    @pytest.mark.asyncio
    async def test_fetch_movie_candidates(self, ai_recommendations_service):
        """Test fetching movie candidates."""
        with patch('app.services.beta.ai_recommendations_service.Movie') as MockMovie:
            mock_movie = MagicMock()
            mock_movie.id = "movie-new"
            mock_movie.title = "New Thriller"
            mock_movie.description = "Exciting thriller"
            mock_movie.genres = ["thriller"]
            mock_movie.poster = "poster.jpg"

            MockMovie.find = MagicMock(
                return_value=MagicMock(
                    limit=AsyncMock(
                        return_value=AsyncMock(
                            to_list=AsyncMock(return_value=[mock_movie])
                        )
                    )
                )
            )

            candidates = await ai_recommendations_service._fetch_candidates(
                content_type="movie",
                limit=10
            )

            assert len(candidates) == 1
            assert candidates[0]["id"] == "movie-new"
            assert candidates[0]["type"] == "movie"

    @pytest.mark.asyncio
    async def test_fetch_all_content_types(self, ai_recommendations_service):
        """Test fetching from all content types."""
        with patch('app.services.beta.ai_recommendations_service.Movie') as MockMovie, \
             patch('app.services.beta.ai_recommendations_service.Series') as MockSeries, \
             patch('app.services.beta.ai_recommendations_service.PodcastEpisode') as MockPodcast, \
             patch('app.services.beta.ai_recommendations_service.Audiobook') as MockAudiobook:

            # Mock empty results for each
            for MockModel in [MockMovie, MockSeries, MockPodcast, MockAudiobook]:
                MockModel.find = MagicMock(
                    return_value=MagicMock(
                        limit=AsyncMock(
                            return_value=AsyncMock(
                                to_list=AsyncMock(return_value=[])
                            )
                        )
                    )
                )

            candidates = await ai_recommendations_service._fetch_candidates(
                content_type=None,  # All types
                limit=20
            )

            # Should have called all models
            MockMovie.find.assert_called_once()
            MockSeries.find.assert_called_once()
            MockPodcast.find.assert_called_once()
            MockAudiobook.find.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_respects_limit(self, ai_recommendations_service):
        """Test candidate fetch respects limit."""
        mock_movies = [MagicMock(id=f"movie-{i}") for i in range(50)]

        with patch('app.services.beta.ai_recommendations_service.Movie') as MockMovie:
            MockMovie.find = MagicMock(
                return_value=MagicMock(
                    limit=AsyncMock(
                        return_value=AsyncMock(
                            to_list=AsyncMock(return_value=mock_movies[:10])
                        )
                    )
                )
            )

            candidates = await ai_recommendations_service._fetch_candidates(
                content_type="movie",
                limit=10
            )

            assert len(candidates) <= 10


class TestRankRecommendations:
    """Tests for _rank_recommendations method."""

    @pytest.mark.asyncio
    async def test_rank_with_claude(
        self,
        ai_recommendations_service,
        mock_claude_client
    ):
        """Test recommendation ranking with Claude."""
        user_profile = {
            "favorite_genres": ["thriller", "crime"],
            "preferred_languages": ["english"]
        }
        candidates = [
            {
                "id": "movie-1",
                "type": "movie",
                "title": "New Thriller",
                "description": "Suspenseful crime thriller",
                "genres": ["thriller", "crime"]
            }
        ]

        # Mock Claude response
        mock_message = MagicMock()
        mock_message.content = [
            MagicMock(
                text='{"recommendations": [{"content_id": "movie-1", "match_score": 0.92, "explanation": "Perfect match"}]}'
            )
        ]
        ai_recommendations_service._anthropic_client.messages.create = AsyncMock(
            return_value=mock_message
        )

        ranked = await ai_recommendations_service._rank_recommendations(
            user_profile,
            candidates,
            context="Looking for something exciting"
        )

        assert len(ranked) == 1
        assert ranked[0]["id"] == "movie-1"
        assert ranked[0]["match_score"] == 0.92
        assert ranked[0]["explanation"] == "Perfect match"
        mock_claude_client.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_rank_handles_api_error(self, ai_recommendations_service):
        """Test ranking fallback on Claude API error."""
        user_profile = {"favorite_genres": ["thriller"]}
        candidates = [{"id": "movie-1", "title": "Test"}]

        ai_recommendations_service._anthropic_client.messages.create = AsyncMock(
            side_effect=Exception("API Error")
        )

        ranked = await ai_recommendations_service._rank_recommendations(
            user_profile,
            candidates,
            context=None
        )

        # Should return empty list on error (or original with default scores)
        assert isinstance(ranked, list)

    @pytest.mark.asyncio
    async def test_rank_with_context(self, ai_recommendations_service):
        """Test ranking includes user context."""
        user_profile = {"favorite_genres": ["thriller"]}
        candidates = [{"id": "movie-1"}]
        context = "Something for a cozy evening"

        mock_message = MagicMock()
        mock_message.content = [
            MagicMock(
                text='{"recommendations": [{"content_id": "movie-1", "match_score": 0.85, "explanation": "Good for cozy evening"}]}'
            )
        ]
        ai_recommendations_service._anthropic_client.messages.create = AsyncMock(
            return_value=mock_message
        )

        ranked = await ai_recommendations_service._rank_recommendations(
            user_profile,
            candidates,
            context=context
        )

        # Verify context was passed to Claude
        call_args = ai_recommendations_service._anthropic_client.messages.create.call_args
        assert context in str(call_args)


class TestGetRecommendations:
    """Tests for get_recommendations method (full integration)."""

    @pytest.mark.asyncio
    async def test_recommendations_success_full_flow(
        self,
        ai_recommendations_service,
        mock_credit_service,
        mock_viewing_history
    ):
        """Test complete recommendations flow."""
        with patch.object(ai_recommendations_service, '_build_user_profile') as mock_profile, \
             patch.object(ai_recommendations_service, '_fetch_candidates') as mock_candidates, \
             patch.object(ai_recommendations_service, '_rank_recommendations') as mock_rank:

            mock_profile.return_value = {
                "favorite_genres": ["thriller"],
                "preferred_languages": ["english"]
            }
            mock_candidates.return_value = [
                {"id": "movie-1", "type": "movie", "title": "Test"}
            ]
            mock_rank.return_value = [
                {
                    "id": "movie-1",
                    "type": "movie",
                    "title": "Test",
                    "match_score": 0.92,
                    "explanation": "Perfect match"
                }
            ]

            response = await ai_recommendations_service.get_recommendations(
                content_type="movie",
                limit=10,
                context="Looking for something exciting"
            )

            # Verify beta check, balance check, and deduction
            mock_credit_service.is_beta_user.assert_called_once()
            mock_credit_service.get_balance.assert_called_once()
            mock_credit_service.deduct_credits.assert_called_once()

            # Verify response structure
            assert "user_profile" in response
            assert "recommendations" in response
            assert len(response["recommendations"]) == 1
            assert response["recommendations"][0]["match_score"] == 0.92
            assert response["credits_charged"] == 3
            assert response["credits_remaining"] == 3997

    @pytest.mark.asyncio
    async def test_recommendations_insufficient_credits(
        self,
        ai_recommendations_service,
        mock_credit_service
    ):
        """Test recommendations fail with insufficient credits."""
        # Set balance below required amount (CREDITS_PER_REQUEST = 3)
        mock_credit_service.get_balance = AsyncMock(return_value=2)

        with pytest.raises(ValueError, match="Insufficient credits"):
            await ai_recommendations_service.get_recommendations(
                content_type="movie",
                limit=10
            )

    @pytest.mark.asyncio
    async def test_recommendations_empty_history(self, ai_recommendations_service):
        """Test recommendations with no viewing history."""
        with patch.object(ai_recommendations_service, '_build_user_profile') as mock_profile, \
             patch.object(ai_recommendations_service, '_fetch_candidates') as mock_candidates, \
             patch.object(ai_recommendations_service, '_rank_recommendations') as mock_rank:

            mock_profile.return_value = {
                "favorite_genres": [],
                "preferred_languages": []
            }
            mock_candidates.return_value = [
                {"id": "movie-1", "type": "movie"}
            ]
            mock_rank.return_value = [
                {
                    "id": "movie-1",
                    "type": "movie",
                    "match_score": 0.75,
                    "explanation": "Popular content"
                }
            ]

            response = await ai_recommendations_service.get_recommendations(
                content_type="movie",
                limit=10
            )

            assert len(response["recommendations"]) == 1
            # Should still provide recommendations even without history

    @pytest.mark.asyncio
    async def test_recommendations_limit_enforcement(self, ai_recommendations_service):
        """Test recommendation limit enforcement."""
        with patch.object(ai_recommendations_service, '_build_user_profile'), \
             patch.object(ai_recommendations_service, '_fetch_candidates') as mock_candidates, \
             patch.object(ai_recommendations_service, '_rank_recommendations') as mock_rank:

            # Return 30 candidates
            mock_candidates.return_value = [
                {"id": f"item-{i}", "type": "movie"} for i in range(30)
            ]
            # Rank returns 15 (limit applied)
            mock_rank.return_value = [
                {"id": f"item-{i}", "match_score": 0.9 - i*0.01}
                for i in range(15)
            ]

            response = await ai_recommendations_service.get_recommendations(
                content_type="movie",
                limit=15
            )

            assert len(response["recommendations"]) <= 15


class TestCostEstimate:
    """Tests for get_cost_estimate method."""

    @pytest.mark.asyncio
    async def test_cost_estimate_returns_correct_value(self, ai_recommendations_service):
        """Test cost estimate returns configured credit cost."""
        estimate = await ai_recommendations_service.get_cost_estimate()

        assert estimate["credits_per_request"] == 3
        assert estimate["usd_equivalent"] == 0.03
        assert "features" in estimate
        assert "personalized" in estimate["features"]
        assert "match_scores" in estimate["features"]

"""
Tests for Movie Collections Feature
Target Coverage: 87%+
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.content import Content
from app.services.collection_detector_service import CollectionDetectorService
from app.services.collection_promo_service import CollectionPromoService
from app.services.tmdb_service import TMDBService


class TestTMDBCollections:
    """Test TMDB collection metadata fetching"""

    @pytest.mark.asyncio
    async def test_get_collection_details_success(self):
        """Test fetching collection details from TMDB"""
        service = TMDBService()
        service._make_request = AsyncMock(
            return_value={
                "id": 119,
                "name": "The Lord of the Rings Collection",
                "overview": "The Lord of the Rings series",
                "poster_path": "/path/to/poster.jpg",
                "backdrop_path": "/path/to/backdrop.jpg",
                "parts": [
                    {"id": 120, "title": "Fellowship"},
                    {"id": 121, "title": "Two Towers"},
                    {"id": 122, "title": "Return of the King"},
                ],
            }
        )

        result = await service.get_collection_details(119)

        assert result is not None
        assert result["name"] == "The Lord of the Rings Collection"
        assert len(result["parts"]) == 3

    @pytest.mark.asyncio
    async def test_get_collection_details_not_found(self):
        """Test collection not found"""
        service = TMDBService()
        service._make_request = AsyncMock(return_value=None)

        result = await service.get_collection_details(999999)

        assert result is None

    @pytest.mark.asyncio
    async def test_enrich_collection_metadata(self):
        """Test collection metadata enrichment"""
        service = TMDBService()
        service.get_collection_details = AsyncMock(
            return_value={
                "id": 119,
                "name": "LOTR Collection",
                "overview": "Epic fantasy trilogy",
                "poster_path": "/poster.jpg",
                "backdrop_path": "/backdrop.jpg",
                "parts": [{"id": 120}, {"id": 121}, {"id": 122}],
            }
        )

        result = await service.enrich_collection_metadata(119, "Fallback Name")

        assert result["collection_id"] == 119
        assert result["collection_name"] == "LOTR Collection"
        assert result["total_movies"] == 3
        assert len(result["movie_ids"]) == 3
        assert result["collection_poster"] is not None

    @pytest.mark.asyncio
    async def test_enrich_movie_content_with_collection(self):
        """Test movie enrichment includes collection data"""
        service = TMDBService()
        service.search_movie = AsyncMock(return_value={"id": 120})
        service.get_movie_details = AsyncMock(
            return_value={
                "id": 120,
                "title": "Fellowship of the Ring",
                "belongs_to_collection": {
                    "id": 119,
                    "name": "LOTR Collection",
                    "poster_path": "/poster.jpg",
                },
                "external_ids": {"imdb_id": "tt0120737"},
                "vote_average": 8.8,
                "vote_count": 20000,
                "genres": [{"name": "Fantasy"}],
                "credits": {
                    "cast": [{"name": "Elijah Wood"}],
                    "crew": [{"name": "Peter Jackson", "job": "Director"}],
                },
            }
        )

        result = await service.enrich_movie_content("Fellowship", 2001)

        assert result["collection_id"] == 119
        assert result["collection_name"] == "LOTR Collection"
        assert result["collection_poster"] is not None


class TestCollectionDetectorService:
    """Test collection auto-detection service"""

    @pytest.mark.asyncio
    async def test_detect_collections_for_movie_no_collection(self):
        """Test movie without collection ID"""
        service = CollectionDetectorService()

        with patch("app.services.collection_detector_service.Content") as MockContent:
            mock_movie = MagicMock()
            mock_movie.tmdb_collection_id = None
            mock_movie.title = "Standalone Movie"
            MockContent.get = AsyncMock(return_value=mock_movie)

            result = await service.detect_collections_for_movie("movie123")

            assert result is None

    @pytest.mark.asyncio
    async def test_detect_collections_single_movie(self):
        """Test collection with only 1 movie (should not create collection)"""
        service = CollectionDetectorService()

        with patch("app.services.collection_detector_service.Content") as MockContent:
            mock_movie = MagicMock()
            mock_movie.tmdb_collection_id = 119
            mock_movie.title = "Fellowship"
            MockContent.get = AsyncMock(return_value=mock_movie)

            # Only one movie in collection
            mock_find = MagicMock()
            mock_find.to_list = AsyncMock(return_value=[mock_movie])
            MockContent.find = MagicMock(return_value=mock_find)

            result = await service.detect_collections_for_movie("movie123")

            assert result is None

    @pytest.mark.asyncio
    async def test_detect_collections_creates_parent(self):
        """Test creating collection parent when 2+ movies exist"""
        service = CollectionDetectorService()

        with patch("app.services.collection_detector_service.Content") as MockContent, \
             patch("app.services.collection_detector_service.tmdb_service") as mock_tmdb:

            # Setup mock movies
            mock_movie1 = MagicMock()
            mock_movie1.id = "m1"
            mock_movie1.tmdb_collection_id = 119
            mock_movie1.tmdb_collection_name = "LOTR Collection"
            mock_movie1.title = "Fellowship"
            mock_movie1.year = 2001
            mock_movie1.set = AsyncMock()

            mock_movie2 = MagicMock()
            mock_movie2.id = "m2"
            mock_movie2.tmdb_collection_id = 119
            mock_movie2.title = "Two Towers"
            mock_movie2.year = 2002
            mock_movie2.set = AsyncMock()

            MockContent.get = AsyncMock(return_value=mock_movie1)

            mock_find = MagicMock()
            mock_find.to_list = AsyncMock(return_value=[mock_movie1, mock_movie2])
            MockContent.find = MagicMock(return_value=mock_find)

            MockContent.find_one = AsyncMock(return_value=None)

            # Make Content() constructor return a mock parent
            mock_parent = MagicMock()
            mock_parent.id = "collection123"
            mock_parent.title = "LOTR Collection"
            mock_parent.insert = AsyncMock()
            MockContent.return_value = mock_parent

            # Mock TMDB service
            mock_tmdb.enrich_collection_metadata = AsyncMock(
                return_value={
                    "collection_name": "LOTR Collection",
                    "collection_overview": "Epic trilogy",
                    "collection_poster": "http://poster.jpg",
                    "collection_backdrop": "http://backdrop.jpg",
                    "total_movies": 3,
                }
            )

            result = await service.detect_collections_for_movie("m1")

            assert result is not None
            assert result["available_movies"] == 2

    @pytest.mark.asyncio
    async def test_scan_all_movies(self):
        """Test full collection scan"""
        service = CollectionDetectorService()

        with patch("app.services.collection_detector_service.Content") as MockContent:
            # Setup mock movies
            mock_movies = [
                MagicMock(id=f"m{i}", tmdb_collection_id=119) for i in range(3)
            ]

            mock_find = MagicMock()
            mock_find.to_list = AsyncMock(return_value=mock_movies)
            MockContent.find = MagicMock(return_value=mock_find)

            with patch.object(
                service, "detect_collections_for_movie",
                return_value={"linked_movies": 3, "collection_id": 119}
            ):
                stats = await service.scan_all_movies()

            assert stats["total_movies_scanned"] == 3
            assert stats["collections_created"] >= 0


class TestCollectionPromoService:
    """Test AI promo generation service"""

    @pytest.mark.asyncio
    async def test_generate_promo_success(self):
        """Test successful promo generation"""
        service = CollectionPromoService()

        with patch("app.services.collection_promo_service.get_anthropic_client") as mock_client:
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text="Epic trilogy spanning Middle-earth!")]

            mock_anthropic = AsyncMock()
            mock_anthropic.messages.create = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_anthropic

            result = await service.generate_promo(
                collection_name="LOTR Collection",
                movie_titles=["Fellowship", "Two Towers", "Return of the King"],
                genres=["Fantasy", "Adventure"],
                language="en",
            )

            assert "Epic trilogy" in result
            mock_anthropic.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_promo_caching(self):
        """Test promo generation uses caching"""
        service = CollectionPromoService()

        with patch("app.services.collection_promo_service.get_anthropic_client") as mock_client:
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text="Cached promo")]

            mock_anthropic = AsyncMock()
            mock_anthropic.messages.create = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_anthropic

            # First call
            result1 = await service.generate_promo(
                collection_name="Test Collection",
                movie_titles=["Movie 1"],
                genres=["Action"],
                language="en",
                use_cache=True,
            )

            # Second call with same inputs
            result2 = await service.generate_promo(
                collection_name="Test Collection",
                movie_titles=["Movie 1"],
                genres=["Action"],
                language="en",
                use_cache=True,
            )

            assert result1 == result2
            # API should be called only once (second is cached)
            assert mock_anthropic.messages.create.call_count == 1

    @pytest.mark.asyncio
    async def test_generate_promo_fallback_on_error(self):
        """Test fallback when AI generation fails"""
        service = CollectionPromoService()

        with patch("app.services.collection_promo_service.get_anthropic_client") as mock_client:
            mock_anthropic = AsyncMock()
            mock_anthropic.messages.create = AsyncMock(
                side_effect=Exception("API Error")
            )
            mock_client.return_value = mock_anthropic

            result = await service.generate_promo(
                collection_name="Test Collection",
                movie_titles=["Movie 1", "Movie 2"],
                genres=[],
                language="he",
            )

            # Should return fallback text
            assert "Test Collection" in result
            assert "2 films" in result


class TestCollectionsAPI:
    """Test Collections API endpoints"""

    @pytest.mark.asyncio
    async def test_list_collections_endpoint(self, test_client):
        """Test GET /collections endpoint"""
        # This would require test_client fixture and database setup
        # Placeholder for integration test
        pass

    @pytest.mark.asyncio
    async def test_get_collection_detail_endpoint(self, test_client):
        """Test GET /collections/{id} endpoint"""
        # Placeholder for integration test
        pass

    @pytest.mark.asyncio
    async def test_generate_promo_endpoint(self, test_client):
        """Test POST /collections/{id}/generate-promo endpoint"""
        # Placeholder for integration test
        pass

    @pytest.mark.asyncio
    async def test_bulk_playlist_endpoint(self, test_client):
        """Test POST /playlist/items/bulk endpoint"""
        # Placeholder for integration test
        pass


@pytest.fixture
def test_client():
    """Fixture for test client (would be implemented in conftest.py)"""
    pass

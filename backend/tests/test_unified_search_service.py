"""
Comprehensive Tests for Unified Search Service

Tests cover:
- Text search with MongoDB text indexes
- Subtitle search (dialogue search)
- Advanced metadata filtering
- Result caching
- Autocomplete suggestions
- Filter options retrieval
- Search analytics tracking
- Performance benchmarks
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.services.unified_search_service import UnifiedSearchService, SearchFilters
from app.services.search_cache import SearchCacheService
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc, SubtitleCue
from app.core.config import settings


# Test Fixtures

@pytest.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.DATABASE_NAME}_test"],
        document_models=[Content, SubtitleTrackDoc]
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.DATABASE_NAME}_test")
    client.close()


@pytest.fixture
async def search_service(db_client):
    """Create unified search service instance."""
    return UnifiedSearchService()


@pytest.fixture
async def sample_content(db_client):
    """Create sample content for testing."""
    content_items = [
        Content(
            id="test-movie-1",
            title="Fauda",
            title_en="Fauda",
            title_es="Fauda",
            description="Israeli action series about undercover agents",
            description_en="Israeli action series about undercover agents",
            content_type="vod",
            genres=["Action", "Drama", "Thriller"],
            cast=["Lior Raz", "Hisham Suliman"],
            director="Lior Raz",
            year=2015,
            rating=8.5,
            duration_minutes=45,
            available_subtitle_languages=["he", "en", "ar"],
            is_kids_content=False,
            requires_subscription="premium",
            thumbnail="https://example.com/fauda.jpg",
            published=True,
        ),
        Content(
            id="test-movie-2",
            title="שטיסל",
            title_en="Shtisel",
            title_es="Shtisel",
            description="Drama about an Orthodox Jewish family in Jerusalem",
            description_en="Drama about an Orthodox Jewish family in Jerusalem",
            content_type="vod",
            genres=["Drama", "Family"],
            cast=["Dov Glickman", "Michael Aloni"],
            director="Alon Zingman",
            year=2013,
            rating=9.0,
            duration_minutes=50,
            available_subtitle_languages=["he", "en"],
            is_kids_content=False,
            requires_subscription="basic",
            thumbnail="https://example.com/shtisel.jpg",
            published=True,
        ),
        Content(
            id="test-movie-3",
            title="The Band's Visit",
            title_en="The Band's Visit",
            title_es="La Visita de la Banda",
            description="Egyptian police band gets lost in Israel",
            description_en="Egyptian police band gets lost in Israel",
            content_type="vod",
            genres=["Comedy", "Drama"],
            cast=["Sasson Gabai", "Ronit Elkabetz"],
            director="Eran Kolirin",
            year=2007,
            rating=7.6,
            duration_minutes=87,
            available_subtitle_languages=["he", "en", "es", "ar"],
            is_kids_content=False,
            requires_subscription="basic",
            thumbnail="https://example.com/band.jpg",
            published=True,
        ),
        Content(
            id="test-kids-1",
            title="Galis",
            title_en="Galis",
            description="Israeli children's series about school kids",
            description_en="Israeli children's series about school kids",
            content_type="vod",
            genres=["Kids", "Comedy"],
            year=2012,
            rating=6.5,
            duration_minutes=22,
            available_subtitle_languages=["he"],
            is_kids_content=True,
            requires_subscription="free",
            thumbnail="https://example.com/galis.jpg",
            published=True,
        ),
    ]

    for item in content_items:
        await item.insert()

    return content_items


@pytest.fixture
async def sample_subtitles(db_client, sample_content):
    """Create sample subtitle tracks for testing."""
    subtitles = [
        SubtitleTrackDoc(
            id="sub-1",
            content_id="test-movie-1",
            language="en",
            cues=[
                SubtitleCue(
                    start_time=10.0,
                    end_time=13.5,
                    text="Shalom, my name is Doron",
                ),
                SubtitleCue(
                    start_time=15.0,
                    end_time=18.0,
                    text="We are going on a mission tonight",
                ),
                SubtitleCue(
                    start_time=120.5,
                    end_time=124.0,
                    text="The target is in the building",
                ),
            ],
        ),
        SubtitleTrackDoc(
            id="sub-2",
            content_id="test-movie-2",
            language="en",
            cues=[
                SubtitleCue(
                    start_time=5.0,
                    end_time=8.0,
                    text="Welcome to the family",
                ),
                SubtitleCue(
                    start_time=45.0,
                    end_time=48.5,
                    text="Jerusalem is a beautiful city",
                ),
            ],
        ),
    ]

    for sub in subtitles:
        await sub.insert()

    return subtitles


# Text Search Tests

@pytest.mark.asyncio
async def test_basic_text_search(search_service, sample_content):
    """Test basic text search functionality."""
    filters = SearchFilters(contentTypes=["vod"])
    results = await search_service.search(
        query="Fauda",
        filters=filters,
        page=1,
        limit=20
    )

    assert results["success"] is True
    assert len(results["results"]) == 1
    assert results["results"][0]["title"] == "Fauda"
    assert results["total"] == 1


@pytest.mark.asyncio
async def test_multilingual_search(search_service, sample_content):
    """Test search across multiple language fields."""
    filters = SearchFilters(contentTypes=["vod"])

    # Search in Hebrew
    results = await search_service.search(
        query="שטיסל",
        filters=filters,
        page=1,
        limit=20
    )
    assert len(results["results"]) == 1

    # Search in English
    results = await search_service.search(
        query="Shtisel",
        filters=filters,
        page=1,
        limit=20
    )
    assert len(results["results"]) == 1


@pytest.mark.asyncio
async def test_cast_search(search_service, sample_content):
    """Test search by cast member."""
    filters = SearchFilters(contentTypes=["vod"])
    results = await search_service.search(
        query="Lior Raz",
        filters=filters,
        page=1,
        limit=20
    )

    assert len(results["results"]) >= 1
    assert any(r["id"] == "test-movie-1" for r in results["results"])


@pytest.mark.asyncio
async def test_director_search(search_service, sample_content):
    """Test search by director."""
    filters = SearchFilters(contentTypes=["vod"])
    results = await search_service.search(
        query="Eran Kolirin",
        filters=filters,
        page=1,
        limit=20
    )

    assert len(results["results"]) == 1
    assert results["results"][0]["director"] == "Eran Kolirin"


# Genre Filter Tests

@pytest.mark.asyncio
async def test_genre_filter_single(search_service, sample_content):
    """Test filtering by single genre."""
    filters = SearchFilters(
        contentTypes=["vod"],
        genres=["Drama"]
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    assert len(results["results"]) >= 2
    for result in results["results"]:
        assert "Drama" in result.get("genres", [])


@pytest.mark.asyncio
async def test_genre_filter_multiple(search_service, sample_content):
    """Test filtering by multiple genres (OR logic)."""
    filters = SearchFilters(
        contentTypes=["vod"],
        genres=["Action", "Comedy"]
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    assert len(results["results"]) >= 2


# Year Filter Tests

@pytest.mark.asyncio
async def test_year_range_filter(search_service, sample_content):
    """Test filtering by year range."""
    filters = SearchFilters(
        contentTypes=["vod"],
        yearMin=2010,
        yearMax=2020
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    for result in results["results"]:
        assert 2010 <= result.get("year", 0) <= 2020


@pytest.mark.asyncio
async def test_year_min_only(search_service, sample_content):
    """Test filtering with minimum year only."""
    filters = SearchFilters(
        contentTypes=["vod"],
        yearMin=2013
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    for result in results["results"]:
        assert result.get("year", 0) >= 2013


# Rating Filter Tests

@pytest.mark.asyncio
async def test_rating_filter(search_service, sample_content):
    """Test filtering by minimum rating."""
    filters = SearchFilters(
        contentTypes=["vod"],
        ratingMin=8.0
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    for result in results["results"]:
        assert result.get("rating", 0) >= 8.0


# Subtitle Language Filter Tests

@pytest.mark.asyncio
async def test_subtitle_language_filter(search_service, sample_content):
    """Test filtering by subtitle language."""
    filters = SearchFilters(
        contentTypes=["vod"],
        subtitleLanguages=["en"]
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    for result in results["results"]:
        assert "en" in result.get("available_subtitle_languages", [])


# Kids Content Filter Tests

@pytest.mark.asyncio
async def test_kids_content_only(search_service, sample_content):
    """Test filtering for kids content only."""
    filters = SearchFilters(
        contentTypes=["vod"],
        isKidsContent=True
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    assert len(results["results"]) >= 1
    for result in results["results"]:
        assert result.get("is_kids_content") is True


@pytest.mark.asyncio
async def test_exclude_kids_content(search_service, sample_content):
    """Test excluding kids content."""
    filters = SearchFilters(
        contentTypes=["vod"],
        isKidsContent=False
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    for result in results["results"]:
        assert result.get("is_kids_content") is False


# Subtitle Search Tests

@pytest.mark.asyncio
async def test_subtitle_search_basic(search_service, sample_subtitles):
    """Test basic subtitle text search."""
    filters = SearchFilters(
        contentTypes=["vod"],
        searchInSubtitles=True
    )
    results = await search_service.search(
        query="Shalom",
        filters=filters,
        page=1,
        limit=20
    )

    assert len(results["results"]) >= 1
    # Check that subtitle matches are included
    assert any(r.get("subtitle_matches") for r in results["results"])


@pytest.mark.asyncio
async def test_subtitle_match_timestamps(search_service, sample_subtitles):
    """Test that subtitle matches include timestamps."""
    filters = SearchFilters(
        contentTypes=["vod"],
        searchInSubtitles=True
    )
    results = await search_service.search(
        query="mission",
        filters=filters,
        page=1,
        limit=20
    )

    if results["results"]:
        match = results["results"][0]
        if "subtitle_matches" in match:
            assert len(match["subtitle_matches"]) > 0
            first_match = match["subtitle_matches"][0]
            assert "timestamp" in first_match
            assert "highlighted_text" in first_match


# Combined Filter Tests

@pytest.mark.asyncio
async def test_combined_filters(search_service, sample_content):
    """Test multiple filters combined."""
    filters = SearchFilters(
        contentTypes=["vod"],
        genres=["Drama"],
        yearMin=2013,
        yearMax=2020,
        ratingMin=8.0,
        subtitleLanguages=["en"]
    )
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    for result in results["results"]:
        assert "Drama" in result.get("genres", [])
        assert 2013 <= result.get("year", 0) <= 2020
        assert result.get("rating", 0) >= 8.0
        assert "en" in result.get("available_subtitle_languages", [])


# Pagination Tests

@pytest.mark.asyncio
async def test_pagination(search_service, sample_content):
    """Test result pagination."""
    filters = SearchFilters(contentTypes=["vod"])

    # Page 1
    page1 = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=2
    )
    assert len(page1["results"]) <= 2

    # Page 2
    page2 = await search_service.search(
        query="",
        filters=filters,
        page=2,
        limit=2
    )

    # Ensure different results
    page1_ids = [r["id"] for r in page1["results"]]
    page2_ids = [r["id"] for r in page2["results"]]
    assert not any(id in page1_ids for id in page2_ids)


# Autocomplete Tests

@pytest.mark.asyncio
async def test_autocomplete_suggestions(search_service, sample_content):
    """Test autocomplete suggestions."""
    suggestions = await search_service.get_suggestions(
        query="Fa",
        limit=5
    )

    assert isinstance(suggestions, list)
    assert "Fauda" in suggestions


# Filter Options Tests

@pytest.mark.asyncio
async def test_get_filter_options(search_service, sample_content):
    """Test retrieving available filter options."""
    options = await search_service.get_filter_options()

    assert "genres" in options
    assert "year_range" in options
    assert "subtitle_languages" in options
    assert "content_types" in options

    assert "Drama" in options["genres"]
    assert "Action" in options["genres"]
    assert options["year_range"]["min"] <= 2007
    assert options["year_range"]["max"] >= 2015


# Cache Tests

@pytest.mark.asyncio
async def test_search_caching(search_service, sample_content):
    """Test that search results are cached."""
    filters = SearchFilters(contentTypes=["vod"])

    # First search - cache miss
    result1 = await search_service.search(
        query="Fauda",
        filters=filters,
        page=1,
        limit=20
    )
    assert result1.get("cache_hit") is False or "cache_hit" not in result1

    # Second search - should hit cache
    result2 = await search_service.search(
        query="Fauda",
        filters=filters,
        page=1,
        limit=20
    )
    assert result2.get("cache_hit") is True


# Performance Tests

@pytest.mark.asyncio
async def test_search_performance(search_service, sample_content):
    """Test search performance benchmarks."""
    import time

    filters = SearchFilters(contentTypes=["vod"])

    start = time.time()
    results = await search_service.search(
        query="Drama",
        filters=filters,
        page=1,
        limit=20
    )
    duration = (time.time() - start) * 1000  # Convert to ms

    # Should complete in under 200ms
    assert duration < 200, f"Search took {duration}ms, expected < 200ms"


@pytest.mark.asyncio
async def test_subtitle_search_performance(search_service, sample_subtitles):
    """Test subtitle search performance benchmarks."""
    import time

    filters = SearchFilters(
        contentTypes=["vod"],
        searchInSubtitles=True
    )

    start = time.time()
    results = await search_service.search(
        query="mission",
        filters=filters,
        page=1,
        limit=20
    )
    duration = (time.time() - start) * 1000

    # Should complete in under 300ms
    assert duration < 300, f"Subtitle search took {duration}ms, expected < 300ms"


# Edge Case Tests

@pytest.mark.asyncio
async def test_empty_query(search_service, sample_content):
    """Test search with empty query returns all content."""
    filters = SearchFilters(contentTypes=["vod"])
    results = await search_service.search(
        query="",
        filters=filters,
        page=1,
        limit=20
    )

    assert results["success"] is True
    assert len(results["results"]) > 0


@pytest.mark.asyncio
async def test_no_results(search_service, sample_content):
    """Test search with no matching results."""
    filters = SearchFilters(contentTypes=["vod"])
    results = await search_service.search(
        query="NonexistentMovieThatDoesNotExist12345",
        filters=filters,
        page=1,
        limit=20
    )

    assert results["success"] is True
    assert len(results["results"]) == 0
    assert results["total"] == 0


@pytest.mark.asyncio
async def test_special_characters_query(search_service, sample_content):
    """Test search with special characters."""
    filters = SearchFilters(contentTypes=["vod"])
    results = await search_service.search(
        query="Band's",
        filters=filters,
        page=1,
        limit=20
    )

    assert results["success"] is True
    # Should handle apostrophe correctly


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

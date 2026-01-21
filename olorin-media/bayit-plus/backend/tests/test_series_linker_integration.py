"""
Integration Tests for Series Linker Service

Tests the SeriesLinkerService functionality including:
- Episode-to-series linking
- Series matching and lookup
- Duplicate episode detection and resolution
- Episode data extraction from titles
- Batch operations for auto-linking
"""

import re
from datetime import datetime
from typing import Optional

import pytest
import pytest_asyncio
from beanie import init_beanie
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.services.series_linker_service import (
    DeduplicationResult,
    DuplicateGroup,
    LinkingResult,
    SeriesLinkerService,
    UnlinkedEpisode,
    extract_series_info_from_title,
)


@pytest_asyncio.fixture
async def series_linker_db_client():
    """Create test database client for series linker tests."""
    test_db_name = f"{settings.MONGODB_DB_NAME}_series_linker_test"
    mongodb_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    await init_beanie(
        database=client[test_db_name],
        document_models=[
            Content,
        ],
    )

    yield client

    # Cleanup
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def sample_series(series_linker_db_client):
    """Create a sample TV series for testing."""
    series = Content(
        title="Breaking Bad",
        title_en="Breaking Bad",
        description="Crime drama series",
        description_en="Crime drama series",
        content_type="series",
        genres=["Drama", "Crime"],
        year=2008,
        rating=9.5,
        is_series=True,
        category_id="test_series_category",
        stream_url="https://test.example.com/series/stream.m3u8",
    )
    await series.insert()
    return series


@pytest_asyncio.fixture
async def sample_episode(series_linker_db_client, sample_series):
    """Create a sample episode without series link."""
    episode = Content(
        title="Pilot",
        title_en="Pilot",
        description="First episode",
        content_type="episode",
        genres=["Drama"],
        year=2008,
        rating=9.0,
        season=1,
        episode_number=1,
        category_id="test_episode_category",
        stream_url="https://test.example.com/episode/stream.m3u8",
        # Note: no series_id set
    )
    await episode.insert()
    return episode


@pytest_asyncio.fixture
async def sample_duplicate_episodes(series_linker_db_client, sample_series):
    """Create sample duplicate episodes for testing."""
    episodes = []
    for i in range(3):
        episode = Content(
            title=f"Season 1 Episode 1 - Variant {i+1}",
            title_en=f"Season 1 Episode 1 - Variant {i+1}",
            description="Duplicate episode",
            content_type="episode",
            genres=["Drama"],
            year=2008,
            rating=9.0,
            season=1,
            episode_number=1,
            series_id=str(sample_series.id),
            duration_minutes=50 + i,
            category_id="test_episode_category",
            stream_url=f"https://test.example.com/episode{i}/stream.m3u8",
        )
        await episode.insert()
        episodes.append(episode)
    return episodes


@pytest.fixture
def series_linker_service():
    """Create SeriesLinkerService instance."""
    return SeriesLinkerService()


# ============================================
# Episode Title Extraction Tests
# ============================================


class TestEpisodeTitleExtraction:
    """Test episode information extraction from titles."""

    def test_extract_series_info_s01e01_format(self):
        """Test extraction of S01E01 format."""
        title = "Breaking Bad S01E01"
        series_name, season, episode = extract_series_info_from_title(title)

        assert series_name == "Breaking Bad"
        assert season == 1
        assert episode == 1

    def test_extract_series_info_1x01_format(self):
        """Test extraction of 1x01 format."""
        title = "The Office 1x01"
        series_name, season, episode = extract_series_info_from_title(title)

        assert series_name == "The Office"
        assert season == 1
        assert episode == 1

    def test_extract_series_info_season_episode_format(self):
        """Test extraction of Season/Episode format."""
        title = "Game of Thrones - Season 1 Episode 1"
        series_name, season, episode = extract_series_info_from_title(title)

        assert series_name == "Game of Thrones"
        assert season == 1
        assert episode == 1

    def test_extract_series_info_ep_format(self):
        """Test extraction of EP format."""
        title = "Friends Ep.1"
        series_name, season, episode = extract_series_info_from_title(title)

        assert series_name == "Friends"
        assert season == 1
        assert episode == 1

    def test_extract_series_info_with_multiple_spaces(self):
        """Test extraction with multiple spaces."""
        title = "Breaking   Bad   S02E05"
        series_name, season, episode = extract_series_info_from_title(title)

        assert series_name is not None
        assert season == 2
        assert episode == 5

    def test_extract_series_info_large_episode_numbers(self):
        """Test extraction with large season and episode numbers."""
        title = "The Simpsons S32E100"
        series_name, season, episode = extract_series_info_from_title(title)

        assert series_name == "The Simpsons"
        assert season == 32
        assert episode == 100

    def test_extract_series_info_no_match(self):
        """Test extraction when format doesn't match."""
        title = "Some Random Movie Title"
        series_name, season, episode = extract_series_info_from_title(title)

        # Should return None for all when no match
        assert series_name is None or series_name == "Some Random Movie Title"

    def test_extract_series_info_hebrew_title(self):
        """Test extraction from Hebrew title with English episode info."""
        title = "סדרת בדיקה S01E03"
        series_name, season, episode = extract_series_info_from_title(title)

        assert season == 1
        assert episode == 3

    def test_extract_series_info_lowercase_format(self):
        """Test extraction with lowercase format."""
        title = "series name s03e07"
        series_name, season, episode = extract_series_info_from_title(title)

        assert season == 3
        assert episode == 7


# ============================================
# Episode-to-Series Linking Tests
# ============================================


@pytest.mark.asyncio
async def test_link_episode_to_series(series_linker_service, sample_episode, sample_series):
    """Test linking an episode to its series."""
    result = await series_linker_service.link_episode_to_series(
        episode_id=str(sample_episode.id),
        series_id=str(sample_series.id),
        season=1,
        episode_num=1,
        reason="Test linking",
    )

    assert result.success is True
    assert result.episode_id == str(sample_episode.id)
    assert result.series_id == str(sample_series.id)

    # Verify episode was updated in database
    updated_episode = await Content.get(sample_episode.id)
    assert updated_episode.series_id == str(sample_series.id)
    assert updated_episode.season == 1
    assert updated_episode.episode_number == 1


@pytest.mark.asyncio
async def test_link_episode_dry_run(series_linker_service, sample_episode, sample_series):
    """Test dry-run linking doesn't modify database."""
    result = await series_linker_service.link_episode_to_series(
        episode_id=str(sample_episode.id),
        series_id=str(sample_series.id),
        dry_run=True,
        reason="Dry run test",
    )

    assert result.success is True
    assert result.dry_run is True

    # Verify episode was NOT updated in database
    episode = await Content.get(sample_episode.id)
    assert episode.series_id is None


@pytest.mark.asyncio
async def test_find_unlinked_episodes(series_linker_service, series_linker_db_client):
    """Test finding episodes without series link."""
    # Create episodes with and without series_id
    unlinked = Content(
        title="Unlinked Episode",
        title_en="Unlinked Episode",
        content_type="episode",
        genres=["Drama"],
        year=2020,
        category_id="test_category",
        stream_url="https://test.example.com/unlinked/stream.m3u8",
    )
    await unlinked.insert()

    series = Content(
        title="Test Series",
        title_en="Test Series",
        content_type="series",
        year=2020,
        is_series=True,
        category_id="test_series_cat",
        stream_url="https://test.example.com/series/stream.m3u8",
    )
    await series.insert()

    linked = Content(
        title="Linked Episode",
        title_en="Linked Episode",
        content_type="episode",
        genres=["Drama"],
        year=2020,
        series_id=str(series.id),
        category_id="test_category",
        stream_url="https://test.example.com/linked/stream.m3u8",
    )
    await linked.insert()

    # Find unlinked
    unlinked_episodes = await series_linker_service.find_unlinked_episodes(limit=10)

    # Should find at least the unlinked episode
    unlinked_ids = [ep.content_id for ep in unlinked_episodes]
    assert str(unlinked.id) in unlinked_ids
    assert str(linked.id) not in unlinked_ids


@pytest.mark.asyncio
async def test_find_matching_series(series_linker_service, sample_series):
    """Test finding a matching series by name."""
    series, confidence = await series_linker_service.find_matching_series(
        "Breaking Bad", use_tmdb=False
    )

    assert series is not None
    assert series.title == sample_series.title
    assert confidence > 0.8


# ============================================
# Duplicate Detection and Resolution Tests
# ============================================


@pytest.mark.asyncio
async def test_find_duplicate_episodes(
    series_linker_service, sample_series, sample_duplicate_episodes
):
    """Test finding duplicate episodes in a series."""
    duplicates = await series_linker_service.find_duplicate_episodes(
        series_id=str(sample_series.id)
    )

    # Should find the 3 duplicates
    assert len(duplicates) > 0
    assert any(
        dup.episode == 1 and dup.season == 1 for dup in duplicates
    )  # We created S01E01 duplicates


@pytest.mark.asyncio
async def test_resolve_duplicate_episodes(
    series_linker_service, sample_series, sample_duplicate_episodes
):
    """Test automatic resolution of duplicate episodes."""
    result = await series_linker_service.auto_resolve_duplicate_episodes(
        strategy="keep_largest"  # Keep the largest file (last variant with duration 52)
    )

    assert isinstance(result, DeduplicationResult)
    assert result.success is True
    assert result.duplicates_found > 0
    assert result.duplicates_resolved > 0


@pytest.mark.asyncio
async def test_validate_episode_uniqueness(
    series_linker_service, sample_series, sample_duplicate_episodes
):
    """Test validation of episode uniqueness in a series."""
    is_unique = await series_linker_service.validate_episode_uniqueness(
        series_id=str(sample_series.id)
    )

    # Should be False because we have duplicates
    assert is_unique is False


# ============================================
# Series Information Tests
# ============================================


@pytest.mark.asyncio
async def test_find_series_with_incomplete_episodes(series_linker_service, sample_series):
    """Test finding episodes with incomplete season/episode data."""
    # Create episode with missing season/episode info
    incomplete = Content(
        title="Episode with missing info",
        title_en="Episode with missing info",
        content_type="episode",
        genres=["Drama"],
        year=2020,
        series_id=str(sample_series.id),
        category_id="test_category",
        stream_url="https://test.example.com/incomplete/stream.m3u8",
        # season and episode_number are None
    )
    await incomplete.insert()

    incomplete_episodes = await series_linker_service.find_episodes_with_incomplete_data(
        series_id=str(sample_series.id)
    )

    incomplete_ids = [ep.content_id for ep in incomplete_episodes]
    assert str(incomplete.id) in incomplete_ids


# ============================================
# Batch Operations Tests
# ============================================


@pytest.mark.asyncio
async def test_auto_link_unlinked_episodes(series_linker_service):
    """Test automatic linking of unlinked episodes."""
    result = await series_linker_service.auto_link_unlinked_episodes(
        limit=10, dry_run=True  # Dry run to not modify DB
    )

    assert isinstance(result, dict)
    assert "processed" in result or "success" in result


# ============================================
# Error Handling Tests
# ============================================


@pytest.mark.asyncio
async def test_link_nonexistent_episode(series_linker_service, sample_series):
    """Test linking a nonexistent episode."""
    fake_episode_id = str(ObjectId())

    result = await series_linker_service.link_episode_to_series(
        episode_id=fake_episode_id,
        series_id=str(sample_series.id),
    )

    assert result.success is False
    assert result.error is not None


@pytest.mark.asyncio
async def test_link_to_nonexistent_series(series_linker_service, sample_episode):
    """Test linking episode to nonexistent series."""
    fake_series_id = str(ObjectId())

    result = await series_linker_service.link_episode_to_series(
        episode_id=str(sample_episode.id),
        series_id=fake_series_id,
    )

    assert result.success is False


# ============================================
# Data Structure Tests
# ============================================


def test_linking_result_dataclass():
    """Test LinkingResult dataclass."""
    result = LinkingResult(
        success=True,
        episode_id="ep123",
        series_id="series456",
        series_title="Test Series",
        confidence=0.95,
    )

    assert result.success is True
    assert result.episode_id == "ep123"
    assert result.series_id == "series456"
    assert result.confidence == 0.95


def test_deduplication_result_dataclass():
    """Test DeduplicationResult dataclass."""
    result = DeduplicationResult(
        success=True,
        duplicates_found=3,
        duplicates_resolved=2,
        kept_episode_ids=["ep1", "ep2"],
        removed_episode_ids=["ep3"],
    )

    assert result.success is True
    assert result.duplicates_found == 3
    assert result.duplicates_resolved == 2
    assert len(result.kept_episode_ids) == 2
    assert len(result.removed_episode_ids) == 1


def test_duplicate_group_dataclass():
    """Test DuplicateGroup dataclass."""
    group = DuplicateGroup(
        series_id="series123",
        series_title="Breaking Bad",
        season=1,
        episode=1,
        episode_ids=["ep1", "ep2", "ep3"],
        episode_titles=["Pilot v1", "Pilot v2", "Pilot v3"],
        created_dates=[
            datetime(2020, 1, 1),
            datetime(2020, 1, 2),
            datetime(2020, 1, 3),
        ],
        file_sizes=[None, 1000000, 1500000],
        resolutions=[1080, 720, 1080],
    )

    assert group.series_id == "series123"
    assert len(group.episode_ids) == 3
    assert group.file_sizes[1] == 1000000


def test_unlinked_episode_dataclass():
    """Test UnlinkedEpisode dataclass."""
    episode = UnlinkedEpisode(
        content_id="ep123",
        title="Test Episode",
        title_en="Test Episode",
        extracted_series_name="Test Series",
        season=1,
        episode=1,
        created_at=datetime(2020, 1, 1),
    )

    assert episode.content_id == "ep123"
    assert episode.season == 1
    assert episode.episode == 1

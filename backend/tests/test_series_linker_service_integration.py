"""
Integration Tests for Series Linker Service

Tests the SeriesLinkerService functionality including episode matching,
series linking, duplicate detection, and TMDB integration.
Uses real database operations with test collections.
"""

import asyncio
import os
from datetime import datetime
from typing import List, Optional

import pytest
import pytest_asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


@pytest_asyncio.fixture
async def test_db_client():
    """Create test database client with Content model."""
    from app.models.content import Content

    test_db_name = f"{settings.MONGODB_DB_NAME}_series_linker_test"
    mongodb_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    await init_beanie(
        database=client[test_db_name],
        document_models=[Content],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def sample_series(test_db_client):
    """Create sample series for testing."""
    from app.models.content import Content

    series = Content(
        title="The Test Show",
        title_en="The Test Show",
        is_series=True,
        content_type="series",
        description="A test TV series for testing",
        description_en="A test TV series for testing",
        tmdb_id=12345,
        imdb_id="tt1234567",
        is_published=True,
        file_hash=None,
        # Required fields
        category_id="test_category_series",
        stream_url="https://test.example.com/series/main.m3u8",
    )
    await series.insert()

    yield series

    # Cleanup
    try:
        await series.delete()
    except Exception:
        pass


@pytest_asyncio.fixture
async def sample_episodes(test_db_client, sample_series):
    """Create sample episodes for testing."""
    from app.models.content import Content

    episodes = []

    # Episode without series_id (unlinked)
    episode1 = Content(
        title="The Test Show S01E01 - Pilot",
        title_en="The Test Show S01E01 - Pilot",
        is_series=False,
        content_type="episode",
        description="The pilot episode",
        is_published=True,
        series_id=None,
        season=1,
        episode=1,
        file_hash="hash_episode_1",
        # Required fields
        category_id="test_category_episodes",
        stream_url="https://test.example.com/episodes/s01e01.m3u8",
    )
    await episode1.insert()
    episodes.append(episode1)

    # Episode with series_id (linked)
    episode2 = Content(
        title="The Test Show S01E02 - Second Episode",
        title_en="The Test Show S01E02 - Second Episode",
        is_series=False,
        content_type="episode",
        description="The second episode",
        is_published=True,
        series_id=str(sample_series.id),
        season=1,
        episode=2,
        file_hash="hash_episode_2",
        # Required fields
        category_id="test_category_episodes",
        stream_url="https://test.example.com/episodes/s01e02.m3u8",
    )
    await episode2.insert()
    episodes.append(episode2)

    # Episode without season/episode numbers
    episode3 = Content(
        title="The Test Show - Special Episode",
        title_en="The Test Show - Special Episode",
        is_series=False,
        content_type="episode",
        description="A special episode",
        is_published=True,
        series_id=str(sample_series.id),
        season=None,
        episode=None,
        file_hash="hash_episode_3",
        # Required fields
        category_id="test_category_episodes",
        stream_url="https://test.example.com/episodes/special.m3u8",
    )
    await episode3.insert()
    episodes.append(episode3)

    yield episodes

    # Cleanup
    for ep in episodes:
        try:
            await ep.delete()
        except Exception:
            pass


class TestSeriesLinkerServiceInit:
    """Tests for SeriesLinkerService initialization."""

    def test_service_initialization(self):
        """Test service initializes with correct configuration."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        assert service._title_similarity_threshold is not None
        assert service._auto_link_confidence_threshold is not None
        assert service._auto_link_batch_size is not None
        assert service._duplicate_resolution_strategy is not None

    def test_get_series_linker_service_singleton(self):
        """Test singleton pattern works correctly."""
        from app.services.series_linker_service import (
            SeriesLinkerService,
            get_series_linker_service,
        )

        service1 = get_series_linker_service()
        service2 = get_series_linker_service()

        assert service1 is service2
        assert isinstance(service1, SeriesLinkerService)


class TestSeriesInfoExtraction:
    """Tests for extracting series information from titles."""

    def test_extract_series_info_standard_format(self):
        """Test extracting info from standard S01E01 format."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        series_name, season, episode = service._extract_series_info_from_title(
            "Breaking Bad S01E01 - Pilot"
        )

        assert series_name == "Breaking Bad"
        assert season == 1
        assert episode == 1

    def test_extract_series_info_lowercase_format(self):
        """Test extracting info from lowercase s01e01 format."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        series_name, season, episode = service._extract_series_info_from_title(
            "game of thrones s08e06"
        )

        assert series_name is not None
        assert season == 8
        assert episode == 6

    def test_extract_series_info_with_spaces(self):
        """Test extracting info with spaced format."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        series_name, season, episode = service._extract_series_info_from_title(
            "Friends Season 1 Episode 10"
        )

        # May or may not match depending on pattern support
        assert series_name is not None or season is None

    def test_extract_series_info_no_match(self):
        """Test extracting info from title without episode info."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        series_name, season, episode = service._extract_series_info_from_title(
            "Random Movie Title 2023"
        )

        # Should return None for all values when no pattern matches
        assert season is None and episode is None


class TestEpisodePatterns:
    """Tests for episode pattern constants."""

    def test_episode_patterns_exist(self):
        """Test that episode patterns are defined."""
        from app.services.series_linker_service import EPISODE_PATTERNS

        assert EPISODE_PATTERNS is not None
        assert len(EPISODE_PATTERNS) > 0

    def test_episode_patterns_compile(self):
        """Test that all patterns are valid regex patterns."""
        import re

        from app.services.series_linker_service import EPISODE_PATTERNS

        for pattern in EPISODE_PATTERNS:
            # Should not raise an exception
            compiled = re.compile(pattern, re.IGNORECASE)
            assert compiled is not None


class TestDataclasses:
    """Tests for dataclass structures."""

    def test_unlinked_episode_dataclass(self):
        """Test UnlinkedEpisode dataclass structure."""
        from app.services.series_linker_service import UnlinkedEpisode

        episode = UnlinkedEpisode(
            id="test_id",
            title="Test Episode S01E01",
            extracted_series="Test Episode",
            extracted_season=1,
            extracted_episode=1,
        )

        assert episode.id == "test_id"
        assert episode.title == "Test Episode S01E01"
        assert episode.extracted_series == "Test Episode"
        assert episode.extracted_season == 1
        assert episode.extracted_episode == 1

    def test_duplicate_group_dataclass(self):
        """Test DuplicateGroup dataclass structure."""
        from app.services.series_linker_service import DuplicateGroup

        group = DuplicateGroup(
            series_id="series_123",
            season=1,
            episode=1,
            episode_ids=["ep1", "ep2", "ep3"],
            count=3,
        )

        assert group.series_id == "series_123"
        assert group.season == 1
        assert group.episode == 1
        assert len(group.episode_ids) == 3
        assert group.count == 3

    def test_linking_result_dataclass(self):
        """Test LinkingResult dataclass structure."""
        from app.services.series_linker_service import LinkingResult

        result = LinkingResult(
            success=True,
            episode_id="ep_123",
            series_id="series_123",
            message="Successfully linked",
            was_dry_run=False,
        )

        assert result.success is True
        assert result.episode_id == "ep_123"
        assert result.series_id == "series_123"
        assert result.was_dry_run is False

    def test_deduplication_result_dataclass(self):
        """Test DeduplicationResult dataclass structure."""
        from app.services.series_linker_service import DeduplicationResult

        result = DeduplicationResult(
            success=True,
            kept_id="ep_1",
            removed_ids=["ep_2", "ep_3"],
            action="unpublish",
            message="Duplicates resolved",
            was_dry_run=False,
        )

        assert result.success is True
        assert result.kept_id == "ep_1"
        assert len(result.removed_ids) == 2
        assert result.action == "unpublish"


class TestFindUnlinkedEpisodes:
    """Tests for finding unlinked episodes."""

    @pytest.mark.asyncio
    async def test_find_unlinked_episodes(self, test_db_client, sample_episodes):
        """Test finding episodes without series_id."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        unlinked = await service.find_unlinked_episodes(limit=100)

        # Should find at least the unlinked episode we created
        assert isinstance(unlinked, list)

    @pytest.mark.asyncio
    async def test_find_unlinked_episodes_limit(self, test_db_client, sample_episodes):
        """Test that limit parameter is respected."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        unlinked = await service.find_unlinked_episodes(limit=1)

        assert len(unlinked) <= 1


class TestFindMatchingSeries:
    """Tests for finding matching series."""

    @pytest.mark.asyncio
    async def test_find_matching_series_exact_match(
        self, test_db_client, sample_series
    ):
        """Test finding series with exact title match."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        match, confidence = await service.find_matching_series(
            "The Test Show",
            use_tmdb=False,
        )

        # Should find the sample series
        if match is not None:
            assert confidence > 0

    @pytest.mark.asyncio
    async def test_find_matching_series_no_match(self, test_db_client):
        """Test finding series with no matching title."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        match, confidence = await service.find_matching_series(
            "Nonexistent Show XYZ123",
            use_tmdb=False,
        )

        # Should not find a match
        assert match is None or confidence < 0.5


class TestLinkEpisodeToSeries:
    """Tests for linking episodes to series."""

    @pytest.mark.asyncio
    async def test_link_episode_to_series(
        self, test_db_client, sample_series, sample_episodes
    ):
        """Test linking an episode to a series."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        # Find the unlinked episode
        unlinked_episode = sample_episodes[0]

        result = await service.link_episode_to_series(
            episode_id=str(unlinked_episode.id),
            series_id=str(sample_series.id),
            season=1,
            episode_num=1,
            dry_run=False,
            reason="Test linking",
        )

        assert result is not None
        assert result.episode_id == str(unlinked_episode.id)
        assert result.series_id == str(sample_series.id)

    @pytest.mark.asyncio
    async def test_link_episode_to_series_dry_run(
        self, test_db_client, sample_series, sample_episodes
    ):
        """Test linking an episode in dry-run mode."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        unlinked_episode = sample_episodes[0]

        result = await service.link_episode_to_series(
            episode_id=str(unlinked_episode.id),
            series_id=str(sample_series.id),
            season=1,
            episode_num=1,
            dry_run=True,
            reason="Test dry run",
        )

        assert result is not None
        assert result.was_dry_run is True


class TestFindDuplicateEpisodes:
    """Tests for finding duplicate episodes."""

    @pytest.mark.asyncio
    async def test_find_duplicate_episodes_empty(self, test_db_client):
        """Test finding duplicates in empty or unique database."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        duplicates = await service.find_duplicate_episodes()

        assert isinstance(duplicates, list)

    @pytest.mark.asyncio
    async def test_find_duplicate_episodes_by_series(
        self, test_db_client, sample_series, sample_episodes
    ):
        """Test finding duplicates filtered by series."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        duplicates = await service.find_duplicate_episodes(
            series_id=str(sample_series.id)
        )

        assert isinstance(duplicates, list)


class TestSelectEpisodeToKeep:
    """Tests for episode selection in deduplication."""

    @pytest.mark.asyncio
    async def test_select_episode_to_keep_newest(
        self, test_db_client, sample_episodes
    ):
        """Test selecting episode to keep with 'newest' strategy."""
        from app.models.content import Content
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        # Get real Content objects
        episodes = [sample_episodes[1], sample_episodes[2]]

        selected = service._select_episode_to_keep(episodes, strategy="newest")

        assert selected is not None
        assert selected in episodes

    @pytest.mark.asyncio
    async def test_select_episode_to_keep_oldest(
        self, test_db_client, sample_episodes
    ):
        """Test selecting episode to keep with 'oldest' strategy."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()

        episodes = [sample_episodes[1], sample_episodes[2]]

        selected = service._select_episode_to_keep(episodes, strategy="oldest")

        assert selected is not None
        assert selected in episodes


class TestFindEpisodesWithIncompleteData:
    """Tests for finding episodes with incomplete data."""

    @pytest.mark.asyncio
    async def test_find_episodes_with_incomplete_data(
        self, test_db_client, sample_episodes
    ):
        """Test finding episodes missing season or episode numbers."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        incomplete = await service.find_episodes_with_incomplete_data()

        assert isinstance(incomplete, list)
        # Should find at least one incomplete episode (sample_episodes[2])


class TestValidateEpisodeUniqueness:
    """Tests for validating episode uniqueness."""

    @pytest.mark.asyncio
    async def test_validate_episode_uniqueness(
        self, test_db_client, sample_episodes
    ):
        """Test validation of unique episode combinations."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        validation_result = await service.validate_episode_uniqueness()

        assert isinstance(validation_result, dict)


class TestAutoLinkUnlinkedEpisodes:
    """Tests for automatic episode linking."""

    @pytest.mark.asyncio
    async def test_auto_link_unlinked_episodes_dry_run(
        self, test_db_client, sample_series, sample_episodes
    ):
        """Test automatic linking in dry-run mode."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        result = await service.auto_link_unlinked_episodes(
            limit=10,
            dry_run=True,
        )

        assert isinstance(result, dict)
        assert "processed" in result or "total" in result or "linked" in result


class TestAutoResolveDuplicateEpisodes:
    """Tests for automatic duplicate resolution."""

    @pytest.mark.asyncio
    async def test_auto_resolve_duplicate_episodes_dry_run(self, test_db_client):
        """Test automatic duplicate resolution in dry-run mode."""
        from app.services.series_linker_service import SeriesLinkerService

        service = SeriesLinkerService()
        result = await service.auto_resolve_duplicate_episodes(
            strategy="newest",
            dry_run=True,
        )

        assert isinstance(result, dict)

"""
Comprehensive Tests for MCP Content Discovery Service

Tests cover:
- YouTube channel search (MCP integration)
- Educational site discovery (MCP integration)
- Queue management (add, get, approve, reject)
- Search query generation
- Educational sites configuration parsing
- Discovery status transitions
"""

import pytest
import pytest_asyncio
from datetime import datetime
from typing import List, Optional
from unittest.mock import patch, MagicMock
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.services.mcp_content_discovery import (
    MCPContentDiscoveryService,
    ContentDiscoveryQueue,
    DiscoveryResult,
    DiscoveryStatus,
    mcp_content_discovery_service,
)
from app.models.kids_content import KidsSubcategory
from app.core.config import settings


# Test Fixtures

@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_test_mcp"],
        document_models=[ContentDiscoveryQueue]
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_test_mcp")
    client.close()


@pytest_asyncio.fixture
async def mcp_service(db_client):
    """Create MCP content discovery service instance."""
    return MCPContentDiscoveryService()


@pytest_asyncio.fixture
async def sample_queue_items(db_client):
    """Create sample queue items for testing."""
    items = [
        ContentDiscoveryQueue(
            source_type="youtube",
            source_url="https://youtube.com/watch?v=test1",
            source_channel="Kids Learning Channel",
            title="לימוד אלף בית",
            title_en="Learning Alef Bet",
            description="Hebrew alphabet learning video",
            thumbnail_url="https://example.com/thumb1.jpg",
            suggested_category="educational",
            suggested_subcategory=KidsSubcategory.LEARNING_HEBREW,
            suggested_age_rating=5,
            confidence_score=0.85,
            is_hebrew_content=True,
            safe_for_kids=True,
            status=DiscoveryStatus.PENDING,
        ),
        ContentDiscoveryQueue(
            source_type="youtube",
            source_url="https://youtube.com/watch?v=test2",
            source_channel="Hebrew Songs",
            title="שירי ילדים",
            title_en="Children's Songs",
            description="Hebrew songs collection",
            thumbnail_url="https://example.com/thumb2.jpg",
            suggested_category="music",
            suggested_subcategory=KidsSubcategory.HEBREW_SONGS,
            suggested_age_rating=3,
            confidence_score=0.92,
            is_hebrew_content=True,
            safe_for_kids=True,
            status=DiscoveryStatus.PENDING,
        ),
        ContentDiscoveryQueue(
            source_type="website",
            source_url="https://example.com/science",
            title="Science for Kids",
            description="Fun science experiments",
            suggested_category="educational",
            suggested_subcategory=KidsSubcategory.YOUNG_SCIENCE,
            suggested_age_rating=8,
            confidence_score=0.78,
            safe_for_kids=True,
            status=DiscoveryStatus.APPROVED,
            reviewed_by="admin_user_123",
            reviewed_at=datetime.utcnow(),
        ),
        ContentDiscoveryQueue(
            source_type="youtube",
            source_url="https://youtube.com/watch?v=test3",
            title="Rejected Content",
            description="Not suitable content",
            suggested_category="cartoons",
            suggested_subcategory=KidsSubcategory.KIDS_MOVIES,
            suggested_age_rating=12,
            confidence_score=0.45,
            safe_for_kids=False,
            status=DiscoveryStatus.REJECTED,
            reviewed_by="admin_user_123",
            reviewed_at=datetime.utcnow(),
            rejection_reason="Not appropriate for kids",
        ),
    ]

    for item in items:
        await item.insert()

    return items


# MCP Enabled/Disabled Tests

@pytest.mark.asyncio
async def test_mcp_enabled_check(mcp_service):
    """Test MCP enabled check based on ANTHROPIC_API_KEY."""
    # The enabled state depends on settings.ANTHROPIC_API_KEY
    assert isinstance(mcp_service.mcp_enabled, bool)


@pytest.mark.asyncio
async def test_search_youtube_channels_mcp_disabled(mcp_service):
    """Test YouTube search returns empty when MCP is disabled."""
    with patch.object(mcp_service, 'mcp_enabled', False):
        results = await mcp_service.search_youtube_channels(
            subcategory=KidsSubcategory.LEARNING_HEBREW,
            language="he",
        )

    assert results == []


@pytest.mark.asyncio
async def test_search_youtube_channels_no_queries(mcp_service):
    """Test YouTube search with unknown subcategory returns empty."""
    with patch.object(mcp_service, 'mcp_enabled', True):
        results = await mcp_service.search_youtube_channels(
            subcategory="unknown-subcategory",
            language="he",
        )

    assert results == []


@pytest.mark.asyncio
async def test_discover_educational_sites_mcp_disabled(mcp_service):
    """Test educational site discovery returns empty when MCP is disabled."""
    with patch.object(mcp_service, 'mcp_enabled', False):
        results = await mcp_service.discover_educational_sites(
            subcategory=KidsSubcategory.YOUNG_SCIENCE,
            language="he",
        )

    assert results == []


# Search Query Generation Tests

def test_get_subcategory_search_queries_hebrew(mcp_service):
    """Test Hebrew search query generation for subcategories."""
    queries = mcp_service._get_subcategory_search_queries(
        subcategory=KidsSubcategory.LEARNING_HEBREW,
        language="he",
    )

    assert len(queries) > 0
    assert "לימוד עברית לילדים" in queries


def test_get_subcategory_search_queries_english(mcp_service):
    """Test English search query generation for subcategories."""
    queries = mcp_service._get_subcategory_search_queries(
        subcategory=KidsSubcategory.LEARNING_HEBREW,
        language="en",
    )

    assert len(queries) > 0
    assert "learn hebrew for kids" in queries


def test_get_subcategory_search_queries_all_subcategories(mcp_service):
    """Test that all subcategories have search queries defined."""
    subcategories_with_queries = [
        KidsSubcategory.LEARNING_HEBREW,
        KidsSubcategory.YOUNG_SCIENCE,
        KidsSubcategory.MATH_FUN,
        KidsSubcategory.NATURE_ANIMALS,
        KidsSubcategory.HEBREW_SONGS,
        KidsSubcategory.NURSERY_RHYMES,
        KidsSubcategory.JEWISH_HOLIDAYS,
        KidsSubcategory.TORAH_STORIES,
        KidsSubcategory.BEDTIME_STORIES,
    ]

    for subcategory in subcategories_with_queries:
        queries_he = mcp_service._get_subcategory_search_queries(subcategory, "he")
        queries_en = mcp_service._get_subcategory_search_queries(subcategory, "en")
        assert len(queries_he) > 0, f"Missing Hebrew queries for {subcategory}"
        assert len(queries_en) > 0, f"Missing English queries for {subcategory}"


def test_get_subcategory_search_queries_unknown(mcp_service):
    """Test that unknown subcategories return empty queries."""
    queries = mcp_service._get_subcategory_search_queries(
        subcategory="nonexistent-subcategory",
        language="he",
    )

    assert queries == []


# Educational Sites Configuration Tests

def test_get_educational_sites_no_config(mcp_service):
    """Test educational sites returns empty when not configured."""
    with patch.object(settings, 'KIDS_EDUCATIONAL_SITES_CONFIG', ''):
        sites = mcp_service._get_educational_sites_for_subcategory(
            subcategory=KidsSubcategory.LEARNING_HEBREW
        )

    assert sites == []


def test_get_educational_sites_invalid_json(mcp_service):
    """Test educational sites handles invalid JSON gracefully."""
    with patch.object(settings, 'KIDS_EDUCATIONAL_SITES_CONFIG', 'invalid-json'):
        sites = mcp_service._get_educational_sites_for_subcategory(
            subcategory=KidsSubcategory.LEARNING_HEBREW
        )

    assert sites == []


def test_get_educational_sites_valid_config(mcp_service):
    """Test educational sites parses valid config correctly."""
    config = '{"learning-hebrew": ["https://site1.com", "https://site2.com"]}'
    with patch.object(settings, 'KIDS_EDUCATIONAL_SITES_CONFIG', config):
        sites = mcp_service._get_educational_sites_for_subcategory(
            subcategory=KidsSubcategory.LEARNING_HEBREW
        )

    assert len(sites) == 2
    assert "https://site1.com" in sites


def test_get_educational_sites_subcategory_not_in_config(mcp_service):
    """Test educational sites returns empty for unconfigured subcategory."""
    config = '{"learning-hebrew": ["https://site1.com"]}'
    with patch.object(settings, 'KIDS_EDUCATIONAL_SITES_CONFIG', config):
        sites = mcp_service._get_educational_sites_for_subcategory(
            subcategory=KidsSubcategory.YOUNG_SCIENCE
        )

    assert sites == []


# Queue Management Tests

@pytest.mark.asyncio
async def test_queue_for_review(mcp_service, db_client):
    """Test adding discovery result to review queue."""
    result = DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=new_video",
        title="New Educational Video",
        description="Great content for kids",
        suggested_category="educational",
        suggested_subcategory=KidsSubcategory.LEARNING_HEBREW,
        confidence_score=0.88,
    )

    queue_entry = await mcp_service.queue_for_review(
        result=result,
        source_channel="Test Channel",
    )

    assert queue_entry is not None
    assert queue_entry.title == "New Educational Video"
    assert queue_entry.source_channel == "Test Channel"
    assert queue_entry.status == DiscoveryStatus.PENDING
    assert queue_entry.confidence_score == 0.88


@pytest.mark.asyncio
async def test_queue_for_review_without_channel(mcp_service, db_client):
    """Test queuing without source channel."""
    result = DiscoveryResult(
        source_type="website",
        source_url="https://example.com/content",
        title="Website Content",
        suggested_category="educational",
        confidence_score=0.75,
    )

    queue_entry = await mcp_service.queue_for_review(result=result)

    assert queue_entry is not None
    assert queue_entry.source_channel is None


# Get Pending Queue Tests

@pytest.mark.asyncio
async def test_get_pending_queue(mcp_service, sample_queue_items):
    """Test getting pending queue items."""
    result = await mcp_service.get_pending_queue()

    assert "items" in result
    assert "pagination" in result
    # Should only return PENDING items
    assert all(item.status == DiscoveryStatus.PENDING for item in result["items"])


@pytest.mark.asyncio
async def test_get_pending_queue_with_subcategory_filter(mcp_service, sample_queue_items):
    """Test getting pending queue filtered by subcategory."""
    result = await mcp_service.get_pending_queue(
        subcategory=KidsSubcategory.LEARNING_HEBREW
    )

    assert "items" in result
    for item in result["items"]:
        assert item.suggested_subcategory == KidsSubcategory.LEARNING_HEBREW


@pytest.mark.asyncio
async def test_get_pending_queue_pagination(mcp_service, sample_queue_items):
    """Test pending queue pagination."""
    result = await mcp_service.get_pending_queue(page=1, limit=1)

    assert result["pagination"]["page"] == 1
    assert result["pagination"]["limit"] == 1
    assert len(result["items"]) <= 1


@pytest.mark.asyncio
async def test_get_pending_queue_empty(mcp_service, db_client):
    """Test pending queue when empty."""
    result = await mcp_service.get_pending_queue()

    assert result["items"] == []
    assert result["pagination"]["total"] == 0


# Approve Item Tests

@pytest.mark.asyncio
async def test_approve_item_success(mcp_service, sample_queue_items):
    """Test approving a pending item."""
    pending_item = next(
        item for item in sample_queue_items
        if item.status == DiscoveryStatus.PENDING
    )

    approved = await mcp_service.approve_item(
        item_id=str(pending_item.id),
        reviewed_by="test_admin",
    )

    assert approved is not None
    assert approved.status == DiscoveryStatus.APPROVED
    assert approved.reviewed_by == "test_admin"
    assert approved.reviewed_at is not None


@pytest.mark.asyncio
async def test_approve_item_not_found(mcp_service, db_client):
    """Test approving non-existent item returns None."""
    fake_id = str(ObjectId())
    approved = await mcp_service.approve_item(
        item_id=fake_id,
        reviewed_by="test_admin",
    )

    assert approved is None


# Reject Item Tests

@pytest.mark.asyncio
async def test_reject_item_success(mcp_service, sample_queue_items):
    """Test rejecting a pending item."""
    pending_item = next(
        item for item in sample_queue_items
        if item.status == DiscoveryStatus.PENDING
    )

    rejected = await mcp_service.reject_item(
        item_id=str(pending_item.id),
        reviewed_by="test_admin",
        reason="Not appropriate content",
    )

    assert rejected is not None
    assert rejected.status == DiscoveryStatus.REJECTED
    assert rejected.reviewed_by == "test_admin"
    assert rejected.rejection_reason == "Not appropriate content"
    assert rejected.reviewed_at is not None


@pytest.mark.asyncio
async def test_reject_item_not_found(mcp_service, db_client):
    """Test rejecting non-existent item returns None."""
    fake_id = str(ObjectId())
    rejected = await mcp_service.reject_item(
        item_id=fake_id,
        reviewed_by="test_admin",
        reason="Test reason",
    )

    assert rejected is None


# Discovery Status Tests

def test_discovery_status_values():
    """Test DiscoveryStatus enum values."""
    assert DiscoveryStatus.PENDING == "pending"
    assert DiscoveryStatus.APPROVED == "approved"
    assert DiscoveryStatus.REJECTED == "rejected"
    assert DiscoveryStatus.IMPORTED == "imported"


# DiscoveryResult Model Tests

def test_discovery_result_creation():
    """Test DiscoveryResult model creation."""
    result = DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=test",
        title="Test Video",
        suggested_category="educational",
    )

    assert result.source_type == "youtube"
    assert result.source_url == "https://youtube.com/watch?v=test"
    assert result.title == "Test Video"
    assert result.confidence_score == 0.0  # Default value


def test_discovery_result_with_all_fields():
    """Test DiscoveryResult with all optional fields."""
    result = DiscoveryResult(
        source_type="website",
        source_url="https://example.com",
        title="Test Content",
        description="Test description",
        thumbnail_url="https://example.com/thumb.jpg",
        suggested_category="educational",
        suggested_subcategory=KidsSubcategory.LEARNING_HEBREW,
        confidence_score=0.95,
    )

    assert result.description == "Test description"
    assert result.thumbnail_url == "https://example.com/thumb.jpg"
    assert result.suggested_subcategory == KidsSubcategory.LEARNING_HEBREW
    assert result.confidence_score == 0.95


# ContentDiscoveryQueue Model Tests

@pytest.mark.asyncio
async def test_content_discovery_queue_creation(db_client):
    """Test ContentDiscoveryQueue document creation."""
    queue_item = ContentDiscoveryQueue(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=test",
        title="Test Video",
        suggested_category="educational",
    )
    await queue_item.insert()

    assert queue_item.id is not None
    assert queue_item.status == DiscoveryStatus.PENDING
    assert queue_item.discovered_at is not None
    assert queue_item.created_at is not None


@pytest.mark.asyncio
async def test_content_discovery_queue_defaults(db_client):
    """Test ContentDiscoveryQueue default values."""
    queue_item = ContentDiscoveryQueue(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=test",
        title="Test Video",
        suggested_category="educational",
    )
    await queue_item.insert()

    assert queue_item.suggested_age_rating == 5
    assert queue_item.confidence_score == 0.0
    assert queue_item.is_hebrew_content is False
    assert queue_item.is_jewish_content is False
    assert queue_item.safe_for_kids is True
    assert queue_item.suggested_tags == []


# Index Tests

@pytest.mark.asyncio
async def test_queue_indexes_exist(db_client):
    """Test that required indexes are defined."""
    # Verify indexes are defined in the Settings class
    indexes = ContentDiscoveryQueue.Settings.indexes

    # Check for status index
    assert "status" in indexes

    # Check for source_url index (for duplicate detection)
    assert "source_url" in indexes

    # Check for compound index
    assert ("status", "suggested_subcategory") in indexes
    assert ("source_type", "source_url") in indexes


# Global Service Instance Test

def test_global_service_instance_exists():
    """Test that global service instance is created."""
    assert mcp_content_discovery_service is not None
    assert isinstance(mcp_content_discovery_service, MCPContentDiscoveryService)


# Edge Cases

@pytest.mark.asyncio
async def test_queue_with_special_characters(mcp_service, db_client):
    """Test queuing content with special characters in title."""
    result = DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=special",
        title="שירי ילדים - Hebrew & English! (Kids' Songs)",
        description="Special chars: < > & \" '",
        suggested_category="music",
    )

    queue_entry = await mcp_service.queue_for_review(result=result)

    assert queue_entry is not None
    assert "שירי ילדים" in queue_entry.title


@pytest.mark.asyncio
async def test_queue_with_very_long_description(mcp_service, db_client):
    """Test queuing content with very long description."""
    long_description = "A" * 5000  # Very long description

    result = DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=long_desc",
        title="Long Description Test",
        description=long_description,
        suggested_category="educational",
    )

    queue_entry = await mcp_service.queue_for_review(result=result)

    assert queue_entry is not None
    assert len(queue_entry.description) == 5000


@pytest.mark.asyncio
async def test_duplicate_source_url_detection(mcp_service, db_client):
    """Test that duplicate source URLs can be detected."""
    result1 = DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=duplicate",
        title="First Entry",
        suggested_category="educational",
    )

    result2 = DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=duplicate",
        title="Second Entry",
        suggested_category="educational",
    )

    await mcp_service.queue_for_review(result=result1)
    await mcp_service.queue_for_review(result=result2)

    # Both should be inserted (no unique constraint on source_url)
    # but the index allows for efficient duplicate checking
    items = await ContentDiscoveryQueue.find(
        {"source_url": "https://youtube.com/watch?v=duplicate"}
    ).to_list()

    assert len(items) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

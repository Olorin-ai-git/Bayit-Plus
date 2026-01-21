"""
Comprehensive Tests for Kids Content Service

Tests cover:
- Subcategory detection and filtering
- Age group classification
- Content categorization
- Keyword-based relevance scoring
- Cache functionality
- Featured content retrieval
- Subcategory and age group listing
"""

from datetime import datetime
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.kids_content import (
    AGE_GROUP_RANGES,
    SUBCATEGORY_PARENT_MAP,
    KidsAgeGroup,
    KidsAgeGroupsResponse,
    KidsContentAggregatedResponse,
    KidsSubcategoriesResponse,
    KidsSubcategory,
)
from app.services.kids_content_service import (
    KIDS_KEYWORDS_EN,
    KIDS_KEYWORDS_HE,
    KidsContentService,
)
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Test Fixtures


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_test_kids"],
        document_models=[Content, ContentSection, SectionSubcategory],
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_test_kids")
    client.close()


@pytest_asyncio.fixture
async def kids_service(db_client):
    """Create kids content service instance."""
    service = KidsContentService()
    service.clear_cache()
    return service


@pytest_asyncio.fixture
async def kids_section(db_client):
    """Create kids section for testing."""
    section = ContentSection(
        slug="kids",
        name_key="taxonomy.sections.kids",
        icon="baby",
        color="#FF6B35",
        order=3,
        is_active=True,
        show_on_homepage=True,
        supports_subcategories=True,
    )
    await section.insert()
    return section


@pytest_asyncio.fixture
async def kids_subcategories(db_client, kids_section):
    """Create kids subcategories for testing."""
    subcategories = [
        SectionSubcategory(
            section_id=str(kids_section.id),
            slug="learning-hebrew",
            name_key="taxonomy.subcategories.learning-hebrew",
            description_key="taxonomy.subcategories.learning-hebrew.description",
            icon="book-open",
            order=1,
            is_active=True,
        ),
        SectionSubcategory(
            section_id=str(kids_section.id),
            slug="hebrew-songs",
            name_key="taxonomy.subcategories.hebrew-songs",
            icon="music",
            order=6,
            is_active=True,
        ),
        SectionSubcategory(
            section_id=str(kids_section.id),
            slug="kids-movies",
            name_key="taxonomy.subcategories.kids-movies",
            icon="film",
            order=8,
            is_active=True,
        ),
        SectionSubcategory(
            section_id=str(kids_section.id),
            slug="torah-stories",
            name_key="taxonomy.subcategories.torah-stories",
            icon="scroll",
            order=11,
            is_active=True,
        ),
    ]
    for sub in subcategories:
        await sub.insert()
    return subcategories


@pytest_asyncio.fixture
async def sample_kids_content(db_client):
    """Create sample kids content for testing."""
    content_items = [
        Content(
            title="לימוד אלף בית לילדים",
            title_en="Learning Hebrew Alphabet for Kids",
            description="שיעורי אלף בית בעברית לילדים",
            description_en="Hebrew alphabet lessons for children",
            content_type="vod",
            genres=["Educational", "Kids"],
            year=2023,
            rating=4.8,
            duration_minutes=15,
            is_kids_content=True,
            age_rating=3,
            thumbnail="https://example.com/alefbet.jpg",
            published=True,
        ),
        Content(
            title="שירי ילדים בעברית",
            title_en="Hebrew Kids Songs",
            description="אוסף שירי ילדים קלאסיים בעברית",
            description_en="Collection of classic Hebrew children's songs",
            content_type="vod",
            genres=["Music", "Kids"],
            year=2022,
            rating=4.5,
            duration_minutes=30,
            is_kids_content=True,
            age_rating=2,
            thumbnail="https://example.com/songs.jpg",
            published=True,
        ),
        Content(
            title="סיפורי תורה לילדים",
            title_en="Torah Stories for Kids",
            description="סיפורים מהתורה המותאמים לילדים",
            description_en="Torah stories adapted for children",
            content_type="vod",
            genres=["Jewish", "Educational", "Kids"],
            year=2021,
            rating=4.9,
            duration_minutes=20,
            is_kids_content=True,
            age_rating=5,
            thumbnail="https://example.com/torah.jpg",
            published=True,
        ),
        Content(
            title="Animated Movie for Kids",
            title_en="Animated Movie for Kids",
            description="A fun animated movie for the whole family",
            description_en="A fun animated movie for the whole family",
            content_type="vod",
            genres=["Animation", "Kids", "Comedy"],
            year=2023,
            rating=4.2,
            duration_minutes=90,
            is_kids_content=True,
            age_rating=7,
            thumbnail="https://example.com/animated.jpg",
            published=True,
        ),
        Content(
            title="מדע לילדים - ניסויים",
            title_en="Science for Kids - Experiments",
            description="ניסויים מדעיים פשוטים לילדים",
            description_en="Simple science experiments for children",
            content_type="vod",
            genres=["Educational", "Science", "Kids"],
            year=2023,
            rating=4.6,
            duration_minutes=25,
            is_kids_content=True,
            age_rating=8,
            thumbnail="https://example.com/science.jpg",
            published=True,
        ),
    ]

    for item in content_items:
        await item.insert()

    return content_items


# Subcategory Detection Tests


@pytest.mark.asyncio
async def test_detect_subcategory_learning_hebrew(kids_service):
    """Test detection of learning-hebrew subcategory."""
    content = MagicMock()
    content.title = "לימוד עברית לילדים"
    content.title_en = "Learning Hebrew for Kids"
    content.description = "שיעורי אלף בית"
    content.description_en = "Alphabet lessons"
    content.genres = ["Educational"]

    subcategory = kids_service._detect_subcategory(content)
    assert subcategory == KidsSubcategory.LEARNING_HEBREW


@pytest.mark.asyncio
async def test_detect_subcategory_hebrew_songs(kids_service):
    """Test detection of hebrew-songs subcategory."""
    content = MagicMock()
    content.title = "שירי ילדים בעברית"
    content.title_en = "Hebrew Songs for Kids"
    content.description = "שירים ומוסיקה"
    content.description_en = "Songs and music"
    content.genres = ["Music"]

    subcategory = kids_service._detect_subcategory(content)
    assert subcategory == KidsSubcategory.HEBREW_SONGS


@pytest.mark.asyncio
async def test_detect_subcategory_torah_stories(kids_service):
    """Test detection of torah-stories subcategory."""
    content = MagicMock()
    content.title = "סיפורי תורה"
    content.title_en = "Torah Stories"
    content.description = "סיפורים מהתנך"
    content.description_en = "Stories from the Bible"
    content.genres = ["Jewish", "Educational"]

    subcategory = kids_service._detect_subcategory(content)
    assert subcategory == KidsSubcategory.TORAH_STORIES


@pytest.mark.asyncio
async def test_detect_subcategory_young_science(kids_service):
    """Test detection of young-science subcategory."""
    content = MagicMock()
    content.title = "מדע לילדים"
    content.title_en = "Science for Kids"
    content.description = "ניסויים מדעיים"
    content.description_en = "Science experiments"
    content.genres = ["Educational", "Science"]

    subcategory = kids_service._detect_subcategory(content)
    assert subcategory == KidsSubcategory.YOUNG_SCIENCE


# Age Group Classification Tests


@pytest.mark.asyncio
async def test_determine_age_group_toddlers(kids_service):
    """Test age group classification for toddlers (0-3)."""
    age_group = kids_service._determine_age_group(2)
    assert age_group == KidsAgeGroup.TODDLERS


@pytest.mark.asyncio
async def test_determine_age_group_preschool(kids_service):
    """Test age group classification for preschool (3-5)."""
    age_group = kids_service._determine_age_group(4)
    assert age_group == KidsAgeGroup.PRESCHOOL


@pytest.mark.asyncio
async def test_determine_age_group_elementary(kids_service):
    """Test age group classification for elementary (5-10)."""
    age_group = kids_service._determine_age_group(7)
    assert age_group == KidsAgeGroup.ELEMENTARY


@pytest.mark.asyncio
async def test_determine_age_group_preteen(kids_service):
    """Test age group classification for pre-teen (10-12)."""
    age_group = kids_service._determine_age_group(11)
    assert age_group == KidsAgeGroup.PRETEEN


@pytest.mark.asyncio
async def test_determine_age_group_none(kids_service):
    """Test age group classification returns None for invalid age."""
    age_group = kids_service._determine_age_group(None)
    assert age_group is None


# Content Categorization Tests


@pytest.mark.asyncio
async def test_categorize_content_educational(kids_service):
    """Test content categorization for educational content."""
    content = MagicMock()
    content.title = "Learning Math"
    content.title_en = "Learning Math"
    content.description = "Educational math content"
    content.description_en = "Educational math content"
    content.genres = ["Educational"]

    category = kids_service._categorize_content(content)
    assert category == "educational"


@pytest.mark.asyncio
async def test_categorize_content_music(kids_service):
    """Test content categorization for music content."""
    content = MagicMock()
    content.title = "Kids Songs"
    content.title_en = "Kids Songs"
    content.description = "Fun songs for children"
    content.description_en = "Fun songs for children"
    content.genres = ["Music"]

    category = kids_service._categorize_content(content)
    assert category == "music"


@pytest.mark.asyncio
async def test_categorize_content_jewish(kids_service):
    """Test content categorization for Jewish content."""
    content = MagicMock()
    content.title = "Shabbat Stories"
    content.title_en = "Shabbat Stories"
    content.description = "Stories about Shabbat"
    content.description_en = "Stories about Shabbat"
    content.genres = ["Jewish"]

    category = kids_service._categorize_content(content)
    assert category == "jewish"


# Relevance Score Tests


@pytest.mark.asyncio
async def test_calculate_relevance_score_high(kids_service):
    """Test high relevance score for Hebrew educational content."""
    content = MagicMock()
    content.title = "לימוד עברית לילדים"
    content.title_en = "Learning Hebrew for Kids"
    content.description = "שיעורי אלף בית בעברית לילדים"
    content.description_en = "Hebrew alphabet lessons for children"
    content.rating = 4.8
    content.genres = ["Educational", "Kids"]
    content.is_kids_content = True

    score = kids_service._calculate_relevance_score(content)
    assert score > 50  # High relevance for Hebrew educational content


@pytest.mark.asyncio
async def test_calculate_relevance_score_medium(kids_service):
    """Test medium relevance score for general kids content."""
    content = MagicMock()
    content.title = "Fun Cartoon"
    content.title_en = "Fun Cartoon"
    content.description = "A fun cartoon for kids"
    content.description_en = "A fun cartoon for kids"
    content.rating = 3.5
    content.genres = ["Animation"]
    content.is_kids_content = True

    score = kids_service._calculate_relevance_score(content)
    assert 10 <= score <= 50


# Get Subcategories Tests


@pytest.mark.asyncio
async def test_get_subcategories_returns_all(kids_service, kids_subcategories):
    """Test that get_subcategories returns all active subcategories."""
    result = await kids_service.get_subcategories()

    assert isinstance(result, KidsSubcategoriesResponse)
    assert len(result.subcategories) >= 4


@pytest.mark.asyncio
async def test_get_subcategories_has_correct_structure(
    kids_service, kids_subcategories
):
    """Test that subcategories have correct structure."""
    result = await kids_service.get_subcategories()

    for subcategory in result.subcategories:
        assert subcategory.slug is not None
        assert subcategory.name is not None
        assert subcategory.icon is not None


# Get Age Groups Tests


@pytest.mark.asyncio
async def test_get_age_groups_returns_all(kids_service):
    """Test that get_age_groups returns all age groups."""
    result = await kids_service.get_age_groups()

    assert isinstance(result, KidsAgeGroupsResponse)
    assert len(result.age_groups) == 4


@pytest.mark.asyncio
async def test_get_age_groups_has_correct_structure(kids_service):
    """Test that age groups have correct structure."""
    result = await kids_service.get_age_groups()

    for age_group in result.age_groups:
        assert age_group.slug is not None
        assert age_group.name is not None
        assert age_group.min_age is not None
        assert age_group.max_age is not None


@pytest.mark.asyncio
async def test_get_age_groups_order(kids_service):
    """Test that age groups are in correct order."""
    result = await kids_service.get_age_groups()
    slugs = [ag.slug for ag in result.age_groups]

    expected_order = [
        KidsAgeGroup.TODDLERS,
        KidsAgeGroup.PRESCHOOL,
        KidsAgeGroup.ELEMENTARY,
        KidsAgeGroup.PRETEEN,
    ]
    assert slugs == expected_order


# Fetch All Content Tests


@pytest.mark.asyncio
async def test_fetch_all_content_returns_kids_only(kids_service, sample_kids_content):
    """Test that fetch_all_content returns only kids content."""
    result = await kids_service.fetch_all_content()

    assert isinstance(result, KidsContentAggregatedResponse)
    assert result.success is True
    # All returned content should be kids content
    for item in result.items:
        assert item.get("is_kids_content") is True


@pytest.mark.asyncio
async def test_fetch_all_content_with_age_filter(kids_service, sample_kids_content):
    """Test fetch_all_content with age filter."""
    result = await kids_service.fetch_all_content(age_max=5)

    assert result.success is True
    for item in result.items:
        age_rating = item.get("age_rating", 0)
        assert age_rating <= 5


@pytest.mark.asyncio
async def test_fetch_all_content_pagination(kids_service, sample_kids_content):
    """Test fetch_all_content pagination."""
    page1 = await kids_service.fetch_all_content(page=1, limit=2)
    page2 = await kids_service.fetch_all_content(page=2, limit=2)

    assert page1.pagination.page == 1
    assert page2.pagination.page == 2
    assert len(page1.items) <= 2
    assert len(page2.items) <= 2


# Get Content by Subcategory Tests


@pytest.mark.asyncio
async def test_get_content_by_subcategory(
    kids_service, sample_kids_content, kids_subcategories
):
    """Test getting content by specific subcategory."""
    result = await kids_service.get_content_by_subcategory(
        subcategory_slug="learning-hebrew"
    )

    assert isinstance(result, KidsContentAggregatedResponse)
    assert result.success is True


@pytest.mark.asyncio
async def test_get_content_by_subcategory_with_age_filter(
    kids_service, sample_kids_content, kids_subcategories
):
    """Test getting content by subcategory with age filter."""
    result = await kids_service.get_content_by_subcategory(
        subcategory_slug="hebrew-songs",
        age_max=5,
    )

    assert result.success is True
    for item in result.items:
        age_rating = item.get("age_rating", 0)
        assert age_rating <= 5


# Get Content by Age Group Tests


@pytest.mark.asyncio
async def test_get_content_by_age_group_toddlers(kids_service, sample_kids_content):
    """Test getting content for toddlers age group."""
    result = await kids_service.get_content_by_age_group(
        age_group_slug=KidsAgeGroup.TODDLERS
    )

    assert isinstance(result, KidsContentAggregatedResponse)
    assert result.success is True
    # Toddlers content should have low age rating
    for item in result.items:
        age_rating = item.get("age_rating", 0)
        assert age_rating <= 3


@pytest.mark.asyncio
async def test_get_content_by_age_group_elementary(kids_service, sample_kids_content):
    """Test getting content for elementary age group."""
    result = await kids_service.get_content_by_age_group(
        age_group_slug=KidsAgeGroup.ELEMENTARY
    )

    assert result.success is True


# Get Categories Tests


@pytest.mark.asyncio
async def test_get_categories_returns_list(kids_service):
    """Test that get_categories returns a list."""
    categories = await kids_service.get_categories()

    assert isinstance(categories, list)
    assert len(categories) > 0


@pytest.mark.asyncio
async def test_get_categories_structure(kids_service):
    """Test that categories have correct structure."""
    categories = await kids_service.get_categories()

    for category in categories:
        assert "id" in category
        assert "name" in category


# Cache Tests


@pytest.mark.asyncio
async def test_cache_clear(kids_service, sample_kids_content):
    """Test that cache clearing works."""
    # Fetch content to populate cache
    await kids_service.fetch_all_content()

    # Clear cache
    kids_service.clear_cache()

    # Cache should be empty
    cache_data = kids_service._cache.get("all")
    assert cache_data is None


@pytest.mark.asyncio
async def test_cache_ttl_functionality(kids_service):
    """Test cache TTL functionality."""
    # Set a value in cache
    test_data = [{"id": "test", "title": "Test Content"}]
    kids_service._cache.set("test_key", test_data)

    # Should be retrievable
    cached = kids_service._cache.get("test_key")
    assert cached is not None
    assert cached[0]["id"] == "test"


# Featured Content Tests


@pytest.mark.asyncio
async def test_get_featured_content(kids_service, sample_kids_content):
    """Test getting featured kids content."""
    result = await kids_service.get_featured_content()

    assert result.success is True
    assert len(result.featured) <= 10  # Featured should be limited


@pytest.mark.asyncio
async def test_get_featured_content_with_age_filter(kids_service, sample_kids_content):
    """Test getting featured content with age filter."""
    result = await kids_service.get_featured_content(age_max=5)

    assert result.success is True
    for item in result.featured:
        age_rating = item.get("age_rating", 0)
        assert age_rating <= 5


# Edge Cases


@pytest.mark.asyncio
async def test_empty_database(kids_service, db_client):
    """Test behavior with empty database."""
    result = await kids_service.fetch_all_content()

    assert result.success is True
    # Should return fallback/seed content when database is empty


@pytest.mark.asyncio
async def test_invalid_subcategory_slug(kids_service, sample_kids_content):
    """Test getting content with invalid subcategory slug."""
    result = await kids_service.get_content_by_subcategory(
        subcategory_slug="non-existent-subcategory"
    )

    assert result.success is True
    assert len(result.items) == 0


@pytest.mark.asyncio
async def test_invalid_age_group_slug(kids_service, sample_kids_content):
    """Test getting content with invalid age group slug."""
    result = await kids_service.get_content_by_age_group(
        age_group_slug="invalid-age-group"
    )

    assert result.success is True
    # Should return empty or handle gracefully


# Constants Verification Tests


def test_subcategory_parent_map_completeness():
    """Test that all subcategories have parent mappings."""
    for subcategory in [
        KidsSubcategory.LEARNING_HEBREW,
        KidsSubcategory.YOUNG_SCIENCE,
        KidsSubcategory.MATH_FUN,
        KidsSubcategory.NATURE_ANIMALS,
        KidsSubcategory.INTERACTIVE,
        KidsSubcategory.HEBREW_SONGS,
        KidsSubcategory.NURSERY_RHYMES,
        KidsSubcategory.KIDS_MOVIES,
        KidsSubcategory.KIDS_SERIES,
        KidsSubcategory.JEWISH_HOLIDAYS,
        KidsSubcategory.TORAH_STORIES,
        KidsSubcategory.BEDTIME_STORIES,
    ]:
        assert subcategory in SUBCATEGORY_PARENT_MAP


def test_age_group_ranges_completeness():
    """Test that all age groups have defined ranges."""
    for age_group in [
        KidsAgeGroup.TODDLERS,
        KidsAgeGroup.PRESCHOOL,
        KidsAgeGroup.ELEMENTARY,
        KidsAgeGroup.PRETEEN,
    ]:
        assert age_group in AGE_GROUP_RANGES
        ranges = AGE_GROUP_RANGES[age_group]
        assert "min" in ranges
        assert "max" in ranges


def test_keywords_coverage():
    """Test that keywords dictionaries have required categories."""
    required_categories = [
        "hebrew",
        "jewish",
        "educational",
        "music",
        "stories",
        "cartoons",
    ]

    for category in required_categories:
        assert category in KIDS_KEYWORDS_HE, f"Missing {category} in Hebrew keywords"
        assert category in KIDS_KEYWORDS_EN, f"Missing {category} in English keywords"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

"""
Kids Content Service - Aggregates kids-friendly content from database.

Focuses on:
- Cartoons and animated content
- Educational programs
- Kids music and songs
- Hebrew language learning
- Stories and tales
- Jewish content for children

Uses database as primary source with in-memory TTL caching.
Implements multi-tier fallback strategy to ensure content is never empty.
"""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.kids_content import (AGE_GROUP_RANGES, SUBCATEGORY_PARENT_MAP,
                                     KidsAgeGroup, KidsAgeGroupResponse,
                                     KidsAgeGroupsResponse,
                                     KidsContentAggregatedResponse,
                                     KidsContentCategory,
                                     KidsContentItemResponse,
                                     KidsContentSource, KidsFeaturedResponse,
                                     KidsSubcategoriesResponse,
                                     KidsSubcategory, KidsSubcategoryResponse)
from app.services.content_services.base_cache import ContentCache
from app.services.content_services.kids_keywords import (
    AGE_GROUP_LABELS, KIDS_CATEGORY_LABELS, KIDS_CONTENT_SEED,
    KIDS_KEYWORDS_EN, KIDS_KEYWORDS_HE, SUBCATEGORY_KEYWORDS_EN,
    SUBCATEGORY_KEYWORDS_HE, SUBCATEGORY_LABELS)

logger = logging.getLogger(__name__)


class KidsContentService:
    """Service for aggregating kids-focused content from database."""

    def __init__(self):
        self._cache = ContentCache(ttl_minutes=settings.KIDS_CONTENT_CACHE_TTL_MINUTES)

    def _calculate_relevance_score(
        self, title: str, description: Optional[str] = None
    ) -> tuple[float, List[str], str]:
        """
        Calculate relevance score based on kids keyword matches.

        Returns tuple of (score, matched_keywords, category)
        """
        text = f"{title} {description or ''}".lower()
        matched_keywords = []
        score = 0.0
        category_scores = {
            KidsContentCategory.CARTOONS: 0,
            KidsContentCategory.EDUCATIONAL: 0,
            KidsContentCategory.MUSIC: 0,
            KidsContentCategory.HEBREW: 0,
            KidsContentCategory.STORIES: 0,
            KidsContentCategory.JEWISH: 0,
        }

        # Check Hebrew keywords (higher weight for primary language)
        for category_key, keywords in KIDS_KEYWORDS_HE.items():
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
                    score += 2.0  # Hebrew keywords worth more

                    # Map keyword category to content category
                    if category_key == "cartoons":
                        category_scores[KidsContentCategory.CARTOONS] += 3
                    elif category_key == "educational":
                        category_scores[KidsContentCategory.EDUCATIONAL] += 3
                    elif category_key == "music":
                        category_scores[KidsContentCategory.MUSIC] += 3
                    elif category_key == "hebrew":
                        category_scores[KidsContentCategory.HEBREW] += 3
                    elif category_key == "stories":
                        category_scores[KidsContentCategory.STORIES] += 3
                    elif category_key == "jewish":
                        category_scores[KidsContentCategory.JEWISH] += 3

        # Check English keywords
        for category_key, keywords in KIDS_KEYWORDS_EN.items():
            for keyword in keywords:
                if keyword in text:
                    if keyword not in matched_keywords:
                        matched_keywords.append(keyword)
                        score += 1.0

                    # Map keyword category to content category
                    if category_key == "cartoons":
                        category_scores[KidsContentCategory.CARTOONS] += 2
                    elif category_key == "educational":
                        category_scores[KidsContentCategory.EDUCATIONAL] += 2
                    elif category_key == "music":
                        category_scores[KidsContentCategory.MUSIC] += 2
                    elif category_key == "hebrew":
                        category_scores[KidsContentCategory.HEBREW] += 2
                    elif category_key == "stories":
                        category_scores[KidsContentCategory.STORIES] += 2
                    elif category_key == "jewish":
                        category_scores[KidsContentCategory.JEWISH] += 2

        # Determine primary category
        max_category = max(category_scores, key=category_scores.get)
        if category_scores[max_category] == 0:
            max_category = KidsContentCategory.ALL

        # Normalize score (0-10 scale)
        normalized_score = min(score / 5.0, 10.0)

        return normalized_score, matched_keywords, max_category

    def _categorize_content(
        self,
        title: str,
        description: Optional[str] = None,
        educational_tags: Optional[List[str]] = None,
        genre: Optional[str] = None,
    ) -> str:
        """Categorize content based on title, description, tags, and genre."""
        text = f"{title} {description or ''} {genre or ''}".lower()
        tags = [t.lower() for t in (educational_tags or [])]

        # Check educational tags first (most reliable)
        if "hebrew" in tags:
            return KidsContentCategory.HEBREW
        if "jewish" in tags:
            return KidsContentCategory.JEWISH

        # Check for Hebrew learning content
        hebrew_keywords = ["עברית", "אלף בית", "hebrew", "alphabet"]
        if any(kw in text for kw in hebrew_keywords):
            return KidsContentCategory.HEBREW

        # Check for Jewish content
        jewish_keywords = ["שבת", "חנוכה", "פורים", "תורה", "shabbat", "torah"]
        if any(kw in text for kw in jewish_keywords):
            return KidsContentCategory.JEWISH

        # Check for music
        music_keywords = ["שירים", "מוסיקה", "songs", "music", "שיר"]
        if any(kw in text for kw in music_keywords):
            return KidsContentCategory.MUSIC

        # Check for stories
        story_keywords = ["סיפור", "אגדה", "story", "tale"]
        if any(kw in text for kw in story_keywords):
            return KidsContentCategory.STORIES

        # Check for educational
        edu_keywords = ["לימוד", "חינוכי", "educational", "learning", "מדע"]
        if any(kw in text for kw in edu_keywords):
            return KidsContentCategory.EDUCATIONAL

        # Check for cartoons
        cartoon_keywords = ["אנימציה", "מצויר", "cartoon", "animation"]
        if any(kw in text for kw in cartoon_keywords):
            return KidsContentCategory.CARTOONS

        return KidsContentCategory.ALL

    def _detect_subcategory(
        self,
        title: str,
        description: Optional[str] = None,
        educational_tags: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Detect subcategory based on content metadata."""
        text = f"{title} {description or ''}".lower()
        tags = [t.lower() for t in (educational_tags or [])]

        # Check each subcategory's keywords
        subcategory_scores: Dict[str, int] = {}

        # Check Hebrew keywords (higher weight)
        for subcat, keywords in SUBCATEGORY_KEYWORDS_HE.items():
            score = sum(2 for kw in keywords if kw in text)
            subcategory_scores[subcat] = subcategory_scores.get(subcat, 0) + score

        # Check English keywords
        for subcat, keywords in SUBCATEGORY_KEYWORDS_EN.items():
            score = sum(1 for kw in keywords if kw in text)
            subcategory_scores[subcat] = subcategory_scores.get(subcat, 0) + score

        # Check educational tags for subcategory hints
        tag_to_subcategory = {
            "hebrew": KidsSubcategory.LEARNING_HEBREW,
            "science": KidsSubcategory.YOUNG_SCIENCE,
            "math": KidsSubcategory.MATH_FUN,
            "nature": KidsSubcategory.NATURE_ANIMALS,
            "animals": KidsSubcategory.NATURE_ANIMALS,
            "music": KidsSubcategory.HEBREW_SONGS,
            "songs": KidsSubcategory.HEBREW_SONGS,
            "nursery": KidsSubcategory.NURSERY_RHYMES,
            "jewish": KidsSubcategory.JEWISH_HOLIDAYS,
            "torah": KidsSubcategory.TORAH_STORIES,
            "bedtime": KidsSubcategory.BEDTIME_STORIES,
            "movie": KidsSubcategory.KIDS_MOVIES,
            "series": KidsSubcategory.KIDS_SERIES,
        }

        for tag in tags:
            if tag in tag_to_subcategory:
                subcat = tag_to_subcategory[tag]
                subcategory_scores[subcat] = subcategory_scores.get(subcat, 0) + 3

        # Find best match
        if subcategory_scores:
            best_match = max(subcategory_scores, key=subcategory_scores.get)
            if subcategory_scores[best_match] >= 2:
                return best_match

        return None

    def _determine_age_group(self, age_rating: Optional[int]) -> Optional[str]:
        """Determine age group from age rating."""
        if age_rating is None:
            return None

        for group, (min_age, max_age) in AGE_GROUP_RANGES.items():
            if min_age <= age_rating <= max_age:
                return group

        return KidsAgeGroup.ELEMENTARY  # Default for out-of-range

    def _content_to_dict(self, content: Content) -> Dict[str, Any]:
        """Convert Content document to response dict format."""
        category = self._categorize_content(
            content.title, content.description, content.educational_tags, content.genre
        )

        # Detect subcategory
        subcategory = self._detect_subcategory(
            content.title, content.description, content.educational_tags
        )

        # Determine age group
        age_group = self._determine_age_group(content.age_rating)

        # Calculate relevance score
        score, keywords, _ = self._calculate_relevance_score(
            content.title, content.description
        )

        return {
            "id": str(content.id),
            "title": content.title,
            "title_en": content.title_en,
            "description": content.description,
            "thumbnail": content.thumbnail,
            "duration": content.duration,
            "age_rating": content.age_rating,
            "category": category,
            "subcategory": subcategory,
            "subcategory_label": (
                SUBCATEGORY_LABELS.get(subcategory) if subcategory else None
            ),
            "age_group": age_group,
            "educational_tags": content.educational_tags or [],
            "relevance_score": max(score, 5.0),  # Base score for DB content
            "source_type": "database",
        }

    async def fetch_all_content(
        self,
        category: Optional[str] = None,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """
        Fetch aggregated kids content from all sources.

        Fallback strategy (never empty):
        1. PRIMARY: Database query (Content with is_kids_content=True)
        2. SECONDARY: Stale cache (if fresh fails)
        3. FALLBACK: Seed data from KIDS_CONTENT_SEED
        """
        cache_key = f"kids_content_{category or 'all'}_{age_max or 'all'}"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # PRIMARY: Query database for kids content using taxonomy
            logger.info("Fetching kids content from database")
            try:
                from app.models.content_taxonomy import ContentSection

                # Get kids section ID
                kids_section = await ContentSection.find_one(
                    ContentSection.slug == "kids"
                )
                kids_section_id = str(kids_section.id) if kids_section else None

                # Build query with proper $and to avoid overwriting $or
                series_filter = {
                    "$or": [
                        {"series_id": None},
                        {"series_id": {"$exists": False}},
                        {"series_id": ""},
                    ]
                }

                # Use taxonomy-based filtering (new) or legacy flag
                if kids_section_id:
                    content_filter = {
                        "$or": [
                            {"section_ids": kids_section_id},
                            {"is_kids_content": True},
                        ]
                    }
                else:
                    content_filter = {"is_kids_content": True}

                and_conditions = [
                    {"is_published": True},
                    series_filter,
                    content_filter,
                ]

                # Apply age filter
                if age_max is not None:
                    and_conditions.append({"age_rating": {"$lte": age_max}})

                query: Dict[str, Any] = {"$and": and_conditions}

                content_list = await Content.find(query).to_list()

                for content in content_list:
                    item_dict = self._content_to_dict(content)
                    all_items.append(item_dict)

                logger.info(f"Database returned {len(all_items)} kids content items")

            except Exception as e:
                logger.error(f"Database query failed: {e}")

            # Sort by relevance score then by title
            all_items.sort(
                key=lambda x: (x["relevance_score"], x.get("title", "")),
                reverse=True,
            )

            # Only update cache if we found content
            if all_items:
                self._cache.set(cache_key, all_items)
                cached_items = all_items
            else:
                # SECONDARY: Try stale cache
                stale_items = self._cache.get_stale(cache_key)
                if stale_items:
                    cached_items = stale_items
                    logger.warning("No fresh kids content, using stale cache")
                else:
                    # FALLBACK: Use seed content - never return empty
                    cached_items = KIDS_CONTENT_SEED.copy()

                    # Filter seed by age if specified
                    if age_max is not None:
                        cached_items = [
                            item
                            for item in cached_items
                            if (item.get("age_rating") or 0) <= age_max
                        ]

                    self._cache.set(cache_key, cached_items)
                    logger.info("Using seed kids content as fallback")

        # Apply category filter on cached results
        filtered_items = cached_items
        if category and category != KidsContentCategory.ALL:
            filtered_items = [
                item for item in filtered_items if item.get("category") == category
            ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        # Convert to response models
        response_items = [
            KidsContentItemResponse(
                id=item.get("id", f"kids-{i + start_idx}"),
                title=item.get("title", ""),
                title_en=item.get("title_en"),
                description=item.get("description"),
                thumbnail=item.get("thumbnail"),
                duration=item.get("duration"),
                age_rating=item.get("age_rating"),
                category=item.get("category", KidsContentCategory.ALL),
                category_label=KIDS_CATEGORY_LABELS.get(
                    item.get("category", KidsContentCategory.ALL),
                    KIDS_CATEGORY_LABELS[KidsContentCategory.ALL],
                ),
                educational_tags=item.get("educational_tags", []),
                relevance_score=item.get("relevance_score", 0.0),
                source_type=item.get("source_type", "database"),
            )
            for i, item in enumerate(paginated_items)
        ]

        # Get sources count
        sources_count = await KidsContentSource.find({"is_active": True}).count()
        last_updated = self._cache.get_last_updated(cache_key) or datetime.utcnow()

        return KidsContentAggregatedResponse(
            items=response_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=sources_count,
            last_updated=last_updated,
            category=category,
            age_filter=age_max,
        )

    async def get_featured_content(
        self, age_max: Optional[int] = None
    ) -> KidsFeaturedResponse:
        """Get featured kids content for homepage hero section."""
        content = await self.fetch_all_content(age_max=age_max, limit=10)
        categories = await self.get_categories()

        return KidsFeaturedResponse(
            featured=content.items[:10],
            categories=categories,
            last_updated=content.last_updated,
        )

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get available kids content categories."""
        return [
            {
                "id": category_id,
                "name": labels["en"],
                "name_he": labels["he"],
                "name_es": labels.get("es", labels["en"]),
                "icon": icon,
            }
            for category_id, labels, icon in [
                (
                    KidsContentCategory.ALL,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.ALL],
                    "",
                ),
                (
                    KidsContentCategory.CARTOONS,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.CARTOONS],
                    "",
                ),
                (
                    KidsContentCategory.EDUCATIONAL,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.EDUCATIONAL],
                    "",
                ),
                (
                    KidsContentCategory.MUSIC,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.MUSIC],
                    "",
                ),
                (
                    KidsContentCategory.HEBREW,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.HEBREW],
                    "",
                ),
                (
                    KidsContentCategory.STORIES,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.STORIES],
                    "",
                ),
                (
                    KidsContentCategory.JEWISH,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.JEWISH],
                    "",
                ),
            ]
        ]

    async def get_content_by_category(
        self,
        category: str,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """Get kids content by specific category."""
        return await self.fetch_all_content(
            category=category,
            age_max=age_max,
            page=page,
            limit=limit,
        )

    def clear_cache(self) -> None:
        """Clear the content cache."""
        self._cache.clear()
        logger.info("Kids content cache cleared")

    async def get_subcategories(self) -> KidsSubcategoriesResponse:
        """Get all kids subcategories with content counts."""
        try:
            # Get kids section ID
            kids_section = await ContentSection.find_one(ContentSection.slug == "kids")
            if not kids_section:
                return KidsSubcategoriesResponse(
                    subcategories=[], total=0, grouped_by_parent={}
                )

            # Get subcategories from database
            subcategories = (
                await SectionSubcategory.find(
                    SectionSubcategory.section_id == str(kids_section.id),
                    SectionSubcategory.is_active == True,
                )
                .sort("order")
                .to_list()
            )

            subcategory_responses = []
            grouped_by_parent: Dict[str, List[Dict]] = {}

            for subcat in subcategories:
                # Get content count for this subcategory
                # (We'll count items that match this subcategory's keywords)
                parent_category = SUBCATEGORY_PARENT_MAP.get(subcat.slug, "educational")

                response = KidsSubcategoryResponse(
                    id=str(subcat.id),
                    slug=subcat.slug,
                    name=subcat.name,
                    name_en=subcat.name_en,
                    name_es=subcat.name_es,
                    description=subcat.description,
                    icon=subcat.icon,
                    parent_category=parent_category,
                    min_age=0,
                    max_age=12,
                    content_count=0,  # Will be populated dynamically
                    order=subcat.order,
                )
                subcategory_responses.append(response)

                # Group by parent category
                if parent_category not in grouped_by_parent:
                    grouped_by_parent[parent_category] = []
                grouped_by_parent[parent_category].append(
                    {
                        "slug": subcat.slug,
                        "name": subcat.name,
                        "name_en": subcat.name_en,
                    }
                )

            return KidsSubcategoriesResponse(
                subcategories=subcategory_responses,
                total=len(subcategory_responses),
                grouped_by_parent=grouped_by_parent,
            )

        except Exception as e:
            logger.error(f"Error getting subcategories: {e}")
            # Return fallback from constants
            fallback_subcategories = []
            for slug in SUBCATEGORY_LABELS:
                labels = SUBCATEGORY_LABELS[slug]
                parent = SUBCATEGORY_PARENT_MAP.get(slug, "educational")
                fallback_subcategories.append(
                    KidsSubcategoryResponse(
                        id=slug,
                        slug=slug,
                        name=labels["he"],
                        name_en=labels["en"],
                        name_es=labels.get("es", labels["en"]),
                        parent_category=parent,
                        min_age=0,
                        max_age=12,
                        content_count=0,
                        order=0,
                    )
                )

            return KidsSubcategoriesResponse(
                subcategories=fallback_subcategories,
                total=len(fallback_subcategories),
                grouped_by_parent={},
            )

    async def get_content_by_subcategory(
        self,
        subcategory_slug: str,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """Get kids content filtered by subcategory."""
        # First get all content
        content_response = await self.fetch_all_content(
            age_max=age_max,
            page=1,
            limit=1000,  # Get more items for filtering
        )

        # Filter by subcategory
        filtered_items = [
            item
            for item in content_response.items
            if item.subcategory == subcategory_slug
        ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        return KidsContentAggregatedResponse(
            items=paginated_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=content_response.sources_count,
            last_updated=content_response.last_updated,
            category=SUBCATEGORY_PARENT_MAP.get(subcategory_slug),
            age_filter=age_max,
        )

    async def get_age_groups(self) -> KidsAgeGroupsResponse:
        """Get all age groups with content counts."""
        age_groups = []

        for group_slug, (min_age, max_age) in AGE_GROUP_RANGES.items():
            labels = AGE_GROUP_LABELS.get(group_slug, {})
            age_groups.append(
                KidsAgeGroupResponse(
                    id=group_slug,
                    slug=group_slug,
                    name=labels.get("he", group_slug),
                    name_en=labels.get("en", group_slug),
                    name_es=labels.get("es", group_slug),
                    min_age=min_age,
                    max_age=max_age,
                    content_count=0,  # Will be populated dynamically
                )
            )

        return KidsAgeGroupsResponse(age_groups=age_groups, total=len(age_groups))

    async def get_content_by_age_group(
        self,
        age_group_slug: str,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """Get kids content filtered by age group."""
        # Get age range for this group
        age_range = AGE_GROUP_RANGES.get(age_group_slug)
        if not age_range:
            return KidsContentAggregatedResponse(
                items=[],
                pagination={"page": page, "limit": limit, "total": 0, "pages": 0},
                sources_count=0,
                last_updated=datetime.utcnow(),
            )

        min_age, max_age = age_range

        # Get content within age range
        content_response = await self.fetch_all_content(
            age_max=max_age,
            page=1,
            limit=1000,  # Get more items for filtering
        )

        # Filter by age group (age_rating should be >= min_age and <= max_age)
        filtered_items = [
            item
            for item in content_response.items
            if item.age_rating is not None and min_age <= item.age_rating <= max_age
        ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        return KidsContentAggregatedResponse(
            items=paginated_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=content_response.sources_count,
            last_updated=content_response.last_updated,
            age_filter=max_age,
        )


# Global service instance
kids_content_service = KidsContentService()


# Singleton instance for backward compatibility
kids_content_service = KidsContentService()

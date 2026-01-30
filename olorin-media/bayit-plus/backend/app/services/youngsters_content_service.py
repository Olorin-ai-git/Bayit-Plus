"""
Youngsters Content Service - Aggregates teen-appropriate content from database.

Focuses on:
- Teen trending content and viral media (ages 12-17)
- Age-appropriate news and current events
- Culture integration (music, film, art, food)
- Educational content (study help, career prep, life skills)
- Teen entertainment (movies, series)
- Sports content
- Technology (gaming, coding, gadgets)
- Jewish content for teens (Bar/Bat Mitzvah, teen shiurim)

Uses database as primary source with in-memory TTL caching.
Implements multi-tier fallback strategy to ensure content is never empty.
Enforces PG-13 content rating limits for youth safety.
"""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.youngsters_content import (AGE_GROUP_RANGES,
                                           SUBCATEGORY_PARENT_MAP,
                                           YoungstersAgeGroup,
                                           YoungstersAgeGroupResponse,
                                           YoungstersAgeGroupsResponse,
                                           YoungstersContentAggregatedResponse,
                                           YoungstersContentCategory,
                                           YoungstersContentItemResponse,
                                           YoungstersContentSource,
                                           YoungstersFeaturedResponse,
                                           YoungstersSubcategoriesResponse,
                                           YoungstersSubcategory,
                                           YoungstersSubcategoryResponse)
from app.services.content_services.base_cache import ContentCache
from app.services.content_services.youngsters_keywords import (
    AGE_GROUP_LABELS, SUBCATEGORY_KEYWORDS_EN, SUBCATEGORY_KEYWORDS_HE,
    SUBCATEGORY_LABELS, YOUNGSTERS_ALLOWED_RATINGS, YOUNGSTERS_CATEGORY_LABELS,
    YOUNGSTERS_CONTENT_SEED, YOUNGSTERS_KEYWORDS_EN, YOUNGSTERS_KEYWORDS_HE)

logger = logging.getLogger(__name__)


class YoungstersContentService:
    """Service for aggregating youngsters-focused content from database."""

    def __init__(self):
        self._cache = ContentCache(
            ttl_minutes=settings.YOUNGSTERS_CONTENT_CACHE_TTL_MINUTES
        )

    def _is_pg13_compliant(self, content_rating: Optional[str]) -> bool:
        """Check if content rating is PG-13 or below (safe for youngsters)."""
        if not content_rating:
            return True  # No rating assumes safe

        return content_rating in YOUNGSTERS_ALLOWED_RATINGS

    def _calculate_relevance_score(
        self, title: str, description: Optional[str] = None
    ) -> tuple[float, List[str], str]:
        """
        Calculate relevance score based on youngsters keyword matches.

        Returns tuple of (score, matched_keywords, category)
        """
        text = f"{title} {description or ''}".lower()
        matched_keywords = []
        score = 0.0
        category_scores = {
            YoungstersContentCategory.TRENDING: 0,
            YoungstersContentCategory.NEWS: 0,
            YoungstersContentCategory.CULTURE: 0,
            YoungstersContentCategory.EDUCATIONAL: 0,
            YoungstersContentCategory.MUSIC: 0,
            YoungstersContentCategory.ENTERTAINMENT: 0,
            YoungstersContentCategory.SPORTS: 0,
            YoungstersContentCategory.TECH: 0,
            YoungstersContentCategory.JUDAISM: 0,
        }

        # Check Hebrew keywords (higher weight for primary language)
        for category_key, keywords in YOUNGSTERS_KEYWORDS_HE.items():
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
                    score += 2.0  # Hebrew keywords worth more

                    # Map keyword category to content category
                    if category_key == "trending":
                        category_scores[YoungstersContentCategory.TRENDING] += 3
                    elif category_key == "news":
                        category_scores[YoungstersContentCategory.NEWS] += 3
                    elif category_key == "culture":
                        category_scores[YoungstersContentCategory.CULTURE] += 3
                    elif category_key == "educational":
                        category_scores[YoungstersContentCategory.EDUCATIONAL] += 3
                    elif category_key == "music":
                        category_scores[YoungstersContentCategory.MUSIC] += 3
                    elif category_key == "entertainment":
                        category_scores[YoungstersContentCategory.ENTERTAINMENT] += 3
                    elif category_key == "sports":
                        category_scores[YoungstersContentCategory.SPORTS] += 3
                    elif category_key == "tech":
                        category_scores[YoungstersContentCategory.TECH] += 3
                    elif category_key == "judaism":
                        category_scores[YoungstersContentCategory.JUDAISM] += 3

        # Check English keywords
        for category_key, keywords in YOUNGSTERS_KEYWORDS_EN.items():
            for keyword in keywords:
                if keyword in text:
                    if keyword not in matched_keywords:
                        matched_keywords.append(keyword)
                        score += 1.0

                    # Map keyword category to content category
                    if category_key == "trending":
                        category_scores[YoungstersContentCategory.TRENDING] += 2
                    elif category_key == "news":
                        category_scores[YoungstersContentCategory.NEWS] += 2
                    elif category_key == "culture":
                        category_scores[YoungstersContentCategory.CULTURE] += 2
                    elif category_key == "educational":
                        category_scores[YoungstersContentCategory.EDUCATIONAL] += 2
                    elif category_key == "music":
                        category_scores[YoungstersContentCategory.MUSIC] += 2
                    elif category_key == "entertainment":
                        category_scores[YoungstersContentCategory.ENTERTAINMENT] += 2
                    elif category_key == "sports":
                        category_scores[YoungstersContentCategory.SPORTS] += 2
                    elif category_key == "tech":
                        category_scores[YoungstersContentCategory.TECH] += 2
                    elif category_key == "judaism":
                        category_scores[YoungstersContentCategory.JUDAISM] += 2

        # Determine primary category
        max_category = max(category_scores, key=category_scores.get)
        if category_scores[max_category] == 0:
            max_category = YoungstersContentCategory.ALL

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
        if "trending" in tags or "viral" in tags:
            return YoungstersContentCategory.TRENDING
        if "news" in tags:
            return YoungstersContentCategory.NEWS
        if "judaism" in tags or "jewish" in tags:
            return YoungstersContentCategory.JUDAISM

        # Check for trending content
        trending_keywords = ["טרנד", "ויראלי", "trending", "viral", "tiktok"]
        if any(kw in text for kw in trending_keywords):
            return YoungstersContentCategory.TRENDING

        # Check for news content
        news_keywords = ["חדשות", "אקטואליה", "news", "current events"]
        if any(kw in text for kw in news_keywords):
            return YoungstersContentCategory.NEWS

        # Check for Jewish content
        jewish_keywords = [
            "בר מצווה",
            "בת מצווה",
            "תורה",
            "יהדות",
            "bar mitzvah",
            "torah",
        ]
        if any(kw in text for kw in jewish_keywords):
            return YoungstersContentCategory.JUDAISM

        # Check for tech content
        tech_keywords = ["גיימינג", "קודינג", "טכנולוגיה", "gaming", "coding", "tech"]
        if any(kw in text for kw in tech_keywords):
            return YoungstersContentCategory.TECH

        # Check for sports
        sports_keywords = ["ספורט", "כדורגל", "sports", "basketball"]
        if any(kw in text for kw in sports_keywords):
            return YoungstersContentCategory.SPORTS

        # Check for music
        music_keywords = ["מוזיקה", "שירים", "music", "songs"]
        if any(kw in text for kw in music_keywords):
            return YoungstersContentCategory.MUSIC

        # Check for culture
        culture_keywords = ["תרבות", "אמנות", "culture", "arts"]
        if any(kw in text for kw in culture_keywords):
            return YoungstersContentCategory.CULTURE

        # Check for educational
        edu_keywords = ["לימודי", "בגרויות", "educational", "study"]
        if any(kw in text for kw in edu_keywords):
            return YoungstersContentCategory.EDUCATIONAL

        # Check for entertainment
        entertainment_keywords = ["בידור", "סדרות", "entertainment", "series"]
        if any(kw in text for kw in entertainment_keywords):
            return YoungstersContentCategory.ENTERTAINMENT

        return YoungstersContentCategory.ALL

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
            "trending": YoungstersSubcategory.TIKTOK_TRENDS,
            "viral": YoungstersSubcategory.VIRAL_VIDEOS,
            "memes": YoungstersSubcategory.MEMES,
            "news": YoungstersSubcategory.ISRAEL_NEWS,
            "science": YoungstersSubcategory.SCIENCE_NEWS,
            "sports-news": YoungstersSubcategory.SPORTS_NEWS,
            "music": YoungstersSubcategory.MUSIC_CULTURE,
            "film": YoungstersSubcategory.FILM_CULTURE,
            "art": YoungstersSubcategory.ART_CULTURE,
            "food": YoungstersSubcategory.FOOD_CULTURE,
            "study": YoungstersSubcategory.STUDY_HELP,
            "career": YoungstersSubcategory.CAREER_PREP,
            "life-skills": YoungstersSubcategory.LIFE_SKILLS,
            "teen-movies": YoungstersSubcategory.TEEN_MOVIES,
            "teen-series": YoungstersSubcategory.TEEN_SERIES,
            "gaming": YoungstersSubcategory.GAMING,
            "coding": YoungstersSubcategory.CODING,
            "gadgets": YoungstersSubcategory.GADGETS,
            "bar-mitzvah": YoungstersSubcategory.BAR_BAT_MITZVAH,
            "torah": YoungstersSubcategory.TEEN_TORAH,
            "jewish-history": YoungstersSubcategory.JEWISH_HISTORY,
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

        return YoungstersAgeGroup.HIGH_SCHOOL  # Default for out-of-range

    def _content_to_dict(self, content: Content) -> Dict[str, Any]:
        """Convert Content document to response dict format."""
        category = self._categorize_content(
            content.title,
            content.description,
            content.youngsters_educational_tags or content.educational_tags,
            content.genre,
        )

        # Detect subcategory
        subcategory = self._detect_subcategory(
            content.title,
            content.description,
            content.youngsters_educational_tags or content.educational_tags,
        )

        # Determine age group
        age_group = self._determine_age_group(
            content.youngsters_age_rating or content.age_rating
        )

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
            "age_rating": content.youngsters_age_rating or content.age_rating,
            "category": category,
            "subcategory": subcategory,
            "subcategory_label": (
                SUBCATEGORY_LABELS.get(subcategory) if subcategory else None
            ),
            "age_group": age_group,
            "educational_tags": content.youngsters_educational_tags
            or content.educational_tags
            or [],
            "relevance_score": max(score, 5.0),  # Base score for DB content
            "source_type": "database",
        }

    async def fetch_all_content(
        self,
        category: Optional[str] = None,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> YoungstersContentAggregatedResponse:
        """
        Fetch aggregated youngsters content from all sources.

        Fallback strategy (never empty):
        1. PRIMARY: Database query (Content with is_youngsters_content=True)
        2. SECONDARY: Stale cache (if fresh fails)
        3. FALLBACK: Seed data from YOUNGSTERS_CONTENT_SEED

        PG-13 Filter: Only includes content rated G, PG, PG-13, TV-G, TV-PG, TV-14
        """
        cache_key = f"youngsters_content_{category or 'all'}_{age_max or 'all'}"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # PRIMARY: Query database for youngsters content
            logger.info("Fetching youngsters content from database")
            try:
                from app.models.content_taxonomy import ContentSection

                # Get youngsters section ID
                youngsters_section = await ContentSection.find_one(
                    ContentSection.slug == "youngsters"
                )
                youngsters_section_id = (
                    str(youngsters_section.id) if youngsters_section else None
                )

                # Build query with proper $and to avoid overwriting $or
                series_filter = {
                    "$or": [
                        {"series_id": None},
                        {"series_id": {"$exists": False}},
                        {"series_id": ""},
                    ]
                }

                # Use taxonomy-based filtering (new) or legacy flag
                if youngsters_section_id:
                    content_filter = {
                        "$or": [
                            {"section_ids": youngsters_section_id},
                            {"is_youngsters_content": True},
                        ]
                    }
                else:
                    content_filter = {"is_youngsters_content": True}

                and_conditions = [
                    {"is_published": True},
                    series_filter,
                    content_filter,
                ]

                # Apply age filter (default 17 for youngsters)
                if age_max is not None:
                    and_conditions.append({"youngsters_age_rating": {"$lte": age_max}})
                else:
                    # Default: max 17 years
                    and_conditions.append({"youngsters_age_rating": {"$lte": 17}})

                # PG-13 content rating filter
                and_conditions.append(
                    {
                        "$or": [
                            {"content_rating": {"$in": YOUNGSTERS_ALLOWED_RATINGS}},
                            {"content_rating": None},
                            {"content_rating": {"$exists": False}},
                        ]
                    }
                )

                query: Dict[str, Any] = {"$and": and_conditions}

                content_list = await Content.find(query).to_list()

                for content in content_list:
                    # Double-check PG-13 compliance
                    if self._is_pg13_compliant(content.content_rating):
                        item_dict = self._content_to_dict(content)
                        all_items.append(item_dict)

                logger.info(
                    f"Database returned {len(all_items)} youngsters content items"
                )

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
                    logger.warning("No fresh youngsters content, using stale cache")
                else:
                    # FALLBACK: Use seed content - never return empty
                    cached_items = YOUNGSTERS_CONTENT_SEED.copy()

                    # Filter seed by age if specified
                    if age_max is not None:
                        cached_items = [
                            item
                            for item in cached_items
                            if (item.get("age_rating") or 0) <= age_max
                        ]

                    self._cache.set(cache_key, cached_items)
                    logger.info("Using seed youngsters content as fallback")

        # Apply category filter on cached results
        filtered_items = cached_items
        if category and category != YoungstersContentCategory.ALL:
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
            YoungstersContentItemResponse(
                id=item.get("id", f"youngsters-{i + start_idx}"),
                title=item.get("title", ""),
                title_en=item.get("title_en"),
                description=item.get("description"),
                thumbnail=item.get("thumbnail"),
                duration=item.get("duration"),
                age_rating=item.get("age_rating"),
                category=item.get("category", YoungstersContentCategory.ALL),
                category_label=YOUNGSTERS_CATEGORY_LABELS.get(
                    item.get("category", YoungstersContentCategory.ALL),
                    YOUNGSTERS_CATEGORY_LABELS[YoungstersContentCategory.ALL],
                ),
                subcategory=item.get("subcategory"),
                subcategory_label=item.get("subcategory_label"),
                age_group=item.get("age_group"),
                educational_tags=item.get("educational_tags", []),
                relevance_score=item.get("relevance_score", 0.0),
                source_type=item.get("source_type", "database"),
            )
            for i, item in enumerate(paginated_items)
        ]

        # Get sources count
        sources_count = await YoungstersContentSource.find({"is_active": True}).count()
        last_updated = self._cache.get_last_updated(cache_key) or datetime.now(timezone.utc)

        return YoungstersContentAggregatedResponse(
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

    async def get_featured_content(self) -> YoungstersFeaturedResponse:
        """Get featured youngsters content for homepage hero section."""
        # Get top-rated content from database
        result = await self.fetch_all_content(limit=10)

        categories = await self.get_categories()

        return YoungstersFeaturedResponse(
            featured=result.items[:5],  # Top 5 for featured
            categories=categories,
            last_updated=result.last_updated,
        )

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all youngsters content categories."""
        return [
            {
                "id": cat,
                "slug": cat,
                "name": labels["he"],
                "name_en": labels["en"],
                "name_es": labels["es"],
            }
            for cat, labels in YOUNGSTERS_CATEGORY_LABELS.items()
            if cat != YoungstersContentCategory.ALL
        ]

    async def get_content_by_category(
        self, category: str, page: int = 1, limit: int = 20
    ) -> YoungstersContentAggregatedResponse:
        """Get youngsters content filtered by category."""
        return await self.fetch_all_content(category=category, page=page, limit=limit)

    def clear_cache(self) -> None:
        """Clear all cached youngsters content."""
        self._cache.clear()
        logger.info("Cleared youngsters content cache")

    async def get_subcategories(self) -> YoungstersSubcategoriesResponse:
        """Get all youngsters content subcategories from taxonomy."""
        try:
            from app.models.content_taxonomy import ContentSection

            # Get youngsters section
            youngsters_section = await ContentSection.find_one(
                ContentSection.slug == "youngsters"
            )
            if not youngsters_section:
                logger.warning("Youngsters section not found in taxonomy")
                return YoungstersSubcategoriesResponse(
                    subcategories=[],
                    total=0,
                    grouped_by_parent={},
                )

            # Get all subcategories for youngsters section
            subcategories = await SectionSubcategory.find(
                SectionSubcategory.section_id == str(youngsters_section.id)
            ).to_list()

            # Convert to response models
            response_subcats = []
            grouped_by_parent = {}

            for subcat in subcategories:
                parent_category = SUBCATEGORY_PARENT_MAP.get(
                    subcat.slug, YoungstersContentCategory.ALL
                )

                response_subcat = YoungstersSubcategoryResponse(
                    id=str(subcat.id),
                    slug=subcat.slug,
                    name=subcat.name,
                    name_en=subcat.name_en,
                    name_es=subcat.name_es,
                    description=subcat.description,
                    icon=subcat.icon,
                    parent_category=parent_category,
                    min_age=subcat.min_age or 12,
                    max_age=subcat.max_age or 17,
                    content_count=0,  # Computed on-demand via fetch_all_content()
                    order=subcat.order or 0,
                )

                response_subcats.append(response_subcat)

                # Group by parent
                if parent_category not in grouped_by_parent:
                    grouped_by_parent[parent_category] = []
                grouped_by_parent[parent_category].append(response_subcat)

            return YoungstersSubcategoriesResponse(
                subcategories=response_subcats,
                total=len(response_subcats),
                grouped_by_parent=grouped_by_parent,
            )

        except Exception as e:
            logger.error(f"Failed to get youngsters subcategories: {e}")
            return YoungstersSubcategoriesResponse(
                subcategories=[],
                total=0,
                grouped_by_parent={},
            )

    async def get_content_by_subcategory(
        self, subcategory_slug: str, page: int = 1, limit: int = 20
    ) -> YoungstersContentAggregatedResponse:
        """Get youngsters content filtered by subcategory."""
        try:
            # Get all content first
            all_content = await self.fetch_all_content(page=1, limit=1000)

            # Filter by subcategory
            filtered_items = [
                item
                for item in all_content.items
                if item.subcategory == subcategory_slug
            ]

            # Pagination
            total = len(filtered_items)
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            paginated_items = filtered_items[start_idx:end_idx]

            return YoungstersContentAggregatedResponse(
                items=paginated_items,
                pagination={
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit if limit > 0 else 0,
                },
                sources_count=all_content.sources_count,
                last_updated=all_content.last_updated,
                category=None,
                age_filter=None,
            )

        except Exception as e:
            logger.error(f"Failed to get content by subcategory: {e}")
            return YoungstersContentAggregatedResponse(
                items=[],
                pagination={"page": page, "limit": limit, "total": 0, "pages": 0},
                sources_count=0,
                last_updated=datetime.now(timezone.utc),
            )

    async def get_age_groups(self) -> YoungstersAgeGroupsResponse:
        """Get all youngsters age groups."""
        age_groups = []

        for group, (min_age, max_age) in AGE_GROUP_RANGES.items():
            labels = AGE_GROUP_LABELS.get(group, {})
            age_groups.append(
                YoungstersAgeGroupResponse(
                    id=group,
                    slug=group,
                    name=labels.get("he", ""),
                    name_en=labels.get("en"),
                    name_es=labels.get("es"),
                    min_age=min_age,
                    max_age=max_age,
                    content_count=0,  # Computed on-demand via get_content_by_age_group()
                )
            )

        return YoungstersAgeGroupsResponse(
            age_groups=age_groups,
            total=len(age_groups),
        )

    async def get_content_by_age_group(
        self, age_group: str, page: int = 1, limit: int = 20
    ) -> YoungstersContentAggregatedResponse:
        """Get youngsters content filtered by age group."""
        # Get age range for this group
        age_range = AGE_GROUP_RANGES.get(age_group)
        if not age_range:
            logger.warning(f"Unknown age group: {age_group}")
            return YoungstersContentAggregatedResponse(
                items=[],
                pagination={"page": page, "limit": limit, "total": 0, "pages": 0},
                sources_count=0,
                last_updated=datetime.now(timezone.utc),
            )

        min_age, max_age = age_range

        # Fetch content with age filter
        return await self.fetch_all_content(age_max=max_age, page=page, limit=limit)

    async def get_trending_for_youth(
        self, age_group: Optional[str] = None, limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get AI-filtered trending topics appropriate for youngsters.

        Filters trending topics from Israeli news for youth appropriateness,
        excluding violence, mature themes, and inappropriate content.

        Args:
            age_group: Age group filter (middle_school or high_school)
            limit: Maximum number of topics to return

        Returns:
            Dictionary with filtered trending topics and metadata
        """
        from app.services.news_analyzer import get_trending_analysis
        from app.services.youth_content_filter import filter_topics_for_youth

        try:
            # Get raw trending analysis
            analysis = await get_trending_analysis()

            if not analysis.topics:
                return {
                    "topics": [],
                    "overall_mood": None,
                    "top_story": None,
                    "message": "No trending topics available",
                }

            # Filter topics for youth appropriateness
            youth_topics = await filter_topics_for_youth(
                analysis.topics,
                age_group=age_group,
                use_ai=True,
            )

            # Limit results
            youth_topics = youth_topics[:limit]

            # Format response
            return {
                "topics": [
                    {
                        "title": t.title,
                        "title_en": t.title_en,
                        "category": t.category,
                        "sentiment": t.sentiment,
                        "importance": t.importance,
                        "summary": t.summary,
                        "keywords": t.keywords,
                    }
                    for t in youth_topics
                ],
                "overall_mood": analysis.overall_mood,
                "top_story": analysis.top_story,
                "analyzed_at": analysis.analyzed_at.isoformat(),
                "filtered_count": len(youth_topics),
                "total_count": len(analysis.topics),
                "age_group": age_group,
                "sources": analysis.sources,
            }

        except Exception as e:
            logger.error(f"Error getting trending for youth: {e}")
            return {
                "topics": [],
                "overall_mood": None,
                "top_story": None,
                "error": "Failed to load trending topics",
            }

    async def get_news_for_youth(
        self, limit: int = 10, age_group: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get age-appropriate news items for youngsters.

        Fetches breaking news and filters for youth appropriateness.

        Args:
            limit: Maximum number of news items to return
            age_group: Age group filter for stricter filtering

        Returns:
            Dictionary with filtered news items
        """
        from app.services.news_service import fetch_ynet_mivzakim
        from app.services.youth_content_filter import YOUTH_UNSAFE_KEYWORDS

        try:
            # Fetch news items
            news_items = await fetch_ynet_mivzakim(
                limit=limit * 3
            )  # Fetch extra for filtering

            if not news_items:
                return {
                    "news": [],
                    "message": "No news available",
                }

            # Filter news for youth appropriateness
            youth_news = []
            for item in news_items:
                # Quick keyword check
                combined_text = f"{item.title} {item.summary}".lower()

                # Check for unsafe keywords
                is_safe = True
                for unsafe_keyword in YOUTH_UNSAFE_KEYWORDS:
                    if unsafe_keyword.lower() in combined_text:
                        is_safe = False
                        break

                if is_safe:
                    youth_news.append(
                        {
                            "title": item.title,
                            "link": item.link,
                            "published": item.published,
                            "summary": item.summary,
                            "source": item.source,
                        }
                    )

                if len(youth_news) >= limit:
                    break

            return {
                "news": youth_news,
                "count": len(youth_news),
                "source": "ynet",
                "age_group": age_group,
            }

        except Exception as e:
            logger.error(f"Error getting news for youth: {e}")
            return {
                "news": [],
                "error": "Failed to load news",
            }

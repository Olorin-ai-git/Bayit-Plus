"""
Series Linker Service

Provides episode-to-series linking and episode deduplication capabilities:
- Find unlinked episodes (episodes without series_id)
- Match episodes to parent series using title patterns and TMDB
- Link episodes to their parent series
- Detect and resolve duplicate episodes (same series + season + episode)
"""

import difflib
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from beanie import PydanticObjectId

from app.core.config import settings
from app.models.content import Content
from app.models.librarian import LibrarianAction

logger = logging.getLogger(__name__)


# Episode title patterns for extracting series name and episode info
EPISODE_PATTERNS = [
    # S01E01, s01e01, S1E1
    re.compile(r'^(.+?)\s*[Ss](\d{1,2})[Ee](\d{1,3})'),
    # 1x01 format
    re.compile(r'^(.+?)\s*(\d{1,2})x(\d{1,3})'),
    # Season 1 Episode 1 format
    re.compile(r'^(.+?)\s*[-–]\s*[Ss]eason\s*(\d{1,2})\s*[Ee]pisode\s*(\d{1,3})'),
    # EP01, Ep.01 format (assumes season 1)
    re.compile(r'^(.+?)\s*[Ee][Pp]\.?\s*(\d{1,3})$'),
]


@dataclass
class UnlinkedEpisode:
    """Represents an episode without a parent series."""
    content_id: str
    title: str
    title_en: Optional[str] = None
    extracted_series_name: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class DuplicateGroup:
    """Represents a group of duplicate episodes."""
    series_id: str
    series_title: str
    season: int
    episode: int
    episode_ids: List[str]
    episode_titles: List[str]
    created_dates: List[datetime]
    file_sizes: List[Optional[int]]
    resolutions: List[Optional[int]]


@dataclass
class LinkingResult:
    """Result of a linking operation."""
    success: bool
    episode_id: str
    series_id: Optional[str] = None
    series_title: Optional[str] = None
    action: str = ""
    confidence: float = 0.0
    dry_run: bool = False
    error: Optional[str] = None


@dataclass
class DeduplicationResult:
    """Result of a deduplication operation."""
    success: bool
    duplicates_found: int = 0
    duplicates_resolved: int = 0
    kept_episode_ids: List[str] = field(default_factory=list)
    removed_episode_ids: List[str] = field(default_factory=list)
    dry_run: bool = False
    errors: List[str] = field(default_factory=list)


class SeriesLinkerService:
    """
    Service for linking episodes to series and deduplicating episodes.

    Uses multiple strategies to match episodes to their parent series:
    1. Exact title match against existing series
    2. Title similarity matching (>= threshold)
    3. TMDB TV series search and matching
    4. Optionally creates new series from TMDB data
    """

    def __init__(self):
        self._title_similarity_threshold = settings.SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD
        self._auto_link_confidence_threshold = settings.SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD
        self._auto_link_batch_size = settings.SERIES_LINKER_AUTO_LINK_BATCH_SIZE
        self._duplicate_resolution_strategy = settings.SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY
        self._create_missing_series = settings.SERIES_LINKER_CREATE_MISSING_SERIES

    async def find_unlinked_episodes(self, limit: int = 100) -> List[UnlinkedEpisode]:
        """
        Find episodes that have season/episode info but no series_id.

        Args:
            limit: Maximum number of unlinked episodes to return

        Returns:
            List of UnlinkedEpisode objects
        """
        unlinked = []

        try:
            # Query for content that appears to be an episode but has no series_id
            # An episode has season OR episode number but no series_id
            query = {
                "$and": [
                    {"is_published": True},
                    {"is_series": {"$ne": True}},  # Not a series container
                    {"series_id": None},
                    {"$or": [
                        {"season": {"$ne": None}},
                        {"episode": {"$ne": None}}
                    ]}
                ]
            }

            episodes = await Content.find(query).limit(limit).to_list()

            for ep in episodes:
                # Try to extract series name from title
                series_name, season, episode_num = self._extract_series_info_from_title(
                    ep.title or ep.title_en or ""
                )

                unlinked.append(UnlinkedEpisode(
                    content_id=str(ep.id),
                    title=ep.title,
                    title_en=ep.title_en,
                    extracted_series_name=series_name,
                    season=ep.season or season,
                    episode=ep.episode or episode_num,
                    created_at=ep.created_at
                ))

            logger.info(f"Found {len(unlinked)} unlinked episodes")

        except Exception as e:
            logger.error(f"Error finding unlinked episodes: {e}", exc_info=True)

        return unlinked

    def _extract_series_info_from_title(
        self,
        title: str
    ) -> Tuple[Optional[str], Optional[int], Optional[int]]:
        """
        Extract series name, season, and episode from a title string.

        Args:
            title: The episode title to parse

        Returns:
            Tuple of (series_name, season, episode) - any can be None
        """
        if not title:
            return None, None, None

        title = title.strip()

        for pattern in EPISODE_PATTERNS:
            match = pattern.match(title)
            if match:
                groups = match.groups()

                if len(groups) == 3:
                    # Full match: series, season, episode
                    series_name = groups[0].strip().strip('-').strip()
                    season = int(groups[1])
                    episode = int(groups[2])
                    return series_name, season, episode

                elif len(groups) == 2:
                    # EP format: series, episode (assume season 1)
                    series_name = groups[0].strip().strip('-').strip()
                    episode = int(groups[1])
                    return series_name, 1, episode

        return None, None, None

    async def find_matching_series(
        self,
        series_name: str,
        use_tmdb: bool = True
    ) -> Tuple[Optional[Content], float]:
        """
        Find a matching series for the given name.

        Args:
            series_name: The series name to match
            use_tmdb: Whether to search TMDB if no local match

        Returns:
            Tuple of (matching Content or None, confidence score 0-1)
        """
        if not series_name:
            return None, 0.0

        # Normalize the name for matching
        normalized_name = series_name.lower().strip()

        # Strategy 1: Exact match (case-insensitive)
        exact_match = await Content.find_one({
            "is_series": True,
            "$or": [
                {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
                {"title_en": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}}
            ]
        })

        if exact_match:
            logger.info(f"Found exact series match: '{exact_match.title}' for '{series_name}'")
            return exact_match, 1.0

        # Strategy 2: Similarity matching
        all_series = await Content.find({"is_series": True}).to_list()

        best_match = None
        best_ratio = 0.0

        for series in all_series:
            # Check both Hebrew and English titles
            for title in [series.title, series.title_en]:
                if title:
                    ratio = difflib.SequenceMatcher(
                        None,
                        normalized_name,
                        title.lower()
                    ).ratio()

                    if ratio > best_ratio:
                        best_ratio = ratio
                        best_match = series

        if best_match and best_ratio >= self._title_similarity_threshold:
            logger.info(
                f"Found similar series: '{best_match.title}' "
                f"for '{series_name}' (similarity: {best_ratio:.2f})"
            )
            return best_match, best_ratio

        # Strategy 3: TMDB search
        if use_tmdb:
            tmdb_match = await self._find_series_via_tmdb(series_name)
            if tmdb_match:
                return tmdb_match, 0.9

        return None, 0.0

    async def _find_series_via_tmdb(
        self,
        series_name: str
    ) -> Optional[Content]:
        """
        Search TMDB for a series and check if we have a matching tmdb_id.

        Args:
            series_name: The series name to search

        Returns:
            Matching Content if found, None otherwise
        """
        try:
            from app.services.tmdb_service import TMDBService

            if not settings.TMDB_API_KEY:
                return None

            tmdb = TMDBService()
            search_result = await tmdb.search_tv_series(series_name)

            if not search_result:
                return None

            tmdb_id = search_result.get("id")

            # Check if we have a series with this TMDB ID
            existing = await Content.find_one({
                "is_series": True,
                "tmdb_id": tmdb_id
            })

            if existing:
                logger.info(f"Found series via TMDB ID {tmdb_id}: '{existing.title}'")
                return existing

            # If CREATE_MISSING_SERIES is enabled, create the series
            if self._create_missing_series:
                details = await tmdb.get_tv_series_details(tmdb_id)
                if details:
                    new_series = await self._create_series_from_tmdb(
                        details,
                        series_name
                    )
                    if new_series:
                        return new_series

        except Exception as e:
            logger.error(f"Error searching TMDB for series: {e}")

        return None

    async def _create_series_from_tmdb(
        self,
        tmdb_data: Dict[str, Any],
        fallback_title: str
    ) -> Optional[Content]:
        """
        Create a new series Content from TMDB data.

        Args:
            tmdb_data: TMDB series details
            fallback_title: Title to use if TMDB doesn't have one

        Returns:
            The created Content object, or None if creation failed
        """
        try:
            from app.services.tmdb_service import TMDBService

            tmdb = TMDBService()

            # Get poster URL
            poster_url = None
            if tmdb_data.get("poster_path"):
                poster_url = tmdb.get_image_url(tmdb_data["poster_path"], "w500")

            backdrop_url = None
            if tmdb_data.get("backdrop_path"):
                backdrop_url = tmdb.get_image_url(tmdb_data["backdrop_path"], "w1280")

            # Extract first air date year
            first_air_date = tmdb_data.get("first_air_date", "")
            year = None
            if first_air_date:
                try:
                    year = int(first_air_date.split("-")[0])
                except (ValueError, IndexError):
                    pass

            # Get external IDs
            external_ids = tmdb_data.get("external_ids", {})

            # Find the appropriate category for series
            from app.models.content import Category
            series_category = await Category.find_one({"slug": "series"})
            if not series_category:
                series_category = await Category.find_one({"slug": "tv"})
            if not series_category:
                series_category = await Category.find_one({})  # Fallback to any category

            category_id = str(series_category.id) if series_category else ""

            new_series = Content(
                title=tmdb_data.get("name") or fallback_title,
                title_en=tmdb_data.get("original_name"),
                description=tmdb_data.get("overview"),
                poster_url=poster_url,
                thumbnail=poster_url,
                backdrop=backdrop_url,
                year=year,
                tmdb_id=tmdb_data.get("id"),
                imdb_id=external_ids.get("imdb_id"),
                imdb_rating=tmdb_data.get("vote_average"),
                imdb_votes=tmdb_data.get("vote_count"),
                genres=[g.get("name") for g in tmdb_data.get("genres", [])],
                total_seasons=tmdb_data.get("number_of_seasons"),
                total_episodes=tmdb_data.get("number_of_episodes"),
                is_series=True,
                content_type="series",
                is_published=True,
                category_id=category_id,
                stream_url="",  # Series container doesn't need a stream URL
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            await new_series.insert()
            logger.info(f"Created new series from TMDB: '{new_series.title}' (ID: {new_series.id})")

            return new_series

        except Exception as e:
            logger.error(f"Error creating series from TMDB: {e}", exc_info=True)
            return None

    async def link_episode_to_series(
        self,
        episode_id: str,
        series_id: str,
        season: Optional[int] = None,
        episode_num: Optional[int] = None,
        audit_id: Optional[str] = None,
        dry_run: bool = False,
        reason: str = ""
    ) -> LinkingResult:
        """
        Link an episode to its parent series.

        Args:
            episode_id: The episode Content ID
            series_id: The parent series Content ID
            season: Season number (optional, uses episode's existing value if not provided)
            episode_num: Episode number (optional, uses episode's existing value if not provided)
            audit_id: Audit ID for tracking
            dry_run: If True, don't actually make changes
            reason: Reason for the linking (for audit log)

        Returns:
            LinkingResult with success status and details
        """
        try:
            # Fetch the episode and series
            episode = await Content.find_one(Content.id == PydanticObjectId(episode_id))
            series = await Content.find_one(Content.id == PydanticObjectId(series_id))

            if not episode:
                return LinkingResult(
                    success=False,
                    episode_id=episode_id,
                    error=f"Episode {episode_id} not found"
                )

            if not series:
                return LinkingResult(
                    success=False,
                    episode_id=episode_id,
                    error=f"Series {series_id} not found"
                )

            if not series.is_series:
                return LinkingResult(
                    success=False,
                    episode_id=episode_id,
                    series_id=series_id,
                    error=f"Content {series_id} is not a series"
                )

            # Prepare before state for audit
            before_state = {
                "series_id": episode.series_id,
                "season": episode.season,
                "episode": episode.episode
            }

            # Determine season and episode numbers
            final_season = season if season is not None else episode.season
            final_episode = episode_num if episode_num is not None else episode.episode

            if dry_run:
                return LinkingResult(
                    success=True,
                    episode_id=episode_id,
                    series_id=series_id,
                    series_title=series.title,
                    action=f"[DRY RUN] Would link to series '{series.title}' S{final_season}E{final_episode}",
                    confidence=1.0,
                    dry_run=True
                )

            # Update the episode
            episode.series_id = series_id
            if final_season is not None:
                episode.season = final_season
            if final_episode is not None:
                episode.episode = final_episode
            episode.updated_at = datetime.utcnow()

            await episode.save()

            # Prepare after state
            after_state = {
                "series_id": series_id,
                "season": final_season,
                "episode": final_episode
            }

            # Log action if audit_id provided
            if audit_id:
                action = LibrarianAction(
                    audit_id=audit_id,
                    action_type="link_episode",
                    content_id=episode_id,
                    content_type="episode",
                    issue_type="unlinked_episode",
                    description=reason or f"Linked episode '{episode.title}' to series '{series.title}'",
                    before_state=before_state,
                    after_state=after_state,
                    confidence_score=1.0,
                    auto_approved=True,
                    timestamp=datetime.utcnow()
                )
                await action.insert()

            logger.info(
                f"Linked episode '{episode.title}' to series '{series.title}' "
                f"(S{final_season}E{final_episode})"
            )

            return LinkingResult(
                success=True,
                episode_id=episode_id,
                series_id=series_id,
                series_title=series.title,
                action=f"Linked to series '{series.title}' S{final_season}E{final_episode}",
                confidence=1.0,
                dry_run=False
            )

        except Exception as e:
            logger.error(f"Error linking episode to series: {e}", exc_info=True)
            return LinkingResult(
                success=False,
                episode_id=episode_id,
                error=str(e)
            )

    async def auto_link_unlinked_episodes(
        self,
        limit: int = None,
        audit_id: Optional[str] = None,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Automatically link unlinked episodes to their parent series.

        Args:
            limit: Maximum number of episodes to process
            audit_id: Audit ID for tracking
            dry_run: If True, don't actually make changes

        Returns:
            Dict with statistics and results
        """
        if limit is None:
            limit = self._auto_link_batch_size

        results = {
            "success": True,
            "processed": 0,
            "linked": 0,
            "skipped": 0,
            "failed": 0,
            "dry_run": dry_run,
            "details": []
        }

        try:
            unlinked = await self.find_unlinked_episodes(limit=limit)
            results["processed"] = len(unlinked)

            for episode in unlinked:
                # Try to find matching series
                series_name = episode.extracted_series_name
                if not series_name:
                    # Try extracting from title_en as fallback
                    series_name, _, _ = self._extract_series_info_from_title(
                        episode.title_en or ""
                    )

                if not series_name:
                    results["skipped"] += 1
                    results["details"].append({
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "skipped",
                        "reason": "Could not extract series name from title"
                    })
                    continue

                # Find matching series
                series, confidence = await self.find_matching_series(series_name)

                if not series or confidence < self._auto_link_confidence_threshold:
                    results["skipped"] += 1
                    results["details"].append({
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "skipped",
                        "reason": f"No matching series found with sufficient confidence (best: {confidence:.2f})"
                    })
                    continue

                # Link the episode
                link_result = await self.link_episode_to_series(
                    episode_id=episode.content_id,
                    series_id=str(series.id),
                    season=episode.season,
                    episode_num=episode.episode,
                    audit_id=audit_id,
                    dry_run=dry_run,
                    reason=f"Auto-linked from title pattern with {confidence:.0%} confidence"
                )

                if link_result.success:
                    results["linked"] += 1
                    results["details"].append({
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "linked" if not dry_run else "would_link",
                        "series_id": str(series.id),
                        "series_title": series.title,
                        "confidence": confidence
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "episode_id": episode.content_id,
                        "title": episode.title,
                        "action": "failed",
                        "error": link_result.error
                    })

        except Exception as e:
            logger.error(f"Error in auto_link_unlinked_episodes: {e}", exc_info=True)
            results["success"] = False
            results["error"] = str(e)

        logger.info(
            f"Auto-link complete: {results['linked']}/{results['processed']} linked, "
            f"{results['skipped']} skipped, {results['failed']} failed"
        )

        return results

    async def find_duplicate_episodes(
        self,
        series_id: Optional[str] = None
    ) -> List[DuplicateGroup]:
        """
        Find duplicate episodes (same series_id + season + episode).

        Args:
            series_id: Optional series ID to filter by

        Returns:
            List of DuplicateGroup objects
        """
        duplicates = []

        try:
            # Build aggregation pipeline
            match_stage = {
                "series_id": {"$ne": None},
                "season": {"$ne": None},
                "episode": {"$ne": None},
                "is_series": {"$ne": True}
            }

            if series_id:
                match_stage["series_id"] = series_id

            pipeline = [
                {"$match": match_stage},
                {"$group": {
                    "_id": {
                        "series_id": "$series_id",
                        "season": "$season",
                        "episode": "$episode"
                    },
                    "count": {"$sum": 1},
                    "episode_ids": {"$push": {"$toString": "$_id"}},
                    "titles": {"$push": "$title"},
                    "created_dates": {"$push": "$created_at"},
                    "file_sizes": {"$push": "$file_size"},
                    "resolutions": {"$push": "$video_metadata.height"}
                }},
                {"$match": {"count": {"$gt": 1}}},
                {"$sort": {"count": -1}}
            ]

            # Execute aggregation
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(settings.MONGODB_URL)
            db = client[settings.MONGODB_DB_NAME]

            cursor = db.content.aggregate(pipeline)
            results = await cursor.to_list(length=100)

            # Build duplicate groups with series info
            for result in results:
                group_key = result["_id"]
                series = await Content.find_one(
                    Content.id == PydanticObjectId(group_key["series_id"])
                )

                duplicates.append(DuplicateGroup(
                    series_id=group_key["series_id"],
                    series_title=series.title if series else "Unknown",
                    season=group_key["season"],
                    episode=group_key["episode"],
                    episode_ids=result["episode_ids"],
                    episode_titles=result["titles"],
                    created_dates=result["created_dates"],
                    file_sizes=result["file_sizes"],
                    resolutions=result["resolutions"]
                ))

            logger.info(f"Found {len(duplicates)} duplicate episode groups")

        except Exception as e:
            logger.error(f"Error finding duplicate episodes: {e}", exc_info=True)

        return duplicates

    def _select_episode_to_keep(
        self,
        episodes: List[Content],
        strategy: str = None
    ) -> Content:
        """
        Select which episode to keep from a group of duplicates.

        Args:
            episodes: List of duplicate Content objects
            strategy: Resolution strategy

        Returns:
            The Content object to keep
        """
        if strategy is None:
            strategy = self._duplicate_resolution_strategy

        if strategy == "keep_highest_quality":
            # Sort by file_size (desc), then resolution height (desc)
            def quality_key(e):
                size = e.file_size or 0
                height = (e.video_metadata or {}).get("height", 0) or 0
                return (size, height)
            return max(episodes, key=quality_key)

        elif strategy == "keep_oldest":
            return min(episodes, key=lambda e: e.created_at or datetime.min)

        elif strategy == "keep_newest":
            return max(episodes, key=lambda e: e.created_at or datetime.min)

        elif strategy == "keep_most_complete":
            def completeness_score(e):
                score = 0
                if e.description:
                    score += 1
                if e.thumbnail or e.poster_url:
                    score += 1
                if e.backdrop:
                    score += 1
                if e.tmdb_id:
                    score += 1
                if e.has_subtitles:
                    score += 1
                if e.file_size:
                    score += (e.file_size / 1_000_000_000)  # Bonus for larger files
                return score
            return max(episodes, key=completeness_score)

        else:
            # Default: keep highest quality
            return max(episodes, key=lambda e: (e.file_size or 0))

    async def resolve_duplicate_episode_group(
        self,
        episode_ids: List[str],
        keep_id: Optional[str] = None,
        action: str = "unpublish",
        audit_id: Optional[str] = None,
        dry_run: bool = False,
        reason: str = ""
    ) -> DeduplicationResult:
        """
        Resolve a group of duplicate episodes.

        Args:
            episode_ids: List of duplicate episode IDs
            keep_id: ID of episode to keep (if None, auto-select)
            action: What to do with duplicates ("unpublish" or "delete")
            audit_id: Audit ID for tracking
            dry_run: If True, don't actually make changes
            reason: Reason for the resolution

        Returns:
            DeduplicationResult with details
        """
        result = DeduplicationResult(
            success=True,
            duplicates_found=len(episode_ids),
            dry_run=dry_run
        )

        try:
            # Fetch all episodes
            episodes = []
            for eid in episode_ids:
                ep = await Content.find_one(Content.id == PydanticObjectId(eid))
                if ep:
                    episodes.append(ep)

            if len(episodes) < 2:
                result.success = False
                result.errors.append("Need at least 2 episodes to resolve duplicates")
                return result

            # Determine which to keep
            if keep_id:
                keep_episode = next((e for e in episodes if str(e.id) == keep_id), None)
                if not keep_episode:
                    result.success = False
                    result.errors.append(f"Episode {keep_id} not found in group")
                    return result
            else:
                keep_episode = self._select_episode_to_keep(episodes)

            result.kept_episode_ids = [str(keep_episode.id)]

            # Process duplicates
            for episode in episodes:
                if str(episode.id) == str(keep_episode.id):
                    continue

                if dry_run:
                    result.removed_episode_ids.append(str(episode.id))
                    result.duplicates_resolved += 1
                    continue

                before_state = {"is_published": episode.is_published}

                if action == "delete":
                    await episode.delete()
                    after_state = {"deleted": True}
                else:
                    episode.is_published = False
                    episode.updated_at = datetime.utcnow()
                    await episode.save()
                    after_state = {"is_published": False}

                result.removed_episode_ids.append(str(episode.id))
                result.duplicates_resolved += 1

                # Log action
                if audit_id:
                    lib_action = LibrarianAction(
                        audit_id=audit_id,
                        action_type=f"resolve_duplicate_{action}",
                        content_id=str(episode.id),
                        content_type="episode",
                        issue_type="duplicate_episode",
                        description=reason or f"'{episode.title}' is duplicate of '{keep_episode.title}'",
                        before_state=before_state,
                        after_state=after_state,
                        confidence_score=1.0,
                        auto_approved=True,
                        timestamp=datetime.utcnow()
                    )
                    await lib_action.insert()

            logger.info(
                f"Resolved duplicate group: kept {keep_episode.id}, "
                f"{action}ed {result.duplicates_resolved} duplicates"
            )

        except Exception as e:
            logger.error(f"Error resolving duplicate group: {e}", exc_info=True)
            result.success = False
            result.errors.append(str(e))

        return result

    async def auto_resolve_duplicate_episodes(
        self,
        strategy: str = None,
        audit_id: Optional[str] = None,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Automatically resolve all duplicate episodes.

        Args:
            strategy: Resolution strategy (keep_highest_quality, keep_oldest, etc.)
            audit_id: Audit ID for tracking
            dry_run: If True, don't actually make changes

        Returns:
            Dict with statistics and results
        """
        if strategy is None:
            strategy = self._duplicate_resolution_strategy

        results = {
            "success": True,
            "strategy": strategy,
            "groups_found": 0,
            "groups_resolved": 0,
            "episodes_removed": 0,
            "dry_run": dry_run,
            "details": []
        }

        try:
            duplicate_groups = await self.find_duplicate_episodes()
            results["groups_found"] = len(duplicate_groups)

            for group in duplicate_groups:
                resolution = await self.resolve_duplicate_episode_group(
                    episode_ids=group.episode_ids,
                    keep_id=None,  # Auto-select based on strategy
                    action="unpublish",
                    audit_id=audit_id,
                    dry_run=dry_run,
                    reason=f"Auto-resolved using {strategy} strategy"
                )

                if resolution.success:
                    results["groups_resolved"] += 1
                    results["episodes_removed"] += resolution.duplicates_resolved

                results["details"].append({
                    "series_title": group.series_title,
                    "season": group.season,
                    "episode": group.episode,
                    "kept_id": resolution.kept_episode_ids[0] if resolution.kept_episode_ids else None,
                    "removed_ids": resolution.removed_episode_ids,
                    "success": resolution.success,
                    "errors": resolution.errors
                })

        except Exception as e:
            logger.error(f"Error in auto_resolve_duplicate_episodes: {e}", exc_info=True)
            results["success"] = False
            results["error"] = str(e)

        logger.info(
            f"Auto-dedup complete: {results['groups_resolved']}/{results['groups_found']} groups, "
            f"{results['episodes_removed']} episodes removed"
        )

        return results

    async def find_episodes_with_incomplete_data(self) -> List[Dict[str, Any]]:
        """
        Find episodes with missing season or episode numbers.

        Returns:
            List of episodes with incomplete data
        """
        results = []

        try:
            # Find episodes that have series_id but missing season/episode
            query = {
                "series_id": {"$ne": None},
                "is_series": {"$ne": True},
                "$or": [
                    {"season": None},
                    {"episode": None}
                ]
            }

            episodes = await Content.find(query).limit(100).to_list()

            for ep in episodes:
                results.append({
                    "content_id": str(ep.id),
                    "title": ep.title,
                    "series_id": ep.series_id,
                    "season": ep.season,
                    "episode": ep.episode,
                    "missing": []
                })
                if ep.season is None:
                    results[-1]["missing"].append("season")
                if ep.episode is None:
                    results[-1]["missing"].append("episode")

        except Exception as e:
            logger.error(f"Error finding incomplete episodes: {e}")

        return results

    async def validate_episode_uniqueness(self) -> Dict[str, Any]:
        """
        Validate that all episodes have unique (series_id, season, episode) combinations.

        Returns:
            Dict with validation results
        """
        return {
            "valid": True,
            "duplicate_groups": await self.find_duplicate_episodes(),
            "incomplete_episodes": await self.find_episodes_with_incomplete_data()
        }


# Singleton instance getter
_series_linker_service: Optional[SeriesLinkerService] = None


def get_series_linker_service() -> SeriesLinkerService:
    """Get or create the singleton SeriesLinkerService instance."""
    global _series_linker_service
    if _series_linker_service is None:
        _series_linker_service = SeriesLinkerService()
    return _series_linker_service

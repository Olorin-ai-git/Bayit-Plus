"""
AI Agent Executors - Series Management

Functions for series-episode linking and episode deduplication.
"""

import asyncio
import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Hebrew series name mapping (Hebrew -> English for TMDB search)
HEBREW_SERIES_MAPPING = {
    "הבורגנים": "The Bourgeois",
    "פאודה": "Fauda",
    "שטיסל": "Shtisel",
    "טהרן": "Tehran",
    "הבורר": "The Arbitrator",
    "מאפיה": "Mafia",
}


async def execute_find_unlinked_episodes(
    limit: int = 100
) -> Dict[str, Any]:
    """Find episodes that are not linked to any series."""
    try:
        from app.services.series_linker_service import get_series_linker_service

        service = get_series_linker_service()
        unlinked = await service.find_unlinked_episodes(limit=limit)

        return {
            "success": True,
            "total_found": len(unlinked),
            "episodes": [
                {
                    "content_id": ep.content_id,
                    "title": ep.title,
                    "title_en": ep.title_en,
                    "extracted_series_name": ep.extracted_series_name,
                    "season": ep.season,
                    "episode": ep.episode,
                    "created_at": ep.created_at.isoformat() if ep.created_at else None
                }
                for ep in unlinked
            ],
            "message": f"Found {len(unlinked)} unlinked episodes"
        }

    except Exception as e:
        logger.error(f"Error finding unlinked episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_link_episode_to_series(
    episode_id: str,
    series_id: str,
    reason: str = "",
    season: Optional[int] = None,
    episode: Optional[int] = None,
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Link an episode to its parent series."""
    try:
        from app.services.series_linker_service import get_series_linker_service

        service = get_series_linker_service()
        result = await service.link_episode_to_series(
            episode_id=episode_id,
            series_id=series_id,
            season=season,
            episode_num=episode,
            audit_id=audit_id,
            dry_run=dry_run,
            reason=reason
        )

        return {
            "success": result.success,
            "episode_id": result.episode_id,
            "series_id": result.series_id,
            "series_title": result.series_title,
            "action": result.action,
            "confidence": result.confidence,
            "dry_run": result.dry_run,
            "error": result.error
        }

    except Exception as e:
        logger.error(f"Error linking episode to series: {e}")
        return {"success": False, "error": str(e)}


async def execute_auto_link_episodes(
    limit: int = 50,
    confidence_threshold: Optional[float] = None,
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Automatically link unlinked episodes to their parent series."""
    try:
        from app.services.series_linker_service import get_series_linker_service

        service = get_series_linker_service()

        # Temporarily override confidence threshold if provided
        if confidence_threshold is not None:
            original_threshold = service._auto_link_confidence_threshold
            service._auto_link_confidence_threshold = confidence_threshold

        result = await service.auto_link_unlinked_episodes(
            limit=limit,
            audit_id=audit_id,
            dry_run=dry_run
        )

        # Restore original threshold
        if confidence_threshold is not None:
            service._auto_link_confidence_threshold = original_threshold

        return result

    except Exception as e:
        logger.error(f"Error in auto-link episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_duplicate_episodes(
    series_id: Optional[str] = None
) -> Dict[str, Any]:
    """Find duplicate episodes (same series + season + episode)."""
    try:
        from app.services.series_linker_service import get_series_linker_service

        service = get_series_linker_service()
        duplicates = await service.find_duplicate_episodes(series_id=series_id)

        return {
            "success": True,
            "duplicate_groups": len(duplicates),
            "groups": [
                {
                    "series_id": group.series_id,
                    "series_title": group.series_title,
                    "season": group.season,
                    "episode": group.episode,
                    "episode_count": len(group.episode_ids),
                    "episode_ids": group.episode_ids,
                    "episode_titles": group.episode_titles,
                    "file_sizes": group.file_sizes,
                    "resolutions": group.resolutions
                }
                for group in duplicates
            ],
            "message": f"Found {len(duplicates)} groups of duplicate episodes"
        }

    except Exception as e:
        logger.error(f"Error finding duplicate episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_resolve_duplicate_episodes(
    episode_ids: List[str],
    keep_id: Optional[str] = None,
    reason: str = "",
    action: str = "unpublish",
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Resolve a group of duplicate episodes."""
    try:
        from app.services.series_linker_service import get_series_linker_service

        service = get_series_linker_service()
        result = await service.resolve_duplicate_episode_group(
            episode_ids=episode_ids,
            keep_id=keep_id,
            action=action,
            audit_id=audit_id,
            dry_run=dry_run,
            reason=reason
        )

        return {
            "success": result.success,
            "duplicates_found": result.duplicates_found,
            "duplicates_resolved": result.duplicates_resolved,
            "kept_episode_ids": result.kept_episode_ids,
            "removed_episode_ids": result.removed_episode_ids,
            "dry_run": result.dry_run,
            "errors": result.errors
        }

    except Exception as e:
        logger.error(f"Error resolving duplicate episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_create_series_from_episode(
    episode_id: str,
    series_title: str,
    reason: str = "",
    tmdb_id: Optional[int] = None,
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Create a new series from episode information."""
    try:
        from beanie import PydanticObjectId
        from datetime import datetime

        from app.models.content import Content, Category
        from app.models.librarian import LibrarianAction
        from app.services.tmdb_service import TMDBService
        from app.core.config import settings

        # Get the episode
        episode = await Content.find_one(Content.id == PydanticObjectId(episode_id))
        if not episode:
            return {"success": False, "error": f"Episode {episode_id} not found"}

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would create series '{series_title}' and link episode"
            }

        # Try to get metadata from TMDB if tmdb_id provided
        series_data = {
            "title": series_title,
            "title_en": None,
            "description": None,
            "poster_url": None,
            "thumbnail": None,
            "backdrop": None,
            "year": episode.year,
            "tmdb_id": tmdb_id,
            "genres": episode.genres,
            "is_series": True,
            "content_type": "series",
            "is_published": True
        }

        if tmdb_id and settings.TMDB_API_KEY:
            tmdb = TMDBService()
            details = await tmdb.get_tv_series_details(tmdb_id)
            if details:
                series_data.update({
                    "title": details.get("name") or series_title,
                    "title_en": details.get("original_name"),
                    "description": details.get("overview"),
                    "poster_url": tmdb.get_image_url(details.get("poster_path"), "w500") if details.get("poster_path") else None,
                    "thumbnail": tmdb.get_image_url(details.get("poster_path"), "w500") if details.get("poster_path") else None,
                    "backdrop": tmdb.get_image_url(details.get("backdrop_path"), "w1280") if details.get("backdrop_path") else None,
                    "tmdb_id": details.get("id"),
                    "imdb_id": details.get("external_ids", {}).get("imdb_id"),
                    "imdb_rating": details.get("vote_average"),
                    "total_seasons": details.get("number_of_seasons"),
                    "total_episodes": details.get("number_of_episodes"),
                    "genres": [g.get("name") for g in details.get("genres", [])]
                })

                first_air_date = details.get("first_air_date", "")
                if first_air_date:
                    try:
                        series_data["year"] = int(first_air_date.split("-")[0])
                    except (ValueError, IndexError):
                        pass

        # Find a category for series
        series_category = await Category.find_one({"slug": "series"})
        if not series_category:
            series_category = await Category.find_one({"slug": "tv"})
        if not series_category:
            series_category = await Category.find_one({})

        category_id = str(series_category.id) if series_category else ""

        # Create the series
        new_series = Content(
            title=series_data["title"],
            title_en=series_data["title_en"],
            description=series_data["description"],
            poster_url=series_data["poster_url"],
            thumbnail=series_data["thumbnail"],
            backdrop=series_data["backdrop"],
            year=series_data["year"],
            tmdb_id=series_data["tmdb_id"],
            imdb_id=series_data.get("imdb_id"),
            imdb_rating=series_data.get("imdb_rating"),
            total_seasons=series_data.get("total_seasons"),
            total_episodes=series_data.get("total_episodes"),
            genres=series_data.get("genres", []),
            is_series=True,
            content_type="series",
            is_published=True,
            category_id=category_id,
            stream_url="",  # Series container doesn't need stream URL
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        await new_series.insert()

        # Link the episode to the new series
        episode.series_id = str(new_series.id)
        episode.updated_at = datetime.utcnow()
        await episode.save()

        # Log the action
        if audit_id:
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="create_series",
                content_id=str(new_series.id),
                content_type="series",
                issue_type="missing_series",
                description=reason or f"Created series '{series_data['title']}' from episode",
                before_state={},
                after_state={"series_id": str(new_series.id), "title": series_data["title"]},
                confidence_score=1.0,
                auto_approved=True,
                timestamp=datetime.utcnow()
            )
            await action.insert()

        logger.info(f"Created series '{series_data['title']}' and linked episode {episode_id}")

        return {
            "success": True,
            "series_id": str(new_series.id),
            "series_title": series_data["title"],
            "episode_id": episode_id,
            "message": f"Created series '{series_data['title']}' and linked episode"
        }

    except Exception as e:
        logger.error(f"Error creating series from episode: {e}")
        return {"success": False, "error": str(e)}


async def execute_sync_series_posters_to_episodes(
    series_id: Optional[str] = None,
    fetch_from_tmdb: bool = True,
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Synchronize series posters to all linked episodes.

    When a series has a poster, this applies the same poster/thumbnail/backdrop
    to all episodes linked to that series. If the series lacks a poster and
    has a tmdb_id, fetches artwork from TMDB (single call per series).

    Args:
        series_id: Optional specific series to process. If None, processes all series.
        fetch_from_tmdb: If True, fetch missing posters from TMDB when tmdb_id available.
        audit_id: Parent audit ID for logging actions.
        dry_run: If True, only report what would be changed.

    Returns:
        Dict with success status, counts, and details.
    """
    try:
        from beanie import PydanticObjectId
        from datetime import datetime

        from app.models.content import Content
        from app.models.librarian import LibrarianAction
        from app.services.tmdb_service import TMDBService
        from app.core.config import settings

        # Build query for series containers
        series_query = {"is_series": True}
        if series_id:
            series_query["_id"] = PydanticObjectId(series_id)

        series_list = await Content.find(series_query).to_list()

        results = {
            "success": True,
            "series_processed": 0,
            "episodes_updated": 0,
            "tmdb_fetches": 0,
            "series_without_episodes": 0,
            "series_already_synced": 0,
            "errors": [],
            "details": [],
            "dry_run": dry_run
        }

        tmdb = TMDBService() if fetch_from_tmdb and settings.TMDB_API_KEY else None

        for series in series_list:
            series_detail = {
                "series_id": str(series.id),
                "series_title": series.title,
                "episodes_updated": 0,
                "poster_source": None,
                "actions": []
            }

            try:
                # Get series poster - either existing or fetch from TMDB
                poster_url = series.poster_url
                thumbnail = series.thumbnail or series.poster_url
                backdrop = series.backdrop

                # If no poster and we have TMDB ID, fetch from TMDB
                if not poster_url and series.tmdb_id and tmdb:
                    logger.info(f"Fetching poster from TMDB for series '{series.title}' (tmdb_id={series.tmdb_id})")
                    details = await tmdb.get_tv_series_details(series.tmdb_id)

                    if details:
                        if details.get("poster_path"):
                            poster_url = tmdb.get_image_url(details["poster_path"], "w500")
                            thumbnail = poster_url
                        if details.get("backdrop_path"):
                            backdrop = tmdb.get_image_url(details["backdrop_path"], "w1280")

                        results["tmdb_fetches"] += 1
                        series_detail["poster_source"] = "tmdb"

                        # Update series with fetched artwork if not dry run
                        if not dry_run and (poster_url or backdrop):
                            series.poster_url = poster_url or series.poster_url
                            series.thumbnail = thumbnail or series.thumbnail
                            series.backdrop = backdrop or series.backdrop
                            series.updated_at = datetime.utcnow()
                            await series.save()
                            series_detail["actions"].append("updated_series_poster_from_tmdb")
                else:
                    series_detail["poster_source"] = "existing" if poster_url else "none"

                # Skip if no poster available
                if not poster_url:
                    logger.debug(f"Series '{series.title}' has no poster to sync")
                    continue

                # Find all episodes linked to this series
                episodes = await Content.find({
                    "series_id": str(series.id),
                    "is_series": False
                }).to_list()

                if not episodes:
                    results["series_without_episodes"] += 1
                    series_detail["actions"].append("no_episodes_found")
                    results["details"].append(series_detail)
                    continue

                # Check which episodes need updating
                episodes_to_update = []
                for ep in episodes:
                    needs_update = (
                        ep.poster_url != poster_url or
                        ep.thumbnail != thumbnail or
                        (backdrop and ep.backdrop != backdrop)
                    )
                    if needs_update:
                        episodes_to_update.append(ep)

                if not episodes_to_update:
                    results["series_already_synced"] += 1
                    series_detail["actions"].append("already_synced")
                    results["details"].append(series_detail)
                    continue

                # Update episodes
                for ep in episodes_to_update:
                    if dry_run:
                        series_detail["episodes_updated"] += 1
                        continue

                    before_state = {
                        "poster_url": ep.poster_url,
                        "thumbnail": ep.thumbnail,
                        "backdrop": ep.backdrop
                    }

                    ep.poster_url = poster_url
                    ep.thumbnail = thumbnail
                    if backdrop:
                        ep.backdrop = backdrop
                    ep.updated_at = datetime.utcnow()
                    await ep.save()

                    series_detail["episodes_updated"] += 1
                    results["episodes_updated"] += 1

                    # Log action if audit_id provided
                    if audit_id:
                        action = LibrarianAction(
                            audit_id=audit_id,
                            action_type="sync_episode_poster",
                            content_id=str(ep.id),
                            content_type="episode",
                            issue_type="missing_poster",
                            description=f"Synced poster from series '{series.title}' to episode '{ep.title}'",
                            before_state=before_state,
                            after_state={
                                "poster_url": poster_url,
                                "thumbnail": thumbnail,
                                "backdrop": backdrop
                            },
                            confidence_score=1.0,
                            auto_approved=True,
                            timestamp=datetime.utcnow()
                        )
                        await action.insert()

                series_detail["actions"].append(f"updated_{series_detail['episodes_updated']}_episodes")
                results["series_processed"] += 1

            except Exception as e:
                error_msg = f"Error processing series '{series.title}': {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
                series_detail["actions"].append(f"error: {str(e)}")

            results["details"].append(series_detail)

        # Close TMDB client if used
        if tmdb:
            await tmdb.close()

        results["message"] = (
            f"{'[DRY RUN] Would process' if dry_run else 'Processed'} "
            f"{results['series_processed']} series, "
            f"{'would update' if dry_run else 'updated'} {results['episodes_updated']} episodes"
        )

        logger.info(f"Series poster sync complete: {results['message']}")
        return results

    except Exception as e:
        logger.error(f"Error in sync series posters to episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_misclassified_episodes(
    limit: int = 100
) -> Dict[str, Any]:
    """
    Find content items that are misclassified as series containers but are actually episodes.

    These are items with:
    - is_series=True (marked as series container)
    - But have a stream_url (actual video file)
    - And filename contains episode patterns (S01E01, etc.)

    Returns grouped by series name for easy fixing.
    """
    try:
        import re
        from app.models.content import Content

        # Find items marked as series but with stream URLs containing episode patterns
        misclassified = await Content.find({
            "is_series": True,
            "stream_url": {"$ne": "", "$exists": True},
        }).to_list(limit * 2)  # Get more to filter

        # Filter and group by series name
        episode_pattern = re.compile(r'[._\-\s]S(\d+)E(\d+)', re.IGNORECASE)
        series_groups: Dict[str, List[Dict[str, Any]]] = {}

        for item in misclassified:
            stream_url = item.stream_url or ""
            title = item.title or ""

            # Check if this looks like an episode
            match = episode_pattern.search(stream_url) or episode_pattern.search(title)
            if not match:
                continue

            season = int(match.group(1))
            episode = int(match.group(2))

            # Extract series name from title (remove episode markers)
            series_name = re.sub(r'\s*S\d+E\d+.*$', '', title, flags=re.IGNORECASE).strip()
            if not series_name:
                # Try to extract from stream URL
                url_match = re.search(r'/([^/]+)\.S\d+E\d+', stream_url, re.IGNORECASE)
                if url_match:
                    series_name = url_match.group(1).replace('.', ' ').replace('_', ' ')

            if not series_name:
                series_name = "Unknown Series"

            if series_name not in series_groups:
                series_groups[series_name] = []

            series_groups[series_name].append({
                "content_id": str(item.id),
                "title": item.title,
                "stream_url": stream_url[:100] + "..." if len(stream_url) > 100 else stream_url,
                "detected_season": season,
                "detected_episode": episode,
                "has_poster": bool(item.poster_url),
                "tmdb_id": item.tmdb_id
            })

            if len(series_groups) >= limit:
                break

        # Format results
        groups_list = [
            {
                "series_name": name,
                "episode_count": len(episodes),
                "episodes": sorted(episodes, key=lambda x: (x["detected_season"], x["detected_episode"]))
            }
            for name, episodes in series_groups.items()
        ]

        total_episodes = sum(len(g["episodes"]) for g in groups_list)

        return {
            "success": True,
            "total_misclassified": total_episodes,
            "series_groups": len(groups_list),
            "groups": groups_list,
            "message": f"Found {total_episodes} misclassified episodes in {len(groups_list)} series groups"
        }

    except Exception as e:
        logger.error(f"Error finding misclassified episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_fix_misclassified_series(
    series_name: str,
    tmdb_id: Optional[int] = None,
    fetch_tmdb_metadata: bool = True,
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Fix misclassified episodes for a specific series.

    This function:
    1. Finds all items marked as is_series=True with matching series name
    2. Creates or finds a proper parent series container
    3. Fetches TMDB metadata if tmdb_id provided or found
    4. Converts misclassified items to proper episodes (is_series=False)
    5. Links them to the parent series and applies poster/metadata

    Args:
        series_name: Name of the series to fix (e.g., "1883", "Breaking Bad")
        tmdb_id: Optional TMDB ID for the series (for metadata lookup)
        fetch_tmdb_metadata: If True, fetch metadata from TMDB
        audit_id: Parent audit ID for logging actions
        dry_run: If True, only report what would be fixed

    Returns:
        Dict with results of the fix operation.
    """
    try:
        import re
        from datetime import datetime
        from beanie import PydanticObjectId

        from app.models.content import Content, Category
        from app.models.librarian import LibrarianAction
        from app.services.tmdb_service import TMDBService
        from app.core.config import settings

        results = {
            "success": True,
            "series_name": series_name,
            "parent_series_id": None,
            "parent_series_created": False,
            "episodes_fixed": 0,
            "episodes_found": 0,
            "tmdb_metadata_applied": False,
            "poster_url": None,
            "errors": [],
            "fixed_episodes": [],
            "dry_run": dry_run
        }

        episode_pattern = re.compile(r'[._\-\s]S(\d+)E(\d+)', re.IGNORECASE)

        # Find all misclassified items for this series
        misclassified = await Content.find({
            "is_series": True,
            "stream_url": {"$ne": "", "$exists": True},
            "$or": [
                {"title": {"$regex": f"^{re.escape(series_name)}", "$options": "i"}},
                {"title_en": {"$regex": f"^{re.escape(series_name)}", "$options": "i"}}
            ]
        }).to_list()

        # Filter to only items with episode patterns
        episodes_to_fix = []
        for item in misclassified:
            stream_url = item.stream_url or ""
            title = item.title or ""
            match = episode_pattern.search(stream_url) or episode_pattern.search(title)
            if match:
                episodes_to_fix.append({
                    "content": item,
                    "season": int(match.group(1)),
                    "episode": int(match.group(2))
                })

        results["episodes_found"] = len(episodes_to_fix)

        if not episodes_to_fix:
            results["message"] = f"No misclassified episodes found for series '{series_name}'"
            return results

        logger.info(f"Found {len(episodes_to_fix)} misclassified episodes for '{series_name}'")

        # Find or create proper parent series container
        parent_series = await Content.find_one({
            "is_series": True,
            "content_type": "series",
            "$or": [
                {"stream_url": ""},
                {"stream_url": None},
                {"stream_url": {"$exists": False}}
            ],
            "$or": [
                {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
                {"title_en": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}}
            ]
        })

        # Fetch TMDB metadata
        tmdb_data = None
        tmdb = None
        if fetch_tmdb_metadata and settings.TMDB_API_KEY:
            tmdb = TMDBService()

            # If no tmdb_id provided, try to search
            if not tmdb_id:
                search_result = await tmdb.search_tv_series(series_name)
                if search_result:
                    tmdb_id = search_result.get("id")
                    logger.info(f"Found TMDB ID {tmdb_id} for '{series_name}'")

            if tmdb_id:
                tmdb_data = await tmdb.get_tv_series_details(tmdb_id)
                if tmdb_data:
                    results["tmdb_metadata_applied"] = True
                    results["poster_url"] = tmdb.get_image_url(tmdb_data.get("poster_path"), "w500") if tmdb_data.get("poster_path") else None

        # Build series metadata
        poster_url = None
        backdrop_url = None
        external_ids = {}

        if tmdb_data:
            poster_url = tmdb.get_image_url(tmdb_data["poster_path"], "w500") if tmdb_data.get("poster_path") else None
            backdrop_url = tmdb.get_image_url(tmdb_data["backdrop_path"], "w1280") if tmdb_data.get("backdrop_path") else None
            external_ids = tmdb_data.get("external_ids", {})

        if dry_run:
            results["message"] = (
                f"[DRY RUN] Would fix {len(episodes_to_fix)} episodes for '{series_name}'. "
                f"Parent series {'exists' if parent_series else 'would be created'}. "
                f"TMDB metadata {'would be applied' if tmdb_data else 'not available'}."
            )
            if tmdb:
                await tmdb.close()
            return results

        # Create parent series if needed
        if not parent_series:
            category = await Category.find_one({"slug": "series"})
            if not category:
                category = await Category.find_one({"name": "Series"})

            parent_series = Content(
                title=series_name,
                title_en=series_name,
                description=tmdb_data.get("overview") if tmdb_data else None,
                description_en=tmdb_data.get("overview") if tmdb_data else None,
                poster_url=poster_url,
                thumbnail=poster_url,
                backdrop=backdrop_url,
                year=int(tmdb_data.get("first_air_date", "")[:4]) if tmdb_data and tmdb_data.get("first_air_date") else None,
                tmdb_id=tmdb_id,
                imdb_id=external_ids.get("imdb_id"),
                imdb_rating=tmdb_data.get("vote_average") if tmdb_data else None,
                imdb_votes=tmdb_data.get("vote_count") if tmdb_data else None,
                total_seasons=tmdb_data.get("number_of_seasons") if tmdb_data else None,
                total_episodes=tmdb_data.get("number_of_episodes") if tmdb_data else None,
                genres=[g.get("name") for g in tmdb_data.get("genres", [])] if tmdb_data else [],
                is_series=True,
                content_type="series",
                is_published=True,
                category_id=str(category.id) if category else "",
                category_name="Series",
                stream_url="",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            await parent_series.insert()
            results["parent_series_created"] = True
            logger.info(f"Created parent series container: '{series_name}' (ID: {parent_series.id})")

            # Log action
            if audit_id:
                action = LibrarianAction(
                    audit_id=audit_id,
                    action_type="create_series_container",
                    content_id=str(parent_series.id),
                    content_type="series",
                    issue_type="missing_series_container",
                    description=f"Created series container '{series_name}' for misclassified episodes",
                    before_state={},
                    after_state={"series_id": str(parent_series.id), "title": series_name, "tmdb_id": tmdb_id},
                    confidence_score=1.0,
                    auto_approved=True,
                    timestamp=datetime.utcnow()
                )
                await action.insert()

        results["parent_series_id"] = str(parent_series.id)

        # Update parent series with TMDB data if it was missing
        if tmdb_data and not parent_series.poster_url:
            parent_series.poster_url = poster_url
            parent_series.thumbnail = poster_url
            parent_series.backdrop = backdrop_url
            parent_series.description = tmdb_data.get("overview")
            parent_series.tmdb_id = tmdb_id
            parent_series.imdb_id = external_ids.get("imdb_id")
            parent_series.imdb_rating = tmdb_data.get("vote_average")
            parent_series.total_seasons = tmdb_data.get("number_of_seasons")
            parent_series.total_episodes = tmdb_data.get("number_of_episodes")
            parent_series.updated_at = datetime.utcnow()
            await parent_series.save()
            logger.info(f"Updated parent series with TMDB metadata")

        # Convert misclassified items to episodes
        for ep_data in episodes_to_fix:
            content = ep_data["content"]
            season = ep_data["season"]
            episode = ep_data["episode"]

            try:
                before_state = {
                    "is_series": content.is_series,
                    "content_type": content.content_type,
                    "series_id": content.series_id,
                    "season": content.season,
                    "episode": content.episode
                }

                # Update to episode
                content.is_series = False
                content.content_type = "episode"
                content.series_id = str(parent_series.id)
                content.season = season
                content.episode = episode
                content.title = f"{series_name} S{season:02d}E{episode:02d}"
                content.title_en = f"{series_name} S{season:02d}E{episode:02d}"
                content.poster_url = poster_url or parent_series.poster_url
                content.thumbnail = poster_url or parent_series.thumbnail
                content.backdrop = backdrop_url or parent_series.backdrop
                content.tmdb_id = tmdb_id or parent_series.tmdb_id
                content.imdb_id = external_ids.get("imdb_id") or parent_series.imdb_id
                content.imdb_rating = tmdb_data.get("vote_average") if tmdb_data else parent_series.imdb_rating
                if tmdb_data:
                    content.description = tmdb_data.get("overview")
                    content.genres = [g.get("name") for g in tmdb_data.get("genres", [])]
                content.updated_at = datetime.utcnow()

                await content.save()
                results["episodes_fixed"] += 1
                results["fixed_episodes"].append({
                    "content_id": str(content.id),
                    "title": content.title,
                    "season": season,
                    "episode": episode
                })

                logger.info(f"Fixed episode: {content.title}")

                # Log action
                if audit_id:
                    action = LibrarianAction(
                        audit_id=audit_id,
                        action_type="fix_misclassified_episode",
                        content_id=str(content.id),
                        content_type="episode",
                        issue_type="misclassified_as_series",
                        description=f"Fixed '{content.title}': converted from series to episode S{season:02d}E{episode:02d}",
                        before_state=before_state,
                        after_state={
                            "is_series": False,
                            "content_type": "episode",
                            "series_id": str(parent_series.id),
                            "season": season,
                            "episode": episode
                        },
                        confidence_score=1.0,
                        auto_approved=True,
                        timestamp=datetime.utcnow()
                    )
                    await action.insert()

            except Exception as e:
                error_msg = f"Error fixing episode {content.id}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)

        if tmdb:
            await tmdb.close()

        results["message"] = (
            f"Fixed {results['episodes_fixed']}/{results['episodes_found']} episodes for '{series_name}'. "
            f"Parent series: {results['parent_series_id']}. "
            f"TMDB metadata: {'applied' if results['tmdb_metadata_applied'] else 'not available'}."
        )

        return results

    except Exception as e:
        logger.error(f"Error fixing misclassified series: {e}")
        return {"success": False, "error": str(e)}


async def execute_organize_all_series(
    fetch_tmdb_metadata: bool = True,
    propagate_to_episodes: bool = True,
    include_hebrew: bool = True,
    audit_id: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Comprehensive series organization tool.

    Scans all content in the database, identifies episodes by title patterns,
    groups them by series name, creates series parent containers with TMDB
    metadata and posters, links all episodes to their parents, and propagates
    poster/backdrop to episodes.

    Args:
        fetch_tmdb_metadata: If True, fetch metadata from TMDB for each series.
        propagate_to_episodes: If True, apply series poster/backdrop to episodes.
        include_hebrew: If True, process Hebrew series with title mapping.
        audit_id: Parent audit ID for logging actions.
        dry_run: If True, only report what would be done.

    Returns:
        Dict with comprehensive results of the organization.
    """
    try:
        from app.core.config import settings
        from app.models.content import Content, Category
        from app.models.librarian import LibrarianAction

        results = {
            "success": True,
            "dry_run": dry_run,
            "series_found": 0,
            "series_created": 0,
            "series_updated": 0,
            "episodes_linked": 0,
            "episodes_enriched": 0,
            "tmdb_fetched": 0,
            "hebrew_series": [],
            "all_series": [],
            "errors": []
        }

        logger.info("=" * 60)
        logger.info("ORGANIZE ALL SERIES - Starting comprehensive series organization")
        logger.info("=" * 60)

        # Step 1: Scan all content for series patterns
        logger.info("Step 1: Scanning database for series content...")

        all_content = await Content.find({}).to_list()
        logger.info(f"Total content items: {len(all_content)}")

        # Episode pattern: S01E01, S1E1, etc.
        episode_pattern = re.compile(r'^(.+?)\s*[Ss](\d+)[Ee](\d+)')

        # Group by series name
        series_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        for content in all_content:
            title = content.title or ""
            match = episode_pattern.match(title)

            if match:
                series_name = match.group(1).strip()
                season = int(match.group(2))
                episode = int(match.group(3))

                series_groups[series_name].append({
                    "content": content,
                    "season": season,
                    "episode": episode
                })

        results["series_found"] = len(series_groups)
        logger.info(f"Found {len(series_groups)} series with {sum(len(eps) for eps in series_groups.values())} total episodes")

        if not series_groups:
            results["message"] = "No series found in database"
            return results

        # Step 2: Process each series
        logger.info("\nStep 2: Processing each series...")

        # Get TMDB API key
        tmdb_api_key = settings.TMDB_API_KEY if hasattr(settings, 'TMDB_API_KEY') else None

        # Find series category
        series_category = await Category.find_one({"slug": "series"})
        if not series_category:
            series_category = await Category.find_one({"slug": "tv"})
        if not series_category:
            series_category = await Category.find_one({})

        category_id = str(series_category.id) if series_category else ""

        async with httpx.AsyncClient(timeout=10.0) as client:
            for series_name, episodes in sorted(series_groups.items(), key=lambda x: -len(x[1])):
                series_info = {
                    "name": series_name,
                    "episode_count": len(episodes),
                    "tmdb_id": None,
                    "poster_url": None,
                    "is_hebrew": False
                }

                # Check if Hebrew
                is_hebrew = any(0x0590 <= ord(c) <= 0x05FF for c in series_name)
                series_info["is_hebrew"] = is_hebrew

                if is_hebrew:
                    results["hebrew_series"].append(series_name)
                    if not include_hebrew:
                        logger.info(f"Skipping Hebrew series: {series_name}")
                        continue

                logger.info(f"\n📺 Processing: {series_name} ({len(episodes)} episodes)")

                try:
                    # Get TMDB metadata
                    tmdb_data = None
                    poster_url = None
                    backdrop_url = None

                    if fetch_tmdb_metadata and tmdb_api_key:
                        # Use English mapping for Hebrew series
                        search_name = HEBREW_SERIES_MAPPING.get(series_name, series_name)

                        # Search TMDB
                        params = {"api_key": tmdb_api_key, "query": search_name}
                        resp = await client.get("https://api.themoviedb.org/3/search/tv", params=params)

                        if resp.status_code == 200:
                            data = resp.json()
                            if data.get("results"):
                                tmdb_id = data["results"][0].get("id")
                                series_info["tmdb_id"] = tmdb_id

                                # Get full details
                                detail_params = {
                                    "api_key": tmdb_api_key,
                                    "append_to_response": "external_ids,videos,credits"
                                }
                                detail_resp = await client.get(
                                    f"https://api.themoviedb.org/3/tv/{tmdb_id}",
                                    params=detail_params
                                )

                                if detail_resp.status_code == 200:
                                    tmdb_data = detail_resp.json()
                                    results["tmdb_fetched"] += 1

                                    if tmdb_data.get("poster_path"):
                                        poster_url = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
                                        series_info["poster_url"] = poster_url
                                    if tmdb_data.get("backdrop_path"):
                                        backdrop_url = f"https://image.tmdb.org/t/p/w1280{tmdb_data['backdrop_path']}"

                                    logger.info(f"   ✅ TMDB: ID={tmdb_id}, Rating={tmdb_data.get('vote_average')}")

                    if dry_run:
                        results["all_series"].append(series_info)
                        continue

                    # Find or create series parent
                    parent_series = await Content.find_one({
                        "content_type": "series",
                        "is_series": True,
                        "season": None,
                        "episode": None,
                        "$or": [
                            {"title": series_name},
                            {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}}
                        ]
                    })

                    if parent_series:
                        logger.info(f"   📂 Found existing series parent: {parent_series.id}")
                        results["series_updated"] += 1
                    else:
                        # Create new series parent
                        logger.info(f"   📁 Creating new series parent for '{series_name}'")

                        # Calculate total seasons
                        seasons = set(ep["season"] for ep in episodes)

                        parent_series = Content(
                            title=series_name,
                            title_en=tmdb_data.get("original_name") if tmdb_data else None,
                            description=tmdb_data.get("overview") if tmdb_data else None,
                            description_en=tmdb_data.get("overview") if tmdb_data else None,
                            category_id=category_id,
                            content_type="series",
                            is_series=True,
                            is_published=True,
                            season=None,
                            episode=None,
                            total_seasons=len(seasons) if seasons else (tmdb_data.get("number_of_seasons") if tmdb_data else None),
                            total_episodes=len(episodes),
                            stream_url="",
                            stream_type="hls",
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc),
                        )

                        await parent_series.insert()
                        results["series_created"] += 1
                        logger.info(f"      ✅ Created: {parent_series.id}")

                        # Log action
                        if audit_id:
                            action = LibrarianAction(
                                audit_id=audit_id,
                                action_type="create_series",
                                content_id=str(parent_series.id),
                                content_type="series",
                                issue_type="series_organization",
                                description=f"Created series container '{series_name}' during full organization",
                                before_state={},
                                after_state={"series_id": str(parent_series.id), "title": series_name},
                                confidence_score=1.0,
                                auto_approved=True,
                                timestamp=datetime.now(timezone.utc)
                            )
                            await action.insert()

                    # Update series with TMDB data
                    if tmdb_data:
                        external_ids = tmdb_data.get("external_ids", {})
                        credits = tmdb_data.get("credits", {})
                        videos = tmdb_data.get("videos", {}).get("results", [])
                        cast = [c.get("name") for c in credits.get("cast", [])[:10]]
                        trailers = [v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"]
                        trailer_url = f"https://www.youtube.com/embed/{trailers[0]['key']}" if trailers else None

                        parent_series.tmdb_id = tmdb_data.get("id")
                        parent_series.imdb_id = external_ids.get("imdb_id")
                        parent_series.imdb_rating = tmdb_data.get("vote_average")
                        parent_series.imdb_votes = tmdb_data.get("vote_count")
                        parent_series.poster_url = poster_url
                        parent_series.thumbnail = poster_url
                        parent_series.backdrop = backdrop_url
                        parent_series.trailer_url = trailer_url
                        parent_series.genres = [g.get("name") for g in tmdb_data.get("genres", [])]
                        parent_series.cast = cast
                        parent_series.total_seasons = tmdb_data.get("number_of_seasons")
                        parent_series.total_episodes = tmdb_data.get("number_of_episodes")

                        if tmdb_data.get("first_air_date"):
                            try:
                                parent_series.year = int(tmdb_data["first_air_date"][:4])
                            except (ValueError, IndexError):
                                pass

                        parent_series.updated_at = datetime.now(timezone.utc)
                        await parent_series.save()
                        logger.info(f"   ✅ Updated series with TMDB data")

                    # Link episodes
                    series_id = str(parent_series.id)

                    for ep_data in episodes:
                        content = ep_data["content"]
                        season = ep_data["season"]
                        episode_num = ep_data["episode"]

                        content.series_id = series_id
                        content.is_series = True
                        content.content_type = "episode"
                        content.season = season
                        content.episode = episode_num
                        content.updated_at = datetime.now(timezone.utc)

                        # Propagate metadata if enabled
                        if propagate_to_episodes and poster_url:
                            content.poster_url = poster_url
                            content.thumbnail = poster_url
                            if backdrop_url:
                                content.backdrop = backdrop_url
                            if tmdb_data:
                                content.genres = parent_series.genres
                                content.cast = parent_series.cast
                                content.tmdb_id = parent_series.tmdb_id
                                content.imdb_id = parent_series.imdb_id
                            results["episodes_enriched"] += 1

                        await content.save()
                        results["episodes_linked"] += 1

                    logger.info(f"   🔗 Linked {len(episodes)} episodes")
                    series_info["series_id"] = series_id
                    results["all_series"].append(series_info)

                except Exception as e:
                    error_msg = f"Error processing series '{series_name}': {str(e)}"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)

                # Rate limit TMDB calls
                await asyncio.sleep(0.3)

        # Build summary message
        results["message"] = (
            f"{'[DRY RUN] Would organize' if dry_run else 'Organized'} {results['series_found']} series. "
            f"Created {results['series_created']} new series containers, "
            f"updated {results['series_updated']} existing. "
            f"Linked {results['episodes_linked']} episodes, "
            f"enriched {results['episodes_enriched']} with TMDB data. "
            f"Hebrew series: {len(results['hebrew_series'])}."
        )

        logger.info("\n" + "=" * 60)
        logger.info("ORGANIZATION COMPLETE")
        logger.info("=" * 60)
        logger.info(results["message"])

        return results

    except Exception as e:
        logger.error(f"Error in organize_all_series: {e}")
        return {"success": False, "error": str(e)}

"""
AI Agent Executors - Series Management

Functions for series-episode linking and episode deduplication.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


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

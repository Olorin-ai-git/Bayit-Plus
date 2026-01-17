from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.content import Podcast, PodcastEpisode
from app.services.podcast_sync import sync_all_podcasts
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/categories")
async def get_podcast_categories():
    """Get all unique podcast categories - fast endpoint."""
    try:
        # Use distinct() for efficient category retrieval
        all_podcasts = await Podcast.find(Podcast.is_active == True).to_list()
        categories = sorted(list(set(p.category for p in all_podcasts if p.category)))

        return {
            "categories": [{"id": cat, "name": cat} for cat in categories],
            "total": len(categories),
        }
    except Exception as e:
        logger.error(f"Error fetching podcast categories: {str(e)}", exc_info=True)
        # Return empty categories on error instead of 500
        return {
            "categories": [],
            "total": 0,
        }


@router.post("/sync")
async def sync_podcasts():
    """
    Manually trigger podcast RSS sync.
    This endpoint syncs all podcast RSS feeds and fetches new episodes.
    """
    logger.info("📻 Manual podcast sync triggered")
    try:
        result = await sync_all_podcasts(max_episodes=20)
        logger.info(f"✅ Podcast sync completed: {result}")
        return {
            "status": "success",
            "message": "Podcast sync completed successfully",
            "total_podcasts": result.get("total_podcasts", 0),
            "podcasts_synced": result.get("synced_count", 0),
            "total_episodes_added": result.get("total_episodes_added", 0),
        }
    except Exception as e:
        logger.error(f"❌ Podcast sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Podcast sync failed: {str(e)}")


@router.post("/refresh")
async def refresh_all_content():
    """
    Refresh all content: podcasts, live channels, and trending data.
    Triggers manual podcast RSS sync.
    """
    logger.info("📻 Full content refresh requested - triggering podcast sync")

    try:
        result = await sync_all_podcasts(max_episodes=20)
        logger.info(f"✅ Podcast sync completed: {result}")
        return {
            "status": "success",
            "message": "Content refresh completed successfully",
            "podcasts": {
                "total": result.get("total_podcasts", 0),
                "synced": result.get("synced_count", 0),
                "episodes_added": result.get("total_episodes_added", 0),
            },
        }
    except Exception as e:
        logger.error(f"❌ Content refresh failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Content refresh failed: {str(e)}")


@router.get("")
async def get_podcasts(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get all podcasts with pagination."""
    try:
        skip = (page - 1) * limit

        query = {"is_active": True}
        if category:
            query["category"] = category

        shows = await Podcast.find(query).sort("-latest_episode_date").skip(skip).limit(limit).to_list()
        total = await Podcast.find(query).count()

        # Get unique categories
        all_podcasts = await Podcast.find(Podcast.is_active == True).to_list()
        categories = sorted(list(set(p.category for p in all_podcasts if p.category)))

        return {
            "shows": [
                {
                    "id": str(show.id),
                    "title": show.title,
                    "author": show.author,
                    "cover": show.cover,
                    "category": show.category,
                    "episodeCount": show.episode_count,
                    "latestEpisode": show.latest_episode_date.strftime("%d/%m/%Y") if show.latest_episode_date else None,
                }
                for show in shows
            ],
            "categories": [{"id": cat, "name": cat} for cat in categories],
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }
    except Exception as e:
        logger.error(f"Error fetching podcasts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch podcasts")


@router.get("/{show_id}")
async def get_podcast(show_id: str):
    """Get podcast details with episodes."""
    try:
        show = await Podcast.get(show_id)
        if not show or not show.is_active:
            raise HTTPException(status_code=404, detail="Podcast not found")

        # Get latest episodes
        episodes = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == show_id
        ).sort("-published_at").limit(50).to_list()

        return {
            "id": str(show.id),
            "title": show.title,
            "description": show.description,
            "author": show.author,
            "cover": show.cover,
            "category": show.category,
            "website": show.website,
            "episodeCount": show.episode_count,
            "episodes": [
                {
                    "id": str(ep.id),
                    "title": ep.title,
                    "description": ep.description,
                    "audioUrl": ep.audio_url,
                    "duration": ep.duration,
                    "episodeNumber": ep.episode_number,
                    "seasonNumber": ep.season_number,
                    "publishedAt": ep.published_at.strftime("%d/%m/%Y"),
                    "thumbnail": ep.thumbnail or show.cover,
                }
                for ep in episodes
            ],
            "latestEpisode": {
                "audioUrl": episodes[0].audio_url if episodes else None,
            } if episodes else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching podcast {show_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch podcast")


@router.get("/{show_id}/episodes")
async def get_episodes(
    show_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get podcast episodes with pagination."""
    try:
        skip = (page - 1) * limit

        show = await Podcast.get(show_id)
        if not show:
            raise HTTPException(status_code=404, detail="Podcast not found")

        episodes = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == show_id
        ).sort("-published_at").skip(skip).limit(limit).to_list()

        total = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == show_id
        ).count()

        return {
            "episodes": [
                {
                    "id": str(ep.id),
                    "title": ep.title,
                    "description": ep.description,
                    "audioUrl": ep.audio_url,
                    "duration": ep.duration,
                    "episodeNumber": ep.episode_number,
                    "publishedAt": ep.published_at.strftime("%d/%m/%Y"),
                }
                for ep in episodes
            ],
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episodes for podcast {show_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch episodes")


@router.get("/{show_id}/episodes/{episode_id}")
async def get_episode(show_id: str, episode_id: str):
    """Get single episode details."""
    try:
        episode = await PodcastEpisode.get(episode_id)
        if not episode or episode.podcast_id != show_id:
            raise HTTPException(status_code=404, detail="Episode not found")

        return {
            "id": str(episode.id),
            "title": episode.title,
            "description": episode.description,
            "audioUrl": episode.audio_url,
            "duration": episode.duration,
            "episodeNumber": episode.episode_number,
            "seasonNumber": episode.season_number,
            "publishedAt": episode.published_at.isoformat(),
            "thumbnail": episode.thumbnail,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episode {episode_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch episode")

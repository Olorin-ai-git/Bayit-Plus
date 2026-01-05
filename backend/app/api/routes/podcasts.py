from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.content import Podcast, PodcastEpisode

router = APIRouter()


@router.get("")
async def get_podcasts(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get all podcasts."""
    skip = (page - 1) * limit

    query = {"is_active": True}
    if category:
        query["category"] = category

    shows = await Podcast.find(query).sort("-latest_episode_date").skip(skip).limit(limit).to_list()
    total = await Podcast.find(query).count()

    # Get unique categories
    all_podcasts = await Podcast.find(Podcast.is_active == True).to_list()
    categories = list(set(p.category for p in all_podcasts if p.category))

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
        "categories": [{"id": cat, "name": cat} for cat in sorted(categories)],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{show_id}")
async def get_podcast(show_id: str):
    """Get podcast details with episodes."""
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


@router.get("/{show_id}/episodes")
async def get_episodes(
    show_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get podcast episodes with pagination."""
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


@router.get("/{show_id}/episodes/{episode_id}")
async def get_episode(show_id: str, episode_id: str):
    """Get single episode details."""
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

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request

from app.models.content import Podcast, PodcastEpisode
from app.services.podcast_sync import sync_all_podcasts

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/categories")
async def get_podcast_categories(
    request: Request,
    culture_id: Optional[str] = Query(None, description="Filter by culture ID"),
):
    """Get all unique podcast categories, optionally filtered by culture.
    Returns localized category names based on Accept-Language header.
    """
    try:
        # Get user's preferred language from Accept-Language header
        accept_language = request.headers.get("Accept-Language", "he")
        preferred_lang = accept_language.split(",")[0].split("-")[0].lower()

        # Map language codes to model fields
        lang_field_map = {
            "he": "category",
            "en": "category_en",
            "es": "category_es",
            "fr": "category_fr",
            "it": "category_it",
            "hi": "category_hi",
            "ta": "category_ta",
            "bn": "category_bn",
            "ja": "category_ja",
            "zh": "category_zh",
        }

        # Build query conditions
        query_conditions = [Podcast.is_active == True]
        if culture_id:
            query_conditions.append(Podcast.culture_id == culture_id)

        all_podcasts = await Podcast.find(*query_conditions).to_list()

        # Get unique categories with localization
        categories_map = {}
        for p in all_podcasts:
            if not p.category:
                continue

            # Use localized category name if available, fallback to Hebrew
            category_field = lang_field_map.get(preferred_lang, "category")
            localized_name = getattr(p, category_field, None) or p.category

            # Use Hebrew category as ID (consistent across all languages)
            cat_id = p.category
            if cat_id not in categories_map:
                categories_map[cat_id] = localized_name

        # Sort by localized names
        categories = [
            {"id": cat_id, "name": name}
            for cat_id, name in sorted(
                categories_map.items(), key=lambda x: x[1]
            )
        ]

        return {
            "categories": categories,
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
    request: Request,
    culture_id: Optional[str] = Query(None, description="Filter by culture ID"),
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get podcasts with pagination, optionally filtered by culture and category.
    Returns localized category names based on Accept-Language header.
    """
    try:
        # Get user's preferred language from Accept-Language header
        accept_language = request.headers.get("Accept-Language", "he")
        preferred_lang = accept_language.split(",")[0].split("-")[0].lower()

        # Map language codes to model fields
        lang_field_map = {
            "he": "category",
            "en": "category_en",
            "es": "category_es",
            "fr": "category_fr",
            "it": "category_it",
            "hi": "category_hi",
            "ta": "category_ta",
            "bn": "category_bn",
            "ja": "category_ja",
            "zh": "category_zh",
        }
        query = {"is_active": True}
        if culture_id:
            query["culture_id"] = culture_id
        if category:
            query["category"] = category

        # Fetch all matching podcasts first to deduplicate
        all_shows = (
            await Podcast.find(query)
            .sort("-latest_episode_date")
            .to_list()
        )

        # Deduplicate by title - keep the one with more episodes or most recent
        seen_titles = {}
        for show in all_shows:
            title_key = show.title.lower().strip()
            if title_key not in seen_titles:
                seen_titles[title_key] = show
            else:
                # Keep the one with more episodes
                existing = seen_titles[title_key]
                if (show.episode_count or 0) > (existing.episode_count or 0):
                    seen_titles[title_key] = show

        unique_shows = list(seen_titles.values())
        # Re-sort after deduplication
        unique_shows.sort(
            key=lambda x: x.latest_episode_date or x.created_at,
            reverse=True
        )

        total = len(unique_shows)
        # Apply pagination to deduplicated list
        skip = (page - 1) * limit
        shows = unique_shows[skip : skip + limit]

        # Aggregate available languages per show from episodes
        show_languages = {}
        for show in shows:
            show_id = str(show.id)
            episodes = await PodcastEpisode.find(
                PodcastEpisode.podcast_id == show_id
            ).to_list()
            # Collect all unique languages across episodes
            languages = set()
            for ep in episodes:
                if ep.available_languages:
                    languages.update(ep.available_languages)
                elif ep.original_language:
                    languages.add(ep.original_language)
            show_languages[show_id] = sorted(list(languages))

        # Get unique categories (filtered by culture if specified) with localization
        category_query = {"is_active": True}
        if culture_id:
            category_query["culture_id"] = culture_id
        all_podcasts = await Podcast.find(category_query).to_list()

        # Build localized category list
        categories_map = {}
        category_field = lang_field_map.get(preferred_lang, "category")
        for p in all_podcasts:
            if not p.category:
                continue
            localized_name = getattr(p, category_field, None) or p.category
            cat_id = p.category
            if cat_id not in categories_map:
                categories_map[cat_id] = localized_name

        categories = [
            {"id": cat_id, "name": name}
            for cat_id, name in sorted(categories_map.items(), key=lambda x: x[1])
        ]

        return {
            "shows": [
                {
                    "id": str(show.id),
                    "title": show.title,
                    "author": show.author,
                    "cover": show.cover,
                    "category": getattr(show, category_field, None) or show.category,
                    "culture_id": show.culture_id,
                    "episodeCount": show.episode_count,
                    "latestEpisode": (
                        show.latest_episode_date.strftime("%d/%m/%Y")
                        if show.latest_episode_date
                        else None
                    ),
                    "availableLanguages": show_languages.get(str(show.id), []),
                }
                for show in shows
            ],
            "categories": categories,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }
    except Exception as e:
        logger.error(f"Error fetching podcasts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch podcasts")


@router.get("/{show_id}")
async def get_podcast(show_id: str, request: Request):
    """Get podcast details with episodes.
    Returns localized category name based on Accept-Language header.
    """
    try:
        # Get user's preferred language from Accept-Language header
        accept_language = request.headers.get("Accept-Language", "he")
        preferred_lang = accept_language.split(",")[0].split("-")[0].lower()

        # Map language codes to model fields
        lang_field_map = {
            "he": "category",
            "en": "category_en",
            "es": "category_es",
            "fr": "category_fr",
            "it": "category_it",
            "hi": "category_hi",
            "ta": "category_ta",
            "bn": "category_bn",
            "ja": "category_ja",
            "zh": "category_zh",
        }

        show = await Podcast.get(show_id)
        if not show or not show.is_active:
            raise HTTPException(status_code=404, detail="Podcast not found")

        # Get localized category name
        category_field = lang_field_map.get(preferred_lang, "category")
        localized_category = getattr(show, category_field, None) or show.category

        # Get latest episodes
        episodes = (
            await PodcastEpisode.find(PodcastEpisode.podcast_id == show_id)
            .sort("-published_at")
            .limit(50)
            .to_list()
        )

        return {
            "id": str(show.id),
            "title": show.title,
            "description": show.description,
            "author": show.author,
            "cover": show.cover,
            "category": localized_category,
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
            "latestEpisode": (
                {
                    "audioUrl": episodes[0].audio_url if episodes else None,
                }
                if episodes
                else None
            ),
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

        episodes = (
            await PodcastEpisode.find(PodcastEpisode.podcast_id == show_id)
            .sort("-published_at")
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        total = await PodcastEpisode.find(PodcastEpisode.podcast_id == show_id).count()

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
        logger.error(
            f"Error fetching episodes for podcast {show_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to fetch episodes")


@router.get("/{show_id}/episodes/{episode_id}")
async def get_episode(show_id: str, episode_id: str, request: Request):
    """Get single episode details with translation data."""
    try:
        episode = await PodcastEpisode.get(episode_id)
        if not episode or episode.podcast_id != show_id:
            raise HTTPException(status_code=404, detail="Episode not found")

        # Get user's preferred language from Accept-Language header
        accept_language = request.headers.get("Accept-Language", "he")
        preferred_lang = accept_language.split(",")[0].split("-")[0]

        # Determine which audio URL to use
        audio_url = episode.audio_url  # Default to original
        if (
            preferred_lang in episode.available_languages
            and preferred_lang != episode.original_language
        ):
            translation = episode.translations.get(preferred_lang)
            if translation:
                audio_url = translation.audio_url

        return {
            "id": str(episode.id),
            "title": episode.title,
            "description": episode.description,
            "audioUrl": audio_url,
            "originalAudioUrl": episode.audio_url,
            "duration": episode.duration,
            "episodeNumber": episode.episode_number,
            "seasonNumber": episode.season_number,
            "publishedAt": episode.published_at.isoformat(),
            "thumbnail": episode.thumbnail,
            "availableLanguages": episode.available_languages,
            "originalLanguage": episode.original_language,
            "translations": {
                lang: {
                    "audioUrl": trans.audio_url,
                    "transcript": trans.transcript,
                    "translatedText": trans.translated_text,
                    "duration": trans.duration,
                }
                for lang, trans in episode.translations.items()
            },
            "translationStatus": episode.translation_status,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episode {episode_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch episode")

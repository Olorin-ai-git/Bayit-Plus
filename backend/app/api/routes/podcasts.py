import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.api.routes.content.beta_filter import (build_beta_content_filter,
                                                 check_beta_access)
from app.core.security import get_current_user, get_optional_user
from app.models.content import Podcast, PodcastEpisode
from app.models.user import User
from app.models.user_podcast_subscription import UserPodcastSubscription
from app.services.apple_podcasts_converter import convert_apple_podcasts_to_rss
from app.services.podcast_scraper import fetch_rss_feed
from app.core.config import settings
from app.services.podcast_sync import (
    cleanup_old_episodes,
    fetch_rss_episodes,
    sync_all_podcasts,
    sync_podcast_episodes,
)
from app.services.spotify_podcast_converter import resolve_spotify_to_rss

router = APIRouter()
logger = logging.getLogger(__name__)


class ResolveUrlRequest(BaseModel):
    url: str
    provider: Optional[str] = Field(
        None, description="Provider: rss, apple_podcasts, spotify. Auto-detected if omitted."
    )


class AddFromUrlRequest(BaseModel):
    rss_url: str
    title: Optional[str] = None
    category: Optional[str] = None


def _detect_provider(url: str) -> str:
    """Auto-detect podcast provider from URL pattern."""
    if "podcasts.apple.com" in url or "itunes.apple.com" in url:
        return "apple_podcasts"
    if "open.spotify.com" in url:
        return "spotify"
    return "rss"


@router.post("/resolve-url")
async def resolve_podcast_url(
    body: ResolveUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """Resolve a podcast URL to RSS feed and return a preview. No DB writes."""
    url = body.url.strip()
    provider = body.provider or _detect_provider(url)

    # Step 1: Resolve to RSS URL
    rss_url: Optional[str] = None

    if provider == "apple_podcasts":
        result = await convert_apple_podcasts_to_rss(url)
        if not result:
            raise HTTPException(
                status_code=400,
                detail="Could not resolve Apple Podcasts URL to an RSS feed",
            )
        rss_url = result["rss_url"]

    elif provider == "spotify":
        result = await resolve_spotify_to_rss(url)
        if not result:
            raise HTTPException(
                status_code=400,
                detail="Could not resolve Spotify URL to an RSS feed",
            )
        rss_url = result["rss_url"]

    else:
        rss_url = url

    # Step 2: Fetch and parse the RSS feed
    podcast_data = await fetch_rss_feed(rss_url)
    if not podcast_data:
        raise HTTPException(
            status_code=400,
            detail="Could not parse RSS feed from the resolved URL",
        )

    episodes_preview = [
        {
            "title": ep.title,
            "description": ep.description,
            "duration": ep.duration,
            "published_date": ep.published_date.isoformat() if ep.published_date else None,
        }
        for ep in podcast_data.episodes[:3]
    ]

    return {
        "title": podcast_data.title,
        "author": podcast_data.author,
        "description": podcast_data.description,
        "cover": podcast_data.cover,
        "category": podcast_data.category,
        "rss_url": rss_url,
        "episode_count": len(podcast_data.episodes),
        "episodes_preview": episodes_preview,
    }


@router.post("/add-from-url")
async def add_podcast_from_url(
    body: AddFromUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a Podcast document + episodes from a resolved RSS URL."""
    rss_url = body.rss_url.strip()

    # Check if podcast already exists
    existing = await Podcast.find_one(Podcast.rss_feed == rss_url)
    if existing:
        # Check if user already subscribed
        existing_sub = await UserPodcastSubscription.find_one(
            UserPodcastSubscription.user_id == str(current_user.id),
            UserPodcastSubscription.podcast_id == str(existing.id),
            UserPodcastSubscription.is_deleted == False,
        )

        if existing_sub:
            raise HTTPException(
                status_code=409,
                detail="Already subscribed to this podcast",
            )

        # Create subscription to existing podcast
        subscription = UserPodcastSubscription(
            user_id=str(current_user.id),
            podcast_id=str(existing.id),
            is_user_added=True,
            subscribed_at=datetime.utcnow(),
        )
        await subscription.insert()

        logger.info(
            "User subscribed to existing podcast",
            extra={
                "podcast_id": str(existing.id),
                "title": existing.title,
                "user_id": str(current_user.id),
            },
        )

        return {
            "id": str(existing.id),
            "title": existing.title,
            "episode_count": existing.episode_count,
            "message": "Subscribed to existing podcast",
        }

    # Parse RSS feed for episodes
    episodes_data = await fetch_rss_episodes(rss_url, max_episodes=15)

    # Also get feed-level metadata via podcast_scraper
    podcast_data = await fetch_rss_feed(rss_url)
    if not podcast_data:
        raise HTTPException(
            status_code=400,
            detail="Could not parse RSS feed",
        )

    title = body.title or podcast_data.title
    category = body.category or podcast_data.category or "general"

    # Create Podcast document
    podcast = Podcast(
        title=title,
        author=podcast_data.author,
        description=podcast_data.description,
        cover=podcast_data.cover,
        category=category,
        rss_feed=rss_url,
        episode_count=0,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    await podcast.insert()

    # Create user subscription
    subscription = UserPodcastSubscription(
        user_id=str(current_user.id),
        podcast_id=str(podcast.id),
        is_user_added=True,
        subscribed_at=datetime.utcnow(),
    )
    await subscription.insert()

    # Create PodcastEpisode documents
    episodes_added = 0
    if episodes_data:
        for i, ep_data in enumerate(episodes_data):
            episode = PodcastEpisode(
                podcast_id=str(podcast.id),
                title=ep_data["title"],
                description=ep_data.get("description"),
                audio_url=ep_data.get("audio_url"),
                duration=ep_data.get("duration"),
                episode_number=i + 1,
                season_number=1,
                published_at=ep_data.get("published_at", datetime.utcnow()),
                thumbnail=podcast_data.cover,
                guid=ep_data.get("guid"),
            )
            await episode.insert()
            episodes_added += 1

    # Update podcast metadata
    podcast.episode_count = episodes_added
    if episodes_data:
        dates = [ep.get("published_at") for ep in episodes_data if ep.get("published_at")]
        if dates:
            podcast.latest_episode_date = max(dates)
    podcast.updated_at = datetime.utcnow()
    await podcast.save()

    logger.info(
        "Podcast added from URL",
        extra={
            "podcast_id": str(podcast.id),
            "title": title,
            "episodes": episodes_added,
            "user_id": str(current_user.id),
        },
    )

    return {
        "id": str(podcast.id),
        "title": title,
        "episode_count": episodes_added,
    }


@router.post("/custom")
async def add_podcast_from_url_alias(
    body: AddFromUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Alias for /add-from-url endpoint.
    Create a Podcast document + episodes from a resolved RSS URL.
    """
    return await add_podcast_from_url(body, current_user)


@router.delete("/subscriptions/{podcast_id}")
async def unsubscribe_from_podcast(
    podcast_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Unsubscribe from a podcast (soft delete).
    Only the subscription owner can unsubscribe.
    """
    subscription = await UserPodcastSubscription.find_one(
        UserPodcastSubscription.user_id == str(current_user.id),
        UserPodcastSubscription.podcast_id == podcast_id,
        UserPodcastSubscription.is_deleted == False,
    )

    if not subscription:
        raise HTTPException(
            status_code=404,
            detail="Subscription not found",
        )

    # Soft delete
    subscription.is_deleted = True
    subscription.deleted_at = datetime.utcnow()
    await subscription.save()

    logger.info(
        "User unsubscribed from podcast",
        extra={
            "user_id": str(current_user.id),
            "podcast_id": podcast_id,
            "was_user_added": subscription.is_user_added,
        },
    )

    return {"message": "Unsubscribed from podcast"}


@router.get("/categories")
async def get_podcast_categories(
    request: Request,
    culture_id: Optional[str] = Query(None, description="Filter by culture ID"),
    current_user: Optional[User] = Depends(get_optional_user),
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
        beta_filter = build_beta_content_filter(current_user)
        if beta_filter:
            query_conditions.append(beta_filter)
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
            for cat_id, name in sorted(categories_map.items(), key=lambda x: x[1])
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


@router.post("/{podcast_id}/sync")
async def sync_single_podcast(podcast_id: str):
    """
    Sync latest 3 episodes for a specific podcast.
    This endpoint fetches the latest 3 episodes from the podcast's RSS feed.
    """
    logger.info(f"📻 Manual sync triggered for podcast: {podcast_id}")

    try:
        # Find the podcast
        podcast = await Podcast.get(podcast_id)
        if not podcast:
            raise HTTPException(status_code=404, detail=f"Podcast not found: {podcast_id}")

        if not podcast.rss_feed:
            raise HTTPException(status_code=400, detail="Podcast does not have an RSS feed")

        # Sync with max 3 episodes
        episodes_added = await sync_podcast_episodes(podcast, max_episodes=3)

        logger.info(f"✅ Podcast sync completed: {podcast.title} - {episodes_added} episodes added")

        return {
            "status": "success",
            "message": f"Synced {episodes_added} new episode(s)",
            "podcast_id": podcast_id,
            "podcast_title": podcast.title,
            "episodes_added": episodes_added,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Podcast sync failed for {podcast_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Podcast sync failed: {str(e)}")


@router.post("/refresh")
async def refresh_all_content():
    """
    Refresh all content: sync latest podcast episodes from RSS feeds
    and remove oldest episodes beyond the configured retention limit.
    """
    logger.info("Full content refresh requested - syncing podcasts and cleaning up")

    try:
        sync_result = await sync_all_podcasts(max_episodes=20)

        max_to_keep = settings.PODCAST_MAX_EPISODES_TO_KEEP
        podcasts = await Podcast.find(
            {"is_active": True, "rss_feed": {"$exists": True, "$ne": None}}
        ).to_list(length=None)

        total_deleted = 0
        for podcast in podcasts:
            deleted = await cleanup_old_episodes(podcast, max_to_keep=max_to_keep)
            total_deleted += deleted

        logger.info(
            "Podcast refresh complete: synced=%d, deleted=%d",
            sync_result.get("total_episodes_added", 0),
            total_deleted,
        )

        return {
            "status": "success",
            "message": "Content refresh completed successfully",
            "podcasts": {
                "total": sync_result.get("total_podcasts", 0),
                "synced": sync_result.get("synced_count", 0),
                "episodes_added": sync_result.get("total_episodes_added", 0),
                "episodes_deleted": total_deleted,
            },
        }
    except Exception as e:
        logger.error(f"Content refresh failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Content refresh failed: {str(e)}")


@router.get("")
async def get_podcasts(
    request: Request,
    culture_id: Optional[str] = Query(None, description="Filter by culture ID"),
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
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
        beta_filter = build_beta_content_filter(current_user)
        if beta_filter:
            query.update(beta_filter)
        if culture_id:
            query["culture_id"] = culture_id
        if category:
            query["category"] = category

        # Fetch all matching podcasts first to deduplicate
        all_shows = await Podcast.find(query).sort("-latest_episode_date").to_list()

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
            key=lambda x: x.latest_episode_date or x.created_at, reverse=True
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

        # Get user subscriptions if authenticated
        user_subscriptions = {}
        if current_user:
            subscriptions = await UserPodcastSubscription.find(
                {
                    "user_id": str(current_user.id),
                    "is_deleted": False,
                }
            ).to_list()
            for sub in subscriptions:
                user_subscriptions[sub.podcast_id] = sub.is_user_added

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
                    "isSubscribed": str(show.id) in user_subscriptions,
                    "isUserAdded": user_subscriptions.get(str(show.id), False),
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
async def get_podcast(
    show_id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
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
            # Playlist items store episode IDs - try as episode
            episode = await PodcastEpisode.get(show_id)
            if episode:
                parent = await Podcast.get(episode.podcast_id)
                return {
                    "id": str(episode.id),
                    "title": episode.title,
                    "description": episode.description,
                    "author": parent.author if parent else None,
                    "cover": episode.thumbnail or (parent.cover if parent else None),
                    "category": None,
                    "website": parent.website if parent else None,
                    "episodeCount": 1,
                    "episodes": [
                        {
                            "id": str(episode.id),
                            "title": episode.title,
                            "description": episode.description,
                            "audioUrl": episode.audio_url,
                            "duration": episode.duration,
                            "episodeNumber": episode.episode_number,
                            "seasonNumber": episode.season_number,
                            "publishedAt": episode.published_at.strftime("%d/%m/%Y"),
                            "thumbnail": episode.thumbnail or (parent.cover if parent else None),
                        }
                    ],
                    "latestEpisode": {"audioUrl": episode.audio_url},
                }
            raise HTTPException(status_code=404, detail="Podcast not found")

        # Beta access check
        if not check_beta_access(current_user, getattr(show, "is_beta_content", False)):
            raise HTTPException(status_code=404, detail="Podcast not found")

        # Get localized category name
        category_field = lang_field_map.get(preferred_lang, "category")
        localized_category = getattr(show, category_field, None) or show.category

        # Get latest episodes
        episodes = (
            await PodcastEpisode.find({"podcast_id": show_id})
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
            await PodcastEpisode.find({"podcast_id": show_id})
            .sort("-published_at")
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        total = await PodcastEpisode.find({"podcast_id": show_id}).count()

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
async def get_episode(
    show_id: str,
    episode_id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get single episode details with translation data (translations require premium)."""
    try:
        episode = await PodcastEpisode.get(episode_id)
        if not episode or episode.podcast_id != show_id:
            raise HTTPException(status_code=404, detail="Episode not found")

        # Get user's preferred language from Accept-Language header
        accept_language = request.headers.get("Accept-Language", "he")
        preferred_lang = accept_language.split(",")[0].split("-")[0]

        # Check premium status for translation access
        is_premium = current_user and current_user.can_access_premium_features()

        # Determine which audio URL to use
        audio_url = episode.audio_url  # Default to original

        # Only provide translated audio if user has premium
        if (
            is_premium
            and preferred_lang in episode.available_languages
            and preferred_lang != episode.original_language
        ):
            translation = episode.translations.get(preferred_lang)
            if translation:
                audio_url = translation.audio_url

        # Filter translation data based on premium status
        exposed_translations = {}
        if is_premium:
            exposed_translations = {
                lang: {
                    "audioUrl": trans.audio_url,
                    "transcript": trans.transcript,
                    "translatedText": trans.translated_text,
                    "duration": trans.duration,
                }
                for lang, trans in episode.translations.items()
            }

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
            "availableLanguages": (
                episode.available_languages
                if is_premium
                else [episode.original_language or "he"]
            ),
            "originalLanguage": episode.original_language,
            "translations": exposed_translations,
            "translationStatus": episode.translation_status,
            "requiresPremium": (
                not is_premium and len(episode.available_languages or []) > 1
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episode {episode_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch episode")

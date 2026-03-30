"""
Podcast Sync Service
Automatically fetches and updates podcast episodes from RSS feeds on server startup.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup

from app.models.content import Podcast, PodcastEpisode

logger = logging.getLogger(__name__)

# Suppress XML parsing warnings
import warnings

from bs4 import XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/rss+xml, application/atom+xml, */*",
}


async def parse_feed(rss_url: str) -> Optional[dict]:
    """
    Parse RSS feed and extract feed-level metadata including artwork.

    Args:
        rss_url: The RSS feed URL

    Returns:
        Dictionary with feed metadata or None if fetch failed
    """
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(rss_url, headers=HEADERS)
            response.raise_for_status()

            # Parse RSS feed
            try:
                soup = BeautifulSoup(response.text, "xml")
            except Exception:
                soup = BeautifulSoup(response.text, "html.parser")

            channel = soup.find("channel")
            if not channel:
                return None

            # Extract feed-level metadata
            feed_data = {"feed": {}}

            # Try to find artwork - check multiple locations
            # 1. iTunes image
            itunes_image = channel.find("itunes:image")
            if itunes_image and itunes_image.get("href"):
                feed_data["feed"]["itunes_image"] = itunes_image.get("href")

            # 2. Channel image
            image_elem = channel.find("image")
            if image_elem:
                url_elem = image_elem.find("url")
                if url_elem:
                    feed_data["feed"]["image"] = {"href": url_elem.get_text(strip=True)}

            # 3. Media thumbnail
            if not feed_data["feed"].get("itunes_image") and not feed_data["feed"].get(
                "image"
            ):
                media_thumbnail = channel.find("media:thumbnail")
                if media_thumbnail and media_thumbnail.get("url"):
                    feed_data["feed"]["itunes_image"] = media_thumbnail.get("url")

            return feed_data

    except Exception as e:
        logger.warning(f"Failed to parse RSS feed {rss_url}: {str(e)}")
        return None


async def fetch_rss_episodes(
    rss_url: str, max_episodes: int = 3
) -> Optional[List[dict]]:
    """
    Fetch the latest episodes from an RSS feed.

    Args:
        rss_url: The RSS feed URL
        max_episodes: Maximum number of episodes to fetch (default 3)

    Returns:
        List of episode dictionaries with title, description, audio_url, duration, published_date
        or None if fetch failed
    """
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(rss_url, headers=HEADERS)
            response.raise_for_status()

            # Try to use lxml for XML parsing if available, otherwise fallback to html.parser
            try:
                soup = BeautifulSoup(response.text, "xml")
            except Exception:
                soup = BeautifulSoup(response.text, "html.parser")
            items = soup.find_all("item")[:max_episodes]

            if not items:
                logger.warning(f"No episodes found in RSS feed: {rss_url}")
                return None

            episodes = []
            base_date = datetime.utcnow()

            for i, item in enumerate(items):
                title_elem = item.find("title")
                desc_elem = item.find("description") or item.find("summary")
                audio_elem = item.find("enclosure")
                pubdate_elem = item.find("pubDate")
                duration_elem = item.find("duration")
                guid_elem = item.find("guid")

                if not title_elem:
                    continue

                # Extract audio URL
                audio_url = None
                if audio_elem and audio_elem.get("url"):
                    audio_url = audio_elem.get("url")

                # Parse publication date
                pub_date = None
                if pubdate_elem:
                    try:
                        from email.utils import parsedate_to_datetime

                        pub_date = parsedate_to_datetime(
                            pubdate_elem.get_text(strip=True)
                        )
                    except (ValueError, TypeError):
                        pass

                # If no pubDate found, calculate based on position
                # Episodes from RSS typically come in newest-first order
                # So subtract days to maintain proper ordering
                if not pub_date:
                    pub_date = base_date - timedelta(days=i)

                # Extract duration
                duration = None
                if duration_elem:
                    duration = duration_elem.get_text(strip=True)

                episodes.append(
                    {
                        "title": title_elem.get_text(strip=True),
                        "description": (
                            desc_elem.get_text(strip=True)[:500] if desc_elem else None
                        ),
                        "audio_url": audio_url,
                        "duration": duration,
                        "published_at": pub_date,
                        "guid": (
                            guid_elem.get_text(strip=True)[:50] if guid_elem else None
                        ),
                    }
                )

            logger.info(f"✅ Fetched {len(episodes)} episodes from RSS: {rss_url}")
            return episodes

    except asyncio.TimeoutError:
        logger.warning(f"⏱️ Timeout fetching RSS feed: {rss_url}")
        return None
    except Exception as e:
        logger.warning(f"❌ Failed to fetch RSS feed {rss_url}: {str(e)}")
        return None


async def sync_podcast_episodes(podcast: Podcast, max_episodes: int = 20) -> int:
    """
    Sync latest episodes for a single podcast from its RSS feed.

    Args:
        podcast: The podcast document
        max_episodes: Maximum number of episodes to fetch (default 20)

    Returns:
        Number of new episodes added
    """
    if not podcast.rss_feed:
        return 0

    logger.info(f"📻 Syncing podcast: {podcast.title}")

    # Fetch episodes from RSS
    episodes_data = await fetch_rss_episodes(podcast.rss_feed, max_episodes)
    if not episodes_data:
        logger.warning(f"⚠️ Could not fetch episodes for: {podcast.title}")
        return 0

    # Get existing episode GUIDs to avoid duplicates
    existing_episodes = await PodcastEpisode.find(
        {"podcast_id": str(podcast.id)}
    ).to_list(length=None)
    existing_guids = {ep.guid for ep in existing_episodes if ep.guid}

    # Add new episodes
    new_episodes_added = 0
    for ep_data in episodes_data:
        # Skip if episode already exists (by GUID)
        if ep_data.get("guid") and ep_data["guid"] in existing_guids:
            logger.debug(f"   Skipping duplicate episode: {ep_data['title']}")
            continue

        new_episodes_added += 1

        # Create new episode
        new_episode = PodcastEpisode(
            podcast_id=str(podcast.id),
            title=ep_data["title"],
            description=ep_data["description"],
            audio_url=ep_data["audio_url"],
            duration=ep_data["duration"],
            episode_number=new_episodes_added,
            season_number=1,
            published_at=ep_data["published_at"],
            thumbnail=podcast.cover,  # Use podcast cover as episode thumbnail
            guid=ep_data.get("guid"),  # Store GUID for duplicate detection
        )

        try:
            await new_episode.insert()
            logger.info(f"   ✓ Added: {ep_data['title']}")
        except Exception as e:
            logger.warning(f"   ⚠️ Failed to add episode {ep_data['title']}: {str(e)}")

    # Update podcast metadata
    if new_episodes_added > 0:
        total_episodes = await PodcastEpisode.find(
            {"podcast_id": str(podcast.id)}
        ).count()
        latest_episodes = (
            await PodcastEpisode.find({"podcast_id": str(podcast.id)})
            .sort([("published_at", -1)])
            .to_list(length=1)
        )

        podcast.episode_count = total_episodes
        if latest_episodes:
            podcast.latest_episode_date = latest_episodes[0].published_at
        podcast.updated_at = datetime.utcnow()

        try:
            await podcast.save()
            logger.info(f"✅ Updated podcast metadata: {podcast.title}")
        except Exception as e:
            logger.warning(f"Failed to update podcast metadata: {str(e)}")

    return new_episodes_added


async def cleanup_old_episodes(podcast: Podcast, max_to_keep: int = 20) -> int:
    """
    Remove oldest episodes from a podcast, keeping only the N most recent.

    Args:
        podcast: The podcast document
        max_to_keep: Maximum episodes to retain per podcast

    Returns:
        Number of episodes deleted
    """
    all_episodes = (
        await PodcastEpisode.find({"podcast_id": str(podcast.id)})
        .sort([("published_at", -1)])
        .to_list(length=None)
    )

    total = len(all_episodes)
    if total <= max_to_keep:
        return 0

    episodes_to_delete = all_episodes[max_to_keep:]
    deleted = 0

    for episode in episodes_to_delete:
        try:
            await episode.delete()
            deleted += 1
        except Exception as e:
            logger.warning(f"Failed to delete episode {episode.title}: {str(e)}")

    if deleted > 0:
        podcast.episode_count = min(total, max_to_keep)
        if all_episodes:
            podcast.latest_episode_date = all_episodes[0].published_at
        podcast.updated_at = datetime.utcnow()
        try:
            await podcast.save()
        except Exception as e:
            logger.warning(f"Failed to update podcast metadata: {str(e)}")

    logger.info(
        f"Cleanup {podcast.title}: deleted {deleted} old episodes, "
        f"keeping {max_to_keep} most recent"
    )

    return deleted


async def sync_all_podcasts(max_episodes: int = 20, max_concurrent: int = 10) -> dict:
    """
    Sync episodes for all active podcasts with RSS feeds using parallel processing.

    Args:
        max_episodes: Maximum number of episodes to fetch per podcast (default 20)
        max_concurrent: Maximum number of podcasts to sync concurrently (default 10)

    Returns:
        Dictionary with sync results
    """
    logger.info("\n" + "=" * 80)
    logger.info("🎙️ Starting Podcast RSS Sync (Parallel Mode)")
    logger.info("=" * 80 + "\n")

    # Find all active podcasts with RSS feeds
    podcasts = await Podcast.find(
        {"is_active": True, "rss_feed": {"$exists": True, "$ne": None}}
    ).to_list(length=None)

    logger.info(f"📚 Found {len(podcasts)} podcasts with RSS feeds")
    logger.info(f"⚡ Processing {max_concurrent} podcasts concurrently\n")

    if not podcasts:
        logger.info("No active podcasts with RSS feeds found")
        return {
            "total_podcasts": 0,
            "synced_count": 0,
            "total_episodes_added": 0,
        }

    # Create semaphore for concurrency limiting
    semaphore = asyncio.Semaphore(max_concurrent)

    async def sync_with_semaphore(podcast: Podcast) -> tuple[str, int]:
        """Sync a podcast with semaphore-based concurrency control."""
        async with semaphore:
            try:
                episodes_added = await sync_podcast_episodes(podcast, max_episodes)
                return (podcast.title, episodes_added)
            except Exception as e:
                logger.error(f"❌ Error syncing {podcast.title}: {str(e)}")
                return (podcast.title, 0)

    # Sync all podcasts in parallel with concurrency limit
    results = await asyncio.gather(
        *[sync_with_semaphore(podcast) for podcast in podcasts],
        return_exceptions=True
    )

    # Calculate stats
    podcasts_synced = 0
    total_episodes_added = 0

    for result in results:
        if isinstance(result, tuple):
            _, episodes_added = result
            if episodes_added > 0:
                podcasts_synced += 1
                total_episodes_added += episodes_added

    logger.info("\n" + "=" * 80)
    logger.info(f"✅ Podcast Sync Complete")
    logger.info(f"   📚 Total podcasts: {len(podcasts)}")
    logger.info(f"   ✔️ Podcasts with new episodes: {podcasts_synced}")
    logger.info(f"   📝 Total episodes added: {total_episodes_added}")
    logger.info("=" * 80 + "\n")

    return {
        "total_podcasts": len(podcasts),
        "synced_count": podcasts_synced,
        "total_episodes_added": total_episodes_added,
    }

"""
Kids Podcast Service

Imports and manages kids-appropriate podcast content from RSS feeds.
Supports English, Hebrew, and Spanish kids podcasts.

Sources include:
- Story Pirates (English storytelling)
- Brains On! (Science for kids)
- Hebrew story podcasts
- Jewish educational podcasts
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional

import httpx
from app.core.config import settings
from app.models.content import Podcast, PodcastEpisode
from app.models.content_taxonomy import ContentSection
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


@dataclass
class KidsPodcastEpisode:
    """A single kids podcast episode from RSS feed."""

    title: str
    title_en: Optional[str] = None
    description: Optional[str] = None
    audio_url: Optional[str] = None
    duration: Optional[str] = None
    published_date: Optional[datetime] = None
    guid: str = ""
    age_rating: int = 5
    educational_tags: List[str] = field(default_factory=list)


@dataclass
class KidsPodcast:
    """Kids podcast feed data with episodes."""

    title: str
    title_en: Optional[str] = None
    title_es: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    cover: Optional[str] = None
    rss_url: str = ""
    language: str = "en"
    age_rating: int = 5
    category_key: str = "stories"
    educational_tags: List[str] = field(default_factory=list)
    episodes: List[KidsPodcastEpisode] = field(default_factory=list)


HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Bayit+/1.0; +https://bayit.tv)",
    "Accept": "application/rss+xml, application/atom+xml, */*",
}


# Curated list of kids podcasts with real RSS feeds
KIDS_PODCASTS_REGISTRY: List[Dict[str, Any]] = [
    # English Kids Podcasts
    {
        "title": "Story Pirates",
        "title_he": "שודדי הסיפורים",
        "title_es": "Piratas de Historias",
        "rss_url": "https://feeds.simplecast.com/xQw_MZQ6",
        "author": "Story Pirates",
        "description": "Kids write stories, and world-class performers bring them to life",
        "language": "en",
        "age_rating": 5,
        "category_key": "stories",
        "educational_tags": ["stories", "creativity", "imagination"],
    },
    {
        "title": "Brains On!",
        "title_he": "מוחות דלוקים",
        "title_es": "Cerebros Encendidos",
        "rss_url": "https://feeds.simplecast.com/GIXrJzjQ",
        "author": "American Public Media",
        "description": "Science podcast for curious kids and families",
        "language": "en",
        "age_rating": 7,
        "category_key": "educational",
        "educational_tags": ["science", "curiosity", "learning"],
    },
    {
        "title": "Wow in the World",
        "title_he": "וואו בעולם",
        "title_es": "Guau en el Mundo",
        "rss_url": "https://feeds.simplecast.com/wbqXOswg",
        "author": "Tinkercast",
        "description": "Exploring science and technology for curious kids",
        "language": "en",
        "age_rating": 5,
        "category_key": "educational",
        "educational_tags": ["science", "technology", "wonder"],
    },
    {
        "title": "Circle Round",
        "title_he": "סביב לעיגול",
        "title_es": "Circulo Redondo",
        "rss_url": "https://feeds.simplecast.com/w88c9F1_",
        "author": "WBUR",
        "description": "World folktales adapted for kids",
        "language": "en",
        "age_rating": 5,
        "category_key": "stories",
        "educational_tags": ["stories", "culture", "folktales"],
    },
    {
        "title": "But Why: A Podcast for Curious Kids",
        "title_he": "אבל למה",
        "title_es": "Pero Por Que",
        "rss_url": "https://feeds.simplecast.com/rDcRnmhP",
        "author": "Vermont Public",
        "description": "Answers questions from curious kids",
        "language": "en",
        "age_rating": 5,
        "category_key": "educational",
        "educational_tags": ["questions", "learning", "curiosity"],
    },
    # Jewish Kids Podcasts
    {
        "title": "Torah Reading for Kids",
        "title_he": "פרשת השבוע לילדים",
        "title_es": "Lectura de la Tora para Ninos",
        "rss_url": "https://feed.pod.co/parsha-for-kids",
        "author": "Chabad",
        "description": "Weekly Torah portion stories for children",
        "language": "en",
        "age_rating": 5,
        "category_key": "jewish",
        "educational_tags": ["jewish", "torah", "parsha"],
    },
]


class KidsPodcastService:
    """
    Service for managing kids podcast content.
    Fetches, parses, and stores kids-appropriate podcast episodes.
    """

    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
            )
        return self.http_client

    async def close(self):
        """Close HTTP client."""
        if self.http_client:
            await self.http_client.aclose()

    async def fetch_podcast_feed(
        self, rss_url: str, podcast_info: Dict[str, Any]
    ) -> Optional[KidsPodcast]:
        """
        Fetch a kids podcast from its RSS feed.

        Args:
            rss_url: RSS feed URL,
            podcast_info: Additional podcast metadata

        Returns:
            KidsPodcast object or None if fetch failed.
        """
        try:
            client = await self._get_client()
            response = await client.get(rss_url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Parse channel info
            channel = soup.find("channel")
            if not channel:
                logger.error(f"No channel found in RSS feed: {rss_url}")
                return None

            title_elem = channel.find("title")
            author_elem = channel.find("author") or channel.find("managingEditor")
            description_elem = channel.find("description")
            image_elem = channel.find("image")

            cover = None
            if image_elem:
                url_elem = image_elem.find("url")
                if url_elem:
                    cover = url_elem.get_text(strip=True)

            # Parse episodes (get latest 20)
            items = channel.find_all("item")[:20]
            episodes = []

            for item in items:
                ep_title = item.find("title")
                if not ep_title:
                    continue

                ep_desc = item.find("description") or item.find("summary")
                ep_audio = item.find("enclosure")
                ep_pubdate = item.find("pubDate")
                ep_duration = item.find("duration")
                ep_guid = item.find("guid")

                audio_url = None
                if ep_audio and ep_audio.get("url"):
                    audio_url = ep_audio.get("url")

                pub_date = None
                if ep_pubdate:
                    try:
                        pub_date = parsedate_to_datetime(
                            ep_pubdate.get_text(strip=True)
                        )
                    except Exception:
                        pass

                duration_str = None
                if ep_duration:
                    duration_str = ep_duration.get_text(strip=True)

                guid_str = ""
                if ep_guid:
                    guid_str = ep_guid.get_text(strip=True)

                episodes.append(
                    KidsPodcastEpisode(
                        title=ep_title.get_text(strip=True),
                        description=ep_desc.get_text(strip=True)[:300]
                        if ep_desc
                        else None,
                        audio_url=audio_url,
                        duration=duration_str,
                        published_date=pub_date,
                        guid=guid_str,
                        age_rating=podcast_info.get("age_rating", 5),
                        educational_tags=podcast_info.get("educational_tags", []),
                    )
                )

            return KidsPodcast(
                title=podcast_info.get(
                    "title",
                    title_elem.get_text(strip=True) if title_elem else "Unknown",
                ),
                title_en=podcast_info.get("title"),
                title_es=podcast_info.get("title_es"),
                author=podcast_info.get("author")
                or (author_elem.get_text(strip=True) if author_elem else None),
                description=podcast_info.get("description")
                or (
                    description_elem.get_text(strip=True)[:500]
                    if description_elem
                    else None
                ),
                cover=cover,
                rss_url=rss_url,
                language=podcast_info.get("language", "en"),
                age_rating=podcast_info.get("age_rating", 5),
                category_key=podcast_info.get("category_key", "stories"),
                educational_tags=podcast_info.get("educational_tags", []),
                episodes=episodes,
            )

        except Exception as e:
            logger.error(f"Error fetching podcast from {rss_url}: {e}")
            return None

    async def sync_all_kids_podcasts(self) -> Dict[str, Any]:
        """
        Sync all configured kids podcasts from RSS feeds.

        Returns:
            Summary of sync operation.
        """
        podcasts_created = 0
        episodes_created = 0
        errors = []

        # Combine registry with any configured feeds from settings
        all_podcasts = list(KIDS_PODCASTS_REGISTRY)

        # Add user-configured podcast feeds
        if settings.KIDS_PODCAST_RSS_FEEDS:
            try:
                custom_feeds = json.loads(settings.KIDS_PODCAST_RSS_FEEDS)
                for feed_url in custom_feeds:
                    all_podcasts.append(
                        {
                            "title": "Custom Kids Podcast",
                            "rss_url": feed_url,
                            "language": "en",
                            "age_rating": 5,
                            "category_key": "stories",
                            "educational_tags": [],
                        }
                    )
            except json.JSONDecodeError:
                logger.warning("Invalid KIDS_PODCAST_RSS_FEEDS JSON format")

        for podcast_info in all_podcasts:
            try:
                rss_url = podcast_info.get("rss_url")
                if not rss_url:
                    continue

                # Fetch podcast data
                podcast_data = await self.fetch_podcast_feed(rss_url, podcast_info)
                if not podcast_data:
                    errors.append(
                        f"Failed to fetch: {podcast_info.get('title', rss_url)}"
                    )
                    continue

                # Check if podcast exists
                existing_podcast = await Podcast.find_one({"rss_feed": rss_url})

                if existing_podcast:
                    # Update existing podcast
                    existing_podcast.episode_count = len(podcast_data.episodes)
                    if podcast_data.episodes:
                        existing_podcast.latest_episode_date = podcast_data.episodes[
                            0
                        ].published_date
                    existing_podcast.updated_at = datetime.utcnow()
                    await existing_podcast.save()
                    podcast_id = str(existing_podcast.id)
                else:
                    # Create new podcast
                    podcast = Podcast(
                        title=podcast_data.title,
                        title_en=podcast_data.title_en,
                        title_es=podcast_data.title_es,
                        description=podcast_data.description,
                        author=podcast_data.author,
                        cover=podcast_data.cover,
                        category=f"kids-{podcast_data.category_key}",
                        rss_feed=rss_url,
                        episode_count=len(podcast_data.episodes),
                        latest_episode_date=podcast_data.episodes[0].published_date
                        if podcast_data.episodes
                        else None,
                        is_active=True,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    await podcast.insert()
                    podcast_id = str(podcast.id)
                    podcasts_created += 1
                    logger.info(f"Created kids podcast: {podcast_data.title}")

                # Sync episodes
                for ep_data in podcast_data.episodes:
                    # Check if episode exists (by guid)
                    existing_ep = await PodcastEpisode.find_one(
                        {
                            "podcast_id": podcast_id,
                            "guid": ep_data.guid,
                        }
                    )

                    if existing_ep:
                        continue  # Skip existing episodes

                    episode = PodcastEpisode(
                        podcast_id=podcast_id,
                        title=ep_data.title,
                        title_en=ep_data.title_en,
                        description=ep_data.description,
                        audio_url=ep_data.audio_url,
                        duration=ep_data.duration,
                        published_at=ep_data.published_date or datetime.utcnow(),
                        guid=ep_data.guid,
                    )
                    await episode.insert()
                    episodes_created += 1

            except Exception as e:
                errors.append(
                    f"Error processing {podcast_info.get('title', 'unknown')}: {str(e)}"
                ),
                logger.error(f"Error syncing podcast: {e}")

        return {
            "message": "Kids podcast sync completed",
            "podcasts_created": podcasts_created,
            "episodes_created": episodes_created,
            "total_podcasts": len(all_podcasts),
            "errors": errors,
        }

    async def get_kids_podcast_stats(self) -> Dict[str, Any]:
        """Get statistics about kids podcasts."""
        # Count podcasts with kids categories
        total_podcasts = await Podcast.find(
            {
                "category": {"$regex": "^kids-", "$options": "i"},
            }
        ).count()

        # Count episodes from kids podcasts
        kids_podcasts = await Podcast.find(
            {
                "category": {"$regex": "^kids-", "$options": "i"},
            }
        ).to_list()

        podcast_ids = [str(p.id) for p in kids_podcasts]
        total_episodes = await PodcastEpisode.find(
            {
                "podcast_id": {"$in": podcast_ids},
            }
        ).count()

        return {
            "total_kids_podcasts": total_podcasts,
            "total_kids_episodes": total_episodes,
            "available_feeds": len(KIDS_PODCASTS_REGISTRY),
        }


# Global service instance
kids_podcast_service = KidsPodcastService()

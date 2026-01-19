"""
YouTube Kids Content Service

Full YouTube Data API v3 integration for importing kids channel content.
Supports Hebrew, English, and Spanish kids educational channels.

Target Channels:
- Hebrew: HOP! ילדים, כאן חינוכית, ערוץ הילדים
- Jewish: Chabad Kids, Aish HaTorah Kids, Torah Live
- Educational: Numberblocks, StoryBots, Sesame Street
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

import httpx

from app.models.content import Content, Category
from app.core.config import settings

logger = logging.getLogger(__name__)


# YouTube Data API v3 endpoints
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


@dataclass
class YouTubeVideo:
    """Represents a YouTube video with metadata."""
    video_id: str
    title: str
    title_en: Optional[str] = None
    description: str = ""
    channel_id: str = ""
    channel_title: str = ""
    published_at: Optional[datetime] = None
    thumbnail_url: str = ""
    duration: str = ""
    view_count: int = 0
    age_rating: int = 5
    category_key: str = "educational"
    educational_tags: List[str] = field(default_factory=list)


# Curated list of kids YouTube channels
# Channel IDs are used for API queries
KIDS_YOUTUBE_CHANNELS: List[Dict[str, Any]] = [
    # Hebrew Kids Channels
    {
        "channel_id": "UCDybr25JFpOhGsFxwW8Lnlw",  # HOP! ילדים
        "name": "HOP! ילדים",
        "name_en": "HOP! Kids",
        "language": "he",
        "age_rating": 3,
        "category_key": "cartoons",
        "educational_tags": ["hebrew", "entertainment", "cartoons"],
    },
    {
        "channel_id": "UCKoHPQu-2rGLrwGh3g-gJgQ",  # כאן לילדים
        "name": "כאן לילדים",
        "name_en": "Kan Kids",
        "language": "he",
        "age_rating": 3,
        "category_key": "educational",
        "educational_tags": ["hebrew", "educational", "israel"],
    },
    # Hebrew Learning
    {
        "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",  # Learn Hebrew
        "name": "לימוד עברית לילדים",
        "name_en": "Hebrew Learning for Kids",
        "language": "he",
        "age_rating": 3,
        "category_key": "hebrew",
        "educational_tags": ["hebrew", "language", "alphabet"],
    },
    # Jewish Educational
    {
        "channel_id": "UC6p3Y4w-WO2x9VYqzDbpDAw",  # Chabad Kids
        "name": "Chabad Kids",
        "name_en": "Chabad Kids",
        "language": "en",
        "age_rating": 5,
        "category_key": "jewish",
        "educational_tags": ["jewish", "torah", "holidays"],
    },
    {
        "channel_id": "UCYq-WNHCVEBC6BWDQD9gVpA",  # Torah Live
        "name": "Torah Live",
        "name_en": "Torah Live",
        "language": "en",
        "age_rating": 7,
        "category_key": "jewish",
        "educational_tags": ["jewish", "torah", "education"],
    },
    # Educational (English)
    {
        "channel_id": "UCWQ6Wld8rWvB6pvAzVvGVfQ",  # Numberblocks
        "name": "Numberblocks",
        "name_en": "Numberblocks",
        "language": "en",
        "age_rating": 3,
        "category_key": "educational",
        "educational_tags": ["math", "numbers", "learning"],
    },
    {
        "channel_id": "UCzz4CoEgSgWNs9ZAvRMhW2A",  # StoryBots
        "name": "StoryBots",
        "name_en": "StoryBots",
        "language": "en",
        "age_rating": 5,
        "category_key": "educational",
        "educational_tags": ["science", "learning", "fun"],
    },
    # Kids Music
    {
        "channel_id": "UCddiUEpeqJcYeBxX1IVBKvQ",  # Cocomelon
        "name": "Cocomelon",
        "name_en": "Cocomelon",
        "language": "en",
        "age_rating": 3,
        "category_key": "music",
        "educational_tags": ["music", "nursery_rhymes", "songs"],
    },
]


class YouTubeKidsService:
    """
    Service for importing kids content from YouTube using the Data API v3.
    """

    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
            )
        return self.http_client

    async def close(self):
        """Close HTTP client."""
        if self.http_client:
            await self.http_client.aclose()

    def _get_api_key(self) -> str:
        """Get YouTube API key from settings."""
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            raise ValueError("YOUTUBE_API_KEY not configured")
        return api_key

    @staticmethod
    def _youtube_to_stream_url(video_id: str) -> str:
        """Convert YouTube video ID to embeddable URL."""
        return f"https://www.youtube.com/embed/{video_id}"

    @staticmethod
    def _youtube_to_thumbnail(video_id: str) -> str:
        """
        Get YouTube thumbnail URL from video ID.
        Uses hqdefault.jpg (480x360) which is available for all videos.
        maxresdefault.jpg (1280x720) doesn't exist for all videos.
        """
        return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    @staticmethod
    def _parse_duration(duration_str: str) -> str:
        """
        Parse ISO 8601 duration (PT1H2M3S) to human readable format.
        """
        import re
        if not duration_str:
            return ""

        # Remove PT prefix
        duration_str = duration_str.replace("PT", "")

        hours = 0
        minutes = 0
        seconds = 0

        # Parse hours
        hour_match = re.search(r"(\d+)H", duration_str)
        if hour_match:
            hours = int(hour_match.group(1))

        # Parse minutes
        min_match = re.search(r"(\d+)M", duration_str)
        if min_match:
            minutes = int(min_match.group(1))

        # Parse seconds
        sec_match = re.search(r"(\d+)S", duration_str)
        if sec_match:
            seconds = int(sec_match.group(1))

        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes}:{seconds:02d}"

    async def get_channel_videos(
        self,
        channel_id: str,
        max_results: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get videos from a YouTube channel using the Data API.

        Args:
            channel_id: YouTube channel ID
            max_results: Maximum number of videos to fetch

        Returns:
            List of video metadata dictionaries.
        """
        try:
            api_key = self._get_api_key()
            client = await self._get_client()

            # Step 1: Get channel's uploads playlist ID
            channel_url = f"{YOUTUBE_API_BASE}/channels"
            channel_params = {
                "key": api_key,
                "id": channel_id,
                "part": "contentDetails",
            }

            response = await client.get(channel_url, params=channel_params)
            if response.status_code != 200:
                logger.error(f"Failed to get channel info: HTTP {response.status_code}")
                return []

            channel_data = response.json()
            items = channel_data.get("items", [])
            if not items:
                logger.error(f"Channel not found: {channel_id}")
                return []

            uploads_playlist_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

            # Step 2: Get videos from uploads playlist
            playlist_url = f"{YOUTUBE_API_BASE}/playlistItems"
            playlist_params = {
                "key": api_key,
                "playlistId": uploads_playlist_id,
                "part": "snippet",
                "maxResults": min(max_results, 50),
            }

            response = await client.get(playlist_url, params=playlist_params)
            if response.status_code != 200:
                logger.error(f"Failed to get playlist: HTTP {response.status_code}")
                return []

            playlist_data = response.json()
            video_ids = [
                item["snippet"]["resourceId"]["videoId"]
                for item in playlist_data.get("items", [])
            ]

            if not video_ids:
                return []

            # Step 3: Get detailed video info
            videos_url = f"{YOUTUBE_API_BASE}/videos"
            videos_params = {
                "key": api_key,
                "id": ",".join(video_ids),
                "part": "snippet,contentDetails,statistics",
            }

            response = await client.get(videos_url, params=videos_params)
            if response.status_code != 200:
                logger.error(f"Failed to get video details: HTTP {response.status_code}")
                return []

            videos_data = response.json()
            videos = []

            for item in videos_data.get("items", []):
                snippet = item.get("snippet", {})
                content_details = item.get("contentDetails", {})
                statistics = item.get("statistics", {})

                # Get best thumbnail
                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("maxres", {}).get("url") or
                    thumbnails.get("high", {}).get("url") or
                    thumbnails.get("medium", {}).get("url") or
                    thumbnails.get("default", {}).get("url", "")
                )

                # Parse published date
                published_str = snippet.get("publishedAt", "")
                published_at = None
                if published_str:
                    try:
                        published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                    except Exception:
                        pass

                videos.append({
                    "video_id": item["id"],
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:500],
                    "channel_id": snippet.get("channelId", ""),
                    "channel_title": snippet.get("channelTitle", ""),
                    "published_at": published_at,
                    "thumbnail_url": thumbnail_url,
                    "duration": self._parse_duration(content_details.get("duration", "")),
                    "view_count": int(statistics.get("viewCount", 0)),
                })

            return videos

        except Exception as e:
            logger.error(f"Error fetching channel videos: {e}")
            return []

    async def _ensure_category(self, category_key: str) -> Optional[str]:
        """Ensure kids category exists and return its ID."""
        slug = f"kids-{category_key}"
        existing = await Category.find_one({"slug": slug})
        if existing:
            return str(existing.id)
        return None

    async def import_channel_content(
        self,
        channel_info: Dict[str, Any],
        max_videos: int = 20,
    ) -> Dict[str, Any]:
        """
        Import content from a single YouTube channel.

        Args:
            channel_info: Channel metadata from KIDS_YOUTUBE_CHANNELS
            max_videos: Maximum number of videos to import

        Returns:
            Import summary.
        """
        channel_id = channel_info.get("channel_id")
        if not channel_id:
            return {"error": "Missing channel_id"}

        imported = 0
        skipped = 0
        errors = []

        try:
            videos = await self.get_channel_videos(channel_id, max_videos)

            category_id = await self._ensure_category(channel_info.get("category_key", "educational"))

            for video in videos:
                try:
                    # Check if video already exists
                    existing = await Content.find_one({
                        "stream_url": self._youtube_to_stream_url(video["video_id"])
                    })
                    if existing:
                        skipped += 1
                        continue

                    # Create content entry
                    content = Content(
                        title=video["title"],
                        title_en=video["title"] if channel_info.get("language") == "en" else None,
                        description=video["description"],
                        category_id=category_id or "",
                        category_name=channel_info.get("category_key", "educational"),
                        director=video["channel_title"],
                        duration=video["duration"],
                        thumbnail=video["thumbnail_url"] or self._youtube_to_thumbnail(video["video_id"]),
                        backdrop=video["thumbnail_url"] or self._youtube_to_thumbnail(video["video_id"]),
                        stream_url=self._youtube_to_stream_url(video["video_id"]),
                        content_type="vod",
                        view_count=video["view_count"],
                        # Kids fields
                        is_kids_content=True,
                        age_rating=channel_info.get("age_rating", 5),
                        content_rating="G",
                        educational_tags=channel_info.get("educational_tags", []),
                        # Visibility
                        is_published=True,
                        requires_subscription="basic",
                        # Timestamps
                        published_at=video["published_at"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )

                    await content.insert()
                    imported += 1
                    logger.info(f"Imported YouTube video: {video['title'][:50]}...")

                except Exception as e:
                    errors.append(f"{video.get('title', 'unknown')[:30]}: {str(e)}")

            return {
                "channel": channel_info.get("name", channel_id),
                "imported": imported,
                "skipped": skipped,
                "errors": errors,
            }

        except Exception as e:
            logger.error(f"Error importing channel {channel_id}: {e}")
            return {
                "channel": channel_info.get("name", channel_id),
                "error": str(e),
            }

    async def sync_all_channels(
        self,
        max_videos_per_channel: int = 20,
    ) -> Dict[str, Any]:
        """
        Sync content from all configured kids YouTube channels.

        Returns:
            Summary of sync operation.
        """
        if not settings.YOUTUBE_API_KEY:
            return {
                "message": "YouTube API key not configured",
                "imported": 0,
            }

        total_imported = 0
        total_skipped = 0
        channel_results = []
        all_errors = []

        # Combine registry with user-configured channels
        all_channels = list(KIDS_YOUTUBE_CHANNELS)

        # Add user-configured channels from settings
        if settings.KIDS_YOUTUBE_CHANNEL_IDS:
            try:
                custom_ids = json.loads(settings.KIDS_YOUTUBE_CHANNEL_IDS)
                for channel_id in custom_ids:
                    # Check if not already in registry
                    existing = [c for c in all_channels if c["channel_id"] == channel_id]
                    if not existing:
                        all_channels.append({
                            "channel_id": channel_id,
                            "name": f"Custom Channel {channel_id}",
                            "language": "en",
                            "age_rating": 5,
                            "category_key": "educational",
                            "educational_tags": [],
                        })
            except json.JSONDecodeError:
                logger.warning("Invalid KIDS_YOUTUBE_CHANNEL_IDS JSON format")

        for channel_info in all_channels:
            result = await self.import_channel_content(channel_info, max_videos_per_channel)
            channel_results.append(result)

            if "error" not in result:
                total_imported += result.get("imported", 0)
                total_skipped += result.get("skipped", 0)
                all_errors.extend(result.get("errors", []))
            else:
                all_errors.append(f"{channel_info.get('name')}: {result['error']}")

        return {
            "message": "YouTube channel sync completed",
            "total_imported": total_imported,
            "total_skipped": total_skipped,
            "channels_processed": len(all_channels),
            "channel_results": channel_results,
            "errors": all_errors,
        }

    async def search_kids_videos(
        self,
        query: str,
        max_results: int = 20,
        safe_search: str = "strict",
    ) -> List[Dict[str, Any]]:
        """
        Search YouTube for kids-appropriate videos.

        Note: Results should be reviewed before import.

        Args:
            query: Search query
            max_results: Maximum number of results
            safe_search: YouTube safe search mode (strict, moderate, none)

        Returns:
            List of video metadata.
        """
        try:
            api_key = self._get_api_key()
            client = await self._get_client()

            search_url = f"{YOUTUBE_API_BASE}/search"
            params = {
                "key": api_key,
                "q": query,
                "type": "video",
                "part": "snippet",
                "maxResults": min(max_results, 50),
                "safeSearch": safe_search,
                "videoCategoryId": "1",  # Film & Animation category
            }

            response = await client.get(search_url, params=params)
            if response.status_code != 200:
                logger.error(f"YouTube search failed: HTTP {response.status_code}")
                return []

            data = response.json()
            videos = []

            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                thumbnails = snippet.get("thumbnails", {})

                videos.append({
                    "video_id": item["id"]["videoId"],
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:300],
                    "channel_title": snippet.get("channelTitle", ""),
                    "thumbnail_url": thumbnails.get("high", {}).get("url", ""),
                    "published_at": snippet.get("publishedAt", ""),
                })

            return videos

        except Exception as e:
            logger.error(f"Error searching YouTube: {e}")
            return []


# Global service instance
youtube_kids_service = YouTubeKidsService()

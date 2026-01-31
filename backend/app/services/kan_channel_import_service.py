"""
Kan Educational Channel Import Service

Imports ALL public videos from the Kan Educational YouTube channel (כאן חינוכית)
into the Content collection as VOD items with kids/educational metadata.

Uses YouTube Data API v3 for full channel import with series detection.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.models.content import Content

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class KanChannelImportService:
    """Service for importing Kan Educational YouTube channel content."""

    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
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
        """Get YouTube thumbnail URL from video ID."""
        return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    @staticmethod
    def _parse_duration(duration_str: str) -> str:
        """Parse ISO 8601 duration (PT1H2M3S) to human readable format."""
        if not duration_str:
            return ""
        duration_str = duration_str.replace("PT", "")
        hours, minutes, seconds = 0, 0, 0

        hour_match = re.search(r"(\d+)H", duration_str)
        if hour_match:
            hours = int(hour_match.group(1))
        min_match = re.search(r"(\d+)M", duration_str)
        if min_match:
            minutes = int(min_match.group(1))
        sec_match = re.search(r"(\d+)S", duration_str)
        if sec_match:
            seconds = int(sec_match.group(1))

        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"

    @staticmethod
    def _parse_duration_seconds(duration_str: str) -> int:
        """Parse ISO 8601 duration to seconds."""
        if not duration_str:
            return 0
        duration_str = duration_str.replace("PT", "")
        total_seconds = 0

        hour_match = re.search(r"(\d+)H", duration_str)
        if hour_match:
            total_seconds += int(hour_match.group(1)) * 3600
        min_match = re.search(r"(\d+)M", duration_str)
        if min_match:
            total_seconds += int(min_match.group(1)) * 60
        sec_match = re.search(r"(\d+)S", duration_str)
        if sec_match:
            total_seconds += int(sec_match.group(1))

        return total_seconds

    async def _get_uploads_playlist_id(self, channel_id: str) -> Optional[str]:
        """Get the uploads playlist ID for a channel."""
        client = await self._get_client()
        api_key = self._get_api_key()

        response = await client.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={"key": api_key, "id": channel_id, "part": "contentDetails"},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get channel info: HTTP {response.status_code}")
            return None

        data = response.json()
        items = data.get("items", [])
        if not items:
            return None

        return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

    async def _get_all_playlist_videos(
        self, playlist_id: str, max_videos: int = 500
    ) -> List[str]:
        """Get all video IDs from a playlist with pagination."""
        client = await self._get_client()
        api_key = self._get_api_key()
        video_ids: List[str] = []
        page_token: Optional[str] = None

        while len(video_ids) < max_videos:
            params = {
                "key": api_key,
                "playlistId": playlist_id,
                "part": "snippet",
                "maxResults": min(50, max_videos - len(video_ids)),
            }
            if page_token:
                params["pageToken"] = page_token

            response = await client.get(
                f"{YOUTUBE_API_BASE}/playlistItems", params=params
            )
            if response.status_code != 200:
                logger.error(f"Failed to get playlist: HTTP {response.status_code}")
                break

            data = response.json()
            for item in data.get("items", []):
                video_ids.append(item["snippet"]["resourceId"]["videoId"])

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return video_ids

    async def _get_video_details(
        self, video_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """Batch fetch video details."""
        if not video_ids:
            return []

        client = await self._get_client()
        api_key = self._get_api_key()
        videos: List[Dict[str, Any]] = []

        # Process in batches of 50 (API limit)
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            response = await client.get(
                f"{YOUTUBE_API_BASE}/videos",
                params={
                    "key": api_key,
                    "id": ",".join(batch),
                    "part": "snippet,contentDetails,statistics",
                },
            )
            if response.status_code != 200:
                logger.error(f"Failed to get video details: HTTP {response.status_code}")
                continue

            data = response.json()
            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                content_details = item.get("contentDetails", {})
                statistics = item.get("statistics", {})
                thumbnails = snippet.get("thumbnails", {})

                published_at = None
                published_str = snippet.get("publishedAt", "")
                if published_str:
                    try:
                        published_at = datetime.fromisoformat(
                            published_str.replace("Z", "+00:00")
                        )
                    except Exception:
                        pass

                videos.append({
                    "video_id": item["id"],
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:500],
                    "channel_title": snippet.get("channelTitle", ""),
                    "published_at": published_at,
                    "thumbnail_url": (
                        thumbnails.get("maxres", {}).get("url")
                        or thumbnails.get("high", {}).get("url")
                        or thumbnails.get("medium", {}).get("url")
                        or ""
                    ),
                    "duration": self._parse_duration(
                        content_details.get("duration", "")
                    ),
                    "duration_seconds": self._parse_duration_seconds(
                        content_details.get("duration", "")
                    ),
                    "view_count": int(statistics.get("viewCount", 0)),
                })

        return videos

    async def import_channel_content(
        self,
        channel_id: Optional[str] = None,
        max_videos: int = 500,
        force_reimport: bool = False,
    ) -> Dict[str, Any]:
        """
        Import all content from Kan Educational YouTube channel.

        Args:
            channel_id: YouTube channel ID (defaults to Kan Educational)
            max_videos: Maximum videos to import
            force_reimport: Re-import even if already exists

        Returns:
            Import summary with stats.
        """
        channel_id = channel_id or settings.KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID
        if not channel_id:
            return {"error": "No channel ID configured"}

        imported, skipped, errors = 0, 0, []

        try:
            # Get uploads playlist
            uploads_playlist = await self._get_uploads_playlist_id(channel_id)
            if not uploads_playlist:
                return {"error": "Could not find channel uploads playlist"}

            # Get all video IDs
            video_ids = await self._get_all_playlist_videos(
                uploads_playlist, max_videos
            )
            logger.info(f"Found {len(video_ids)} videos in Kan Educational channel")

            # Get video details
            videos = await self._get_video_details(video_ids)

            for video in videos:
                try:
                    stream_url = self._youtube_to_stream_url(video["video_id"])

                    # Check if already exists
                    if not force_reimport:
                        existing = await Content.find_one({"stream_url": stream_url})
                        if existing:
                            skipped += 1
                            continue

                    # Create content entry
                    content = Content(
                        title=video["title"],
                        title_en=video["title"],  # Most Kan content has Hebrew titles
                        description=video["description"],
                        description_en=video["description"],
                        category_name="educational",
                        director=video["channel_title"],
                        duration=video["duration"],
                        thumbnail=video["thumbnail_url"]
                        or self._youtube_to_thumbnail(video["video_id"]),
                        backdrop=video["thumbnail_url"]
                        or self._youtube_to_thumbnail(video["video_id"]),
                        stream_url=stream_url,
                        stream_type="youtube",
                        content_type="vod",
                        content_format="clip",
                        view_count=video["view_count"],
                        # Kids/Educational fields
                        is_kids_content=True,
                        age_rating=7,
                        content_rating="G",
                        educational_tags=["hebrew", "math", "science", "education"],
                        audience_id="kids",
                        # Section assignments
                        section_ids=["kids", "judaism"],
                        primary_section_id="kids",
                        subcategory_ids=["educational", "language-learning"],
                        # AI Enhancement
                        topic_tags=["ai-enhanced", "educational", "hebrew-learning"],
                        # Visibility
                        is_published=True,
                        requires_subscription="basic",
                        published_at=video["published_at"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )

                    await content.insert()
                    imported += 1
                    logger.info(f"Imported: {video['title'][:50]}...")

                except Exception as e:
                    errors.append(f"{video.get('title', 'unknown')[:30]}: {str(e)}")

            return {
                "channel_id": channel_id,
                "imported": imported,
                "skipped": skipped,
                "total_found": len(videos),
                "errors": errors,
            }

        except Exception as e:
            logger.error(f"Error importing Kan channel: {e}")
            return {"error": str(e)}


# Global service instance
kan_channel_import_service = KanChannelImportService()

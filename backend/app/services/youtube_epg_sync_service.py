"""
YouTube EPG Sync Service

Builds a 24/7 synchronized EPG schedule from imported YouTube Content documents.
All users see the same video at the same time based on wall clock time.

The schedule is deterministic - computed from wall clock time against a fixed epoch.
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.models.content import Content, EPGEntry, LiveChannel

logger = logging.getLogger(__name__)


class YouTubeEPGSyncService:
    """
    Service for building synchronized EPG schedules from YouTube playlist content.

    Uses wall-clock time to compute which video should be playing and at what position,
    ensuring all users see the same content simultaneously.
    """

    # Fixed epoch for schedule computation (midnight UTC, Jan 1, 2020)
    SCHEDULE_EPOCH = datetime(2020, 1, 1, 0, 0, 0)

    @staticmethod
    def _parse_duration_seconds(duration_str: str) -> int:
        """Parse duration string (H:MM:SS or M:SS) to seconds."""
        if not duration_str:
            return 300  # Default 5 minutes

        parts = duration_str.split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            return int(parts[0])
        except (ValueError, IndexError):
            return 300  # Default 5 minutes

    async def get_channel_content(
        self, channel: LiveChannel
    ) -> List[Dict[str, Any]]:
        """
        Get all content associated with a YouTube playlist channel.

        Args:
            channel: LiveChannel document

        Returns:
            List of content items ordered for scheduling.
        """
        # Query content by category or topic tags matching the channel
        content_list = await Content.find(
            {
                "$or": [
                    {"category_name": "educational"},
                    {"topic_tags": {"$in": ["ai-enhanced"]}},
                    {"educational_tags": {"$in": ["hebrew", "math", "science"]}},
                ],
                "stream_url": {"$regex": "youtube.com/embed"},
                "is_published": True,
            }
        ).sort([("series_id", 1), ("season", 1), ("episode", 1), ("created_at", 1)]).to_list()

        videos = []
        for content in content_list:
            duration_seconds = self._parse_duration_seconds(content.duration or "")
            if duration_seconds < 30:
                continue  # Skip very short clips

            # Extract YouTube video ID from embed URL
            video_id_match = re.search(r"embed/([a-zA-Z0-9_-]+)", content.stream_url)
            video_id = video_id_match.group(1) if video_id_match else None

            videos.append({
                "content_id": str(content.id),
                "title": content.title,
                "title_en": content.title_en or content.title,
                "description": content.description,
                "thumbnail": content.thumbnail,
                "youtube_id": video_id,
                "duration_seconds": duration_seconds,
                "stream_url": content.stream_url,
            })

        return videos

    def compute_current_program(
        self, videos: List[Dict[str, Any]], now: Optional[datetime] = None
    ) -> Tuple[Optional[Dict[str, Any]], int, datetime, datetime]:
        """
        Compute which video is currently playing and at what position.

        Args:
            videos: List of video metadata with duration_seconds
            now: Current time (defaults to utcnow)

        Returns:
            Tuple of (current_video, seek_seconds, start_time, end_time)
        """
        if not videos:
            return None, 0, datetime.utcnow(), datetime.utcnow()

        now = now or datetime.utcnow()

        # Calculate total playlist duration
        total_duration = sum(v["duration_seconds"] for v in videos)
        if total_duration == 0:
            return videos[0], 0, now, now + timedelta(seconds=300)

        # Compute position in the loop cycle
        seconds_since_epoch = (now - self.SCHEDULE_EPOCH).total_seconds()
        cycle_position = int(seconds_since_epoch) % total_duration

        # Find which video is currently playing
        accumulated = 0
        for video in videos:
            video_end = accumulated + video["duration_seconds"]
            if accumulated <= cycle_position < video_end:
                seek_seconds = cycle_position - accumulated
                start_time = now - timedelta(seconds=seek_seconds)
                end_time = start_time + timedelta(seconds=video["duration_seconds"])
                return video, seek_seconds, start_time, end_time
            accumulated = video_end

        # Fallback to first video
        return videos[0], 0, now, now + timedelta(seconds=videos[0]["duration_seconds"])

    def compute_next_program(
        self, videos: List[Dict[str, Any]], current_video: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Get the next video after the current one."""
        if not videos or not current_video:
            return videos[0] if videos else None

        for i, video in enumerate(videos):
            if video["content_id"] == current_video["content_id"]:
                return videos[(i + 1) % len(videos)]

        return videos[0]

    async def sync_channel_epg(self, channel_id: str) -> Dict[str, Any]:
        """
        Synchronize EPG entries for a YouTube playlist channel.

        Args:
            channel_id: LiveChannel document ID

        Returns:
            Sync summary.
        """
        channel = await LiveChannel.get(channel_id)
        if not channel:
            return {"error": "Channel not found"}

        if channel.stream_type != "youtube-playlist":
            return {"error": "Not a YouTube playlist channel"}

        # Get channel content
        videos = await self.get_channel_content(channel)
        if not videos:
            return {"error": "No content found for channel"}

        # Compute current program
        current_video, seek_seconds, start_time, end_time = self.compute_current_program(
            videos
        )
        next_video = self.compute_next_program(videos, current_video)

        # Update channel's current/next show
        if current_video:
            channel.current_show = current_video["title"]
            channel.stream_url = current_video["stream_url"]
        if next_video:
            channel.next_show = next_video["title"]
        channel.updated_at = datetime.utcnow()
        await channel.save()

        # Generate EPG entries for 24-hour window (2h past + 22h future)
        now = datetime.utcnow()
        window_start = now - timedelta(hours=2)
        window_end = now + timedelta(hours=22)

        # Clear old EPG entries for this channel in the window
        await EPGEntry.find(
            EPGEntry.channel_id == channel_id,
            EPGEntry.start_time >= window_start,
            EPGEntry.end_time <= window_end,
        ).delete()

        # Generate new EPG entries
        entries_created = 0
        total_duration = sum(v["duration_seconds"] for v in videos)

        if total_duration > 0:
            # Find the starting point in our window
            seconds_since_epoch = (window_start - self.SCHEDULE_EPOCH).total_seconds()
            start_cycle_position = int(seconds_since_epoch) % total_duration

            # Find which video starts at window_start
            accumulated = 0
            start_index = 0
            for i, video in enumerate(videos):
                if accumulated + video["duration_seconds"] > start_cycle_position:
                    start_index = i
                    break
                accumulated += video["duration_seconds"]

            # Generate entries from window_start to window_end
            current_time = window_start
            video_index = start_index

            while current_time < window_end:
                video = videos[video_index % len(videos)]
                entry_end = current_time + timedelta(seconds=video["duration_seconds"])

                entry = EPGEntry(
                    channel_id=channel_id,
                    title=video["title"],
                    description=video.get("description", ""),
                    start_time=current_time,
                    end_time=entry_end,
                    category="educational",
                    thumbnail=video.get("thumbnail"),
                )
                await entry.insert()
                entries_created += 1

                current_time = entry_end
                video_index += 1

        return {
            "channel_id": channel_id,
            "videos_in_rotation": len(videos),
            "total_duration_minutes": total_duration // 60,
            "epg_entries_created": entries_created,
            "current_program": current_video["title"] if current_video else None,
            "seek_seconds": seek_seconds,
        }

    async def get_current_program(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current program for a YouTube playlist channel.

        Args:
            channel_id: LiveChannel document ID

        Returns:
            Current program details with seek position.
        """
        channel = await LiveChannel.get(channel_id)
        if not channel or channel.stream_type != "youtube-playlist":
            return None

        videos = await self.get_channel_content(channel)
        if not videos:
            return None

        current_video, seek_seconds, start_time, end_time = self.compute_current_program(
            videos
        )
        next_video = self.compute_next_program(videos, current_video)

        if not current_video:
            return None

        return {
            "current_program": {
                "title": current_video["title"],
                "title_en": current_video.get("title_en", current_video["title"]),
                "description": current_video.get("description", ""),
                "youtube_id": current_video.get("youtube_id"),
                "started_at": start_time.isoformat() + "Z",
                "ends_at": end_time.isoformat() + "Z",
                "seek_to_seconds": seek_seconds,
                "thumbnail": current_video.get("thumbnail"),
            },
            "next_program": {
                "title": next_video["title"],
                "title_en": next_video.get("title_en", next_video["title"]),
                "youtube_id": next_video.get("youtube_id"),
                "starts_at": end_time.isoformat() + "Z",
            } if next_video else None,
        }


# Global service instance
youtube_epg_sync_service = YouTubeEPGSyncService()

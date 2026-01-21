from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.content import EPGEntry, LiveChannel


class EPGService:
    """Service for EPG data retrieval and management"""

    def __init__(self):
        self.cache: Dict[str, Any] = {}
        self.cache_ttl = timedelta(seconds=settings.EPG_CACHE_TTL_SECONDS)

    async def get_epg_data(
        self,
        channel_ids: Optional[List[str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        timezone: str = "UTC",
    ) -> Dict[str, Any]:
        """
        Get EPG data for specified channels and time range

        Args:
            channel_ids: List of channel IDs to fetch EPG for (None = all channels)
            start_time: Start of time window (default: now - EPG_PAST_HOURS)
            end_time: End of time window (default: now + EPG_FUTURE_HOURS)
            timezone: Timezone for time calculations (default: UTC)

        Returns:
            Dictionary with programs and channels
        """
        # Calculate default time window if not provided
        if start_time is None:
            start_time = datetime.utcnow() - timedelta(hours=settings.EPG_PAST_HOURS)
        if end_time is None:
            end_time = datetime.utcnow() + timedelta(hours=settings.EPG_FUTURE_HOURS)

        # Build query filter
        query_filter: Dict[str, Any] = {
            "start_time": {"$lte": end_time},
            "end_time": {"$gte": start_time},
        }

        if channel_ids:
            query_filter["channel_id"] = {"$in": channel_ids}

        # Fetch EPG entries
        programs = await EPGEntry.find(query_filter).sort("start_time").to_list()

        # Get channel details
        if channel_ids:
            channels = (
                await LiveChannel.find({"_id": {"$in": channel_ids}, "is_active": True})
                .sort("order")
                .to_list()
            )
        else:
            channels = (
                await LiveChannel.find({"is_active": True}).sort("order").to_list()
            )

        # Convert to dict format
        programs_data = [self._program_to_dict(program) for program in programs]
        channels_data = [self._channel_to_dict(channel) for channel in channels]

        return {
            "programs": programs_data,
            "channels": channels_data,
            "current_time": datetime.utcnow().isoformat(),
            "time_window": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
            },
        }

    async def search_epg(
        self,
        query: str,
        channel_ids: Optional[List[str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Traditional text search in EPG data

        Args:
            query: Search query string
            channel_ids: Filter by channel IDs
            start_time: Filter by start time
            end_time: Filter by end time
            category: Filter by category

        Returns:
            List of matching programs
        """
        # Build query filter
        query_filter: Dict[str, Any] = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"cast": {"$regex": query, "$options": "i"}},
            ]
        }

        # Add additional filters
        if channel_ids:
            query_filter["channel_id"] = {"$in": channel_ids}

        if start_time:
            query_filter["start_time"] = {"$gte": start_time}

        if end_time:
            query_filter["end_time"] = {"$lte": end_time}

        if category:
            query_filter["category"] = category

        # Execute search
        results = await EPGEntry.find(query_filter).sort("start_time").to_list()

        return [self._program_to_dict(program) for program in results]

    async def get_channel_schedule(
        self, channel_id: str, date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get full day schedule for a specific channel

        Args:
            channel_id: Channel ID
            date: Date to get schedule for (default: today)

        Returns:
            List of programs for the day
        """
        if date is None:
            date = datetime.utcnow()

        # Calculate day boundaries
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Fetch programs
        programs = (
            await EPGEntry.find(
                {
                    "channel_id": channel_id,
                    "start_time": {"$gte": start_of_day, "$lt": end_of_day},
                }
            )
            .sort("start_time")
            .to_list()
        )

        return [self._program_to_dict(program) for program in programs]

    async def get_current_program(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """
        Get currently airing program for a channel

        Args:
            channel_id: Channel ID

        Returns:
            Current program or None
        """
        now = datetime.utcnow()
        program = await EPGEntry.find_one(
            {
                "channel_id": channel_id,
                "start_time": {"$lte": now},
                "end_time": {"$gte": now},
            }
        )

        return self._program_to_dict(program) if program else None

    async def get_next_program(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """
        Get next program for a channel

        Args:
            channel_id: Channel ID

        Returns:
            Next program or None
        """
        now = datetime.utcnow()
        program = await EPGEntry.find_one(
            {"channel_id": channel_id, "start_time": {"$gt": now}},
            sort=[("start_time", 1)],
        )

        return self._program_to_dict(program) if program else None

    def _program_to_dict(self, program: EPGEntry) -> Dict[str, Any]:
        """Convert EPGEntry to dictionary"""
        return {
            "id": str(program.id),
            "channel_id": program.channel_id,
            "title": program.title,
            "description": program.description,
            "start_time": program.start_time.isoformat(),
            "end_time": program.end_time.isoformat(),
            "duration_seconds": int(
                (program.end_time - program.start_time).total_seconds()
            ),
            "category": program.category,
            "thumbnail": program.thumbnail,
            "cast": program.cast or [],
            "genres": program.genres or [],
            "rating": program.rating,
            "director": program.director,
            "recording_id": program.recording_id,
            "is_past": program.end_time < datetime.utcnow(),
            "is_now": program.start_time <= datetime.utcnow() <= program.end_time,
            "is_future": program.start_time > datetime.utcnow(),
        }

    def _channel_to_dict(self, channel: LiveChannel) -> Dict[str, Any]:
        """Convert LiveChannel to dictionary"""
        return {
            "id": str(channel.id),
            "name": channel.name,
            "name_en": channel.name_en,
            "name_es": channel.name_es,
            "description": channel.description,
            "thumbnail": channel.thumbnail,
            "logo": channel.logo,
            "stream_url": channel.stream_url,
            "stream_type": channel.stream_type,
            "supports_live_subtitles": channel.supports_live_subtitles,
            "primary_language": channel.primary_language,
            "available_translation_languages": channel.available_translation_languages,
            "is_active": channel.is_active,
            "order": channel.order,
            "requires_subscription": channel.requires_subscription,
        }

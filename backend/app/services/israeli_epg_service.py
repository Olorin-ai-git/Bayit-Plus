"""
Israeli EPG Service
Fetches real EPG data from Israeli channel APIs.

Supported sources:
- i24news.tv API (Hebrew and English channels)

Note: Kan.org.il and Mako.co.il are blocked by Cloudflare (error 1020).
Consider using VPN or server-side proxy for those sources.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.models.content import EPGEntry, LiveChannel

logger = logging.getLogger(__name__)

# i24news channel site IDs
I24NEWS_CHANNELS = {
    "i24NEWS Hebrew": "he",
    "i24News English": "en",
}


class IsraeliEPGService:
    """Service for fetching real EPG data from Israeli channel APIs"""

    I24NEWS_API_BASE = "https://api.i24news.tv/v2"

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "Accept": "application/json",
                "User-Agent": "Bayit+/1.0 (EPG Integration)",
            },
        )

    async def fetch_i24news_schedule(
        self, channel_code: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch schedule from i24news API.

        Args:
            channel_code: "he" for Hebrew, "en" for English

        Returns:
            List of schedule entries
        """
        try:
            url = f"{self.I24NEWS_API_BASE}/{channel_code}/schedules"
            logger.info(f"Fetching i24news schedule from {url}")

            response = await self.client.get(url)
            response.raise_for_status()

            schedule = response.json()
            logger.info(f"Fetched {len(schedule)} entries from i24news {channel_code}")
            return schedule

        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch i24news schedule: {e}")
            return []

    async def ingest_i24news_epg(
        self, channel_name_en: str, channel_id: str
    ) -> int:
        """
        Ingest real EPG data for an i24news channel.

        Args:
            channel_name_en: Channel name (e.g., "i24NEWS Hebrew")
            channel_id: MongoDB channel ID

        Returns:
            Number of EPG entries created
        """
        channel_code = I24NEWS_CHANNELS.get(channel_name_en)
        if not channel_code:
            logger.warning(f"Unknown i24news channel: {channel_name_en}")
            return 0

        schedule = await self.fetch_i24news_schedule(channel_code)

        created = 0
        today = datetime.now(timezone.utc).date()

        for item in schedule:
            try:
                entry = await self._create_epg_entry_from_i24(
                    channel_id, item, today
                )
                if entry:
                    created += 1
            except Exception as e:
                logger.error(f"Failed to create i24news EPG entry: {e}")
                continue

        logger.info(f"Created {created} EPG entries for {channel_name_en}")
        return created

    async def _create_epg_entry_from_i24(
        self, channel_id: str, item: Dict[str, Any], base_date: datetime
    ) -> Optional[EPGEntry]:
        """
        Create an EPG entry from i24news schedule item.

        The i24news API returns:
        {
            "id": 897643,
            "startHour": "00:45",
            "endHour": "02:15",
            "day": 0,  # 0 = today, 1 = tomorrow, etc.
            "show": {
                "id": 567,
                "title": "...",
                "parsedBody": [{"type": "text", "text": "..."}],
                "image": {"href": "https://..."}
            }
        }
        """
        show = item.get("show")
        if not show:
            return None

        start_hour = item.get("startHour", "")
        end_hour = item.get("endHour", "")
        day_offset = item.get("day", 0)

        if not start_hour or not end_hour:
            return None

        # Parse times
        try:
            # Calculate the date based on day offset
            target_date = base_date + timedelta(days=day_offset)

            # Parse hour:minute
            start_h, start_m = map(int, start_hour.split(":"))
            end_h, end_m = map(int, end_hour.split(":"))

            # Create datetime objects (Israel timezone is UTC+2/UTC+3)
            # Using UTC+2 as base (Israel Standard Time)
            israel_tz = timezone(timedelta(hours=2))

            start_time = datetime(
                target_date.year,
                target_date.month,
                target_date.day,
                start_h,
                start_m,
                tzinfo=israel_tz,
            )

            # Handle overnight shows (end time is next day)
            end_date = target_date
            if end_h < start_h:
                end_date = target_date + timedelta(days=1)

            end_time = datetime(
                end_date.year,
                end_date.month,
                end_date.day,
                end_h,
                end_m,
                tzinfo=israel_tz,
            )

            # Convert to UTC for storage
            start_time_utc = start_time.astimezone(timezone.utc)
            end_time_utc = end_time.astimezone(timezone.utc)

        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to parse i24news time: {e}")
            return None

        # Check if entry already exists
        existing = await EPGEntry.find_one(
            {
                "channel_id": channel_id,
                "start_time": start_time_utc,
            }
        )

        if existing:
            return None

        # Extract show details
        title = show.get("title", "Unknown")

        # Get description from parsedBody
        description = ""
        parsed_body = show.get("parsedBody", [])
        if parsed_body and isinstance(parsed_body, list):
            for block in parsed_body:
                if block.get("type") == "text":
                    description += block.get("text", "")
                    description += " "
        description = description.strip()

        # Get thumbnail
        image = show.get("image", {})
        thumbnail = image.get("href") if image else None

        # Create EPG entry
        entry = EPGEntry(
            channel_id=channel_id,
            title=title,
            description=description,
            start_time=start_time_utc,
            end_time=end_time_utc,
            category="News",
            thumbnail=thumbnail,
            cast=[],
            genres=["News", "International"],
            rating=None,
            director=None,
            recording_id=None,
        )

        await entry.insert()
        return entry

    async def ingest_all_israeli_channels(self) -> Dict[str, int]:
        """
        Ingest EPG for all Israeli channels with available APIs.

        Returns:
            Dictionary mapping channel names to ingestion counts
        """
        results = {}

        # Get channels from database
        channels = await LiveChannel.find({"is_active": True}).to_list()

        for channel in channels:
            channel_name = channel.name_en or channel.name

            # Check if this is an i24news channel
            if channel_name in I24NEWS_CHANNELS:
                logger.info(f"Ingesting EPG for {channel_name}")
                count = await self.ingest_i24news_epg(channel_name, str(channel.id))
                results[channel_name] = count
            elif channel_name in ["Reshet 13", "כאן חינוכית"]:
                # These channels have APIs blocked by Cloudflare
                logger.warning(
                    f"Skipping {channel_name} - API blocked by Cloudflare (1020)"
                )
                results[channel_name] = 0

        return results

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Singleton instance
israeli_epg_service = IsraeliEPGService()

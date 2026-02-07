"""
TVmaze Real EPG Service
Fetches real EPG data from TVmaze API for US channels.

TVmaze is a free API that provides real TV schedule data.
Network IDs:
- CNN: 40
- ABC: 3
- CBS: 2
- NBC: 1
- Fox: 4

API Endpoints:
- /schedule/full - Full schedule with all shows
- /schedule/web - Web/streaming schedule
- /networks/{id} - Network details
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.models.content import EPGEntry, LiveChannel

logger = logging.getLogger(__name__)

# TVmaze network ID mappings for our channels
# Full list: https://api.tvmaze.com/networks
TVMAZE_NETWORK_IDS = {
    "CNN": 40,
    "ABC News": 3,  # ABC network (news content mixed in)
    "King 5 News": 1,  # NBC affiliate - use NBC network schedule
}

# Channel name to TVmaze search terms (for show-based lookup)
CHANNEL_SEARCH_TERMS = {
    "CNN": ["CNN", "cnn"],
    "ABC News": ["ABC News", "abc news"],
    "King 5 News": ["King 5", "KING-TV"],
}


class TVmazeEPGService:
    """Service for fetching real EPG data from TVmaze API"""

    BASE_URL = "https://api.tvmaze.com"

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "Accept": "application/json",
                "User-Agent": "Bayit+/1.0 (EPG Integration)",
            },
        )
        self._schedule_cache: Dict[str, Any] = {}
        self._cache_time: Optional[datetime] = None
        self._cache_ttl = timedelta(hours=1)

    async def fetch_full_schedule(self) -> List[Dict[str, Any]]:
        """
        Fetch full schedule from TVmaze.
        This endpoint returns all shows airing across all networks.
        Cached for 1 hour to reduce API calls.
        """
        now = datetime.now(timezone.utc)

        # Check cache
        if self._cache_time and now - self._cache_time < self._cache_ttl:
            return self._schedule_cache.get("full", [])

        try:
            url = f"{self.BASE_URL}/schedule/full"
            logger.info(f"Fetching TVmaze full schedule from {url}")

            response = await self.client.get(url)
            response.raise_for_status()

            schedule = response.json()
            self._schedule_cache["full"] = schedule
            self._cache_time = now

            logger.info(f"Fetched {len(schedule)} entries from TVmaze")
            return schedule

        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch TVmaze schedule: {e}")
            return []

    async def fetch_network_schedule(
        self, network_id: int, date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch schedule for a specific network on a specific date.

        Args:
            network_id: TVmaze network ID
            date: Date to fetch schedule for (default: today)

        Returns:
            List of shows airing on that network
        """
        if date is None:
            date = datetime.now(timezone.utc)

        date_str = date.strftime("%Y-%m-%d")

        try:
            url = f"{self.BASE_URL}/schedule"
            params = {"date": date_str, "country": "US"}

            logger.info(f"Fetching TVmaze schedule for date {date_str}")
            response = await self.client.get(url, params=params)
            response.raise_for_status()

            all_shows = response.json()

            # Filter by network ID
            network_shows = [
                show
                for show in all_shows
                if show.get("show", {}).get("network", {}).get("id") == network_id
            ]

            logger.info(
                f"Found {len(network_shows)} shows for network {network_id} on {date_str}"
            )
            return network_shows

        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch network schedule: {e}")
            return []

    async def ingest_channel_epg(
        self, channel_name_en: str, channel_id: str, days_ahead: int = 7
    ) -> int:
        """
        Ingest real EPG data for a specific channel.

        Args:
            channel_name_en: English channel name (e.g., "CNN")
            channel_id: MongoDB channel ID
            days_ahead: Number of days to fetch ahead

        Returns:
            Number of EPG entries created
        """
        network_id = TVMAZE_NETWORK_IDS.get(channel_name_en)

        if network_id is None:
            logger.warning(f"No TVmaze network ID for {channel_name_en}")
            return 0

        created = 0
        now = datetime.now(timezone.utc)

        # Fetch schedule for each day
        for day_offset in range(days_ahead):
            target_date = now + timedelta(days=day_offset)
            shows = await self.fetch_network_schedule(network_id, target_date)

            for show in shows:
                try:
                    entry = await self._create_epg_entry(channel_id, show)
                    if entry:
                        created += 1
                except Exception as e:
                    logger.error(f"Failed to create EPG entry: {e}")
                    continue

        logger.info(f"Created {created} EPG entries for {channel_name_en}")
        return created

    async def ingest_from_full_schedule(
        self, channel_name_en: str, channel_id: str
    ) -> int:
        """
        Ingest EPG data from the full schedule endpoint.
        This gets all upcoming episodes across all channels.

        Args:
            channel_name_en: English channel name
            channel_id: MongoDB channel ID

        Returns:
            Number of EPG entries created
        """
        network_id = TVMAZE_NETWORK_IDS.get(channel_name_en)

        if network_id is None:
            logger.warning(f"No TVmaze network ID for {channel_name_en}")
            return 0

        schedule = await self.fetch_full_schedule()

        # Filter for our network - handle different response formats
        network_shows = []
        for entry in schedule:
            # Try _embedded.show.network format
            embedded = entry.get("_embedded", {})
            show = embedded.get("show", {})
            network = show.get("network")

            # Some entries have network directly on the show
            if network is None:
                show = entry.get("show", {})
                network = show.get("network")

            if network and network.get("id") == network_id:
                network_shows.append(entry)

        logger.info(f"Found {len(network_shows)} shows for {channel_name_en} in full schedule")

        created = 0
        for show_entry in network_shows:
            try:
                entry = await self._create_epg_entry_from_full(channel_id, show_entry)
                if entry:
                    created += 1
            except Exception as e:
                logger.error(f"Failed to create EPG entry: {e}")
                continue

        return created

    async def _create_epg_entry(
        self, channel_id: str, show_data: Dict[str, Any]
    ) -> Optional[EPGEntry]:
        """
        Create an EPG entry from TVmaze show data (daily schedule format).
        """
        show = show_data.get("show", {})
        airtime = show_data.get("airtime", "")
        airdate = show_data.get("airdate", "")
        runtime = show_data.get("runtime") or show.get("runtime") or 60

        if not airdate or not airtime:
            return None

        # Parse datetime
        try:
            start_time = datetime.fromisoformat(f"{airdate}T{airtime}:00")
            # Assume US Eastern timezone, convert to UTC
            start_time = start_time.replace(tzinfo=timezone.utc)
            end_time = start_time + timedelta(minutes=runtime)
        except ValueError as e:
            logger.warning(f"Failed to parse datetime: {e}")
            return None

        # Check if entry already exists
        existing = await EPGEntry.find_one(
            {
                "channel_id": channel_id,
                "start_time": start_time,
                "title": show.get("name", ""),
            }
        )

        if existing:
            return None

        # Extract show details
        genres = show.get("genres", [])
        image = show.get("image", {})
        thumbnail = image.get("medium") or image.get("original") if image else None

        # Get rating as string (TVmaze returns float)
        rating_value = show.get("rating", {}).get("average")
        rating_str = str(rating_value) if rating_value is not None else None

        # Create EPG entry
        entry = EPGEntry(
            channel_id=channel_id,
            title=show.get("name", "Unknown"),
            description=self._strip_html(show.get("summary", "")),
            start_time=start_time,
            end_time=end_time,
            category=genres[0] if genres else "News",
            thumbnail=thumbnail,
            cast=[],
            genres=genres,
            rating=rating_str,
            director=None,
            recording_id=None,
        )

        await entry.insert()
        return entry

    async def _create_epg_entry_from_full(
        self, channel_id: str, entry_data: Dict[str, Any]
    ) -> Optional[EPGEntry]:
        """
        Create an EPG entry from TVmaze full schedule format.
        """
        embedded = entry_data.get("_embedded", {})
        show = embedded.get("show", {})
        airstamp = entry_data.get("airstamp")
        runtime = entry_data.get("runtime") or show.get("runtime") or 60
        episode_name = entry_data.get("name", "")

        if not airstamp:
            return None

        # Parse datetime (ISO format with timezone)
        try:
            start_time = datetime.fromisoformat(airstamp.replace("Z", "+00:00"))
            end_time = start_time + timedelta(minutes=runtime)
        except ValueError as e:
            logger.warning(f"Failed to parse datetime: {e}")
            return None

        # Build title (show name + episode name if different)
        show_name = show.get("name", "Unknown")
        title = show_name
        if episode_name and episode_name != show_name:
            title = f"{show_name}: {episode_name}"

        # Check if entry already exists
        existing = await EPGEntry.find_one(
            {
                "channel_id": channel_id,
                "start_time": start_time,
            }
        )

        if existing:
            return None

        # Extract show details
        genres = show.get("genres", [])
        image = show.get("image", {})
        thumbnail = image.get("medium") or image.get("original") if image else None
        summary = entry_data.get("summary") or show.get("summary", "")

        # Get rating as string (TVmaze returns float)
        rating_value = show.get("rating", {}).get("average")
        rating_str = str(rating_value) if rating_value is not None else None

        # Create EPG entry
        entry = EPGEntry(
            channel_id=channel_id,
            title=title,
            description=self._strip_html(summary),
            start_time=start_time,
            end_time=end_time,
            category=genres[0] if genres else "News",
            thumbnail=thumbnail,
            cast=[],
            genres=genres,
            rating=rating_str,
            director=None,
            recording_id=None,
        )

        await entry.insert()
        return entry

    def _strip_html(self, text: Optional[str]) -> str:
        """Remove HTML tags from text."""
        if not text:
            return ""
        import re

        clean = re.sub(r"<[^>]+>", "", text)
        return clean.strip()

    async def ingest_all_us_channels(self) -> Dict[str, int]:
        """
        Ingest EPG for all US channels with TVmaze network IDs.

        Returns:
            Dictionary mapping channel names to ingestion counts
        """
        results = {}

        # Get channels from database
        channels = await LiveChannel.find({"is_active": True}).to_list()

        for channel in channels:
            channel_name = channel.name_en or channel.name

            # Check if we have a TVmaze mapping
            if channel_name not in TVMAZE_NETWORK_IDS:
                continue

            network_id = TVMAZE_NETWORK_IDS[channel_name]
            if network_id is None:
                results[channel_name] = 0
                continue

            logger.info(f"Ingesting EPG for {channel_name} (network ID: {network_id})")

            # Use full schedule for better coverage
            count = await self.ingest_from_full_schedule(channel_name, str(channel.id))
            results[channel_name] = count

        return results

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Singleton instance
tvmaze_epg_service = TVmazeEPGService()

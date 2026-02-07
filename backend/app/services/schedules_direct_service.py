"""
Schedules Direct EPG Service
Fetches real EPG data from Schedules Direct API.

Schedules Direct is a paid service ($25/year) that provides accurate
EPG data for TV channels worldwide, including Israeli channels.

API Documentation: https://github.com/SchedulesDirect/JSON-Service/wiki

Required Configuration:
- SCHEDULES_DIRECT_USERNAME: Your SD username
- SCHEDULES_DIRECT_PASSWORD: Your SD password (will be SHA1 hashed)
"""

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.models.content import EPGEntry

logger = logging.getLogger(__name__)


class SchedulesDirectService:
    """Service for fetching EPG data from Schedules Direct API"""

    BASE_URL = "https://json.schedulesdirect.org/20141201"

    # Channel mapping: Our channel names -> SD station IDs
    # These need to be configured after adding lineups
    CHANNEL_STATION_MAP: Dict[str, str] = {}

    def __init__(self, username: Optional[str] = None, password: Optional[str] = None):
        """
        Initialize the Schedules Direct service.

        Args:
            username: SD username (falls back to env var SCHEDULES_DIRECT_USERNAME)
            password: SD password (falls back to env var SCHEDULES_DIRECT_PASSWORD)
        """
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Bayit+/1.0",
            },
        )
        self._token: Optional[str] = None
        self._token_expires: Optional[datetime] = None
        self._username = username
        self._password = password

    def _hash_password(self, password: str) -> str:
        """SHA1 hash the password as required by SD API."""
        return hashlib.sha1(password.encode()).hexdigest()

    async def authenticate(self) -> bool:
        """
        Authenticate with Schedules Direct and get a token.
        Token is valid for 24 hours.

        Credentials are resolved in order:
        1. Instance attributes (_username, _password)
        2. Environment variables (SCHEDULES_DIRECT_USERNAME, SCHEDULES_DIRECT_PASSWORD)
        3. Settings from config
        """
        # Try instance attributes first
        username = self._username
        password = self._password

        # Fall back to environment variables
        if not username:
            username = os.environ.get("SCHEDULES_DIRECT_USERNAME")
        if not password:
            password = os.environ.get("SCHEDULES_DIRECT_PASSWORD")

        # Fall back to settings
        if not username or not password:
            try:
                from app.core.config import settings
                if not username:
                    username = getattr(settings, 'SCHEDULES_DIRECT_USERNAME', None)
                if not password:
                    password = getattr(settings, 'SCHEDULES_DIRECT_PASSWORD', None)
            except ImportError:
                pass

        if not username or not password:
            logger.error("Schedules Direct credentials not configured")
            return False

        try:
            url = f"{self.BASE_URL}/token"
            payload = {
                "username": username,
                "password": self._hash_password(password),
            }

            response = await self.client.post(url, json=payload)
            response.raise_for_status()

            data = response.json()

            if data.get("code") == 0:
                self._token = data.get("token")
                expires = data.get("tokenExpires", 0)
                self._token_expires = datetime.fromtimestamp(expires, tz=timezone.utc)
                logger.info(f"Schedules Direct authenticated, token expires: {self._token_expires}")
                return True
            else:
                logger.error(f"SD authentication failed: {data.get('message')}")
                return False

        except httpx.HTTPError as e:
            logger.error(f"SD authentication request failed: {e}")
            return False

    async def _ensure_authenticated(self) -> bool:
        """Ensure we have a valid token."""
        now = datetime.now(timezone.utc)

        if self._token and self._token_expires and now < self._token_expires:
            return True

        return await self.authenticate()

    def _get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token."""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self._token:
            headers["token"] = self._token
        return headers

    async def get_status(self) -> Optional[Dict[str, Any]]:
        """Get account status and lineup information."""
        if not await self._ensure_authenticated():
            return None

        try:
            url = f"{self.BASE_URL}/status"
            response = await self.client.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get SD status: {e}")
            return None

    async def search_headends(
        self, country: str = "ISR", postal_code: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Search for available headends (broadcast sources).

        Args:
            country: ISO 3166-1 alpha-3 country code (ISR for Israel)
            postal_code: Optional postal code for filtering
        """
        if not await self._ensure_authenticated():
            return []

        try:
            url = f"{self.BASE_URL}/headends"
            params = {"country": country}
            if postal_code:
                params["postalcode"] = postal_code

            response = await self.client.get(
                url, params=params, headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to search headends: {e}")
            return []

    async def get_lineups(self) -> List[Dict[str, Any]]:
        """Get list of subscribed lineups."""
        if not await self._ensure_authenticated():
            return []

        try:
            url = f"{self.BASE_URL}/lineups"
            response = await self.client.get(url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()
            return data.get("lineups", [])
        except httpx.HTTPError as e:
            logger.error(f"Failed to get lineups: {e}")
            return []

    async def add_lineup(self, lineup_id: str) -> bool:
        """
        Add a lineup to the account.

        Args:
            lineup_id: Lineup identifier (e.g., "ISR-0000001-DEFAULT")
        """
        if not await self._ensure_authenticated():
            return False

        try:
            url = f"{self.BASE_URL}/lineups/{lineup_id}"
            response = await self.client.put(url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()
            logger.info(f"Added lineup {lineup_id}: {data}")
            return data.get("code") == 0
        except httpx.HTTPError as e:
            logger.error(f"Failed to add lineup: {e}")
            return False

    async def get_lineup_channels(self, lineup_id: str) -> List[Dict[str, Any]]:
        """
        Get channel-to-station mapping for a lineup.

        Args:
            lineup_id: Lineup identifier

        Returns:
            List of station mappings with channel numbers and station IDs
        """
        if not await self._ensure_authenticated():
            return []

        try:
            url = f"{self.BASE_URL}/lineups/{lineup_id}"
            response = await self.client.get(url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()
            return data.get("map", [])
        except httpx.HTTPError as e:
            logger.error(f"Failed to get lineup channels: {e}")
            return []

    async def get_schedules(
        self, station_ids: List[str], days: int = 7
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get schedules for specific stations.

        Args:
            station_ids: List of station IDs
            days: Number of days to fetch (default 7)

        Returns:
            Dictionary mapping station IDs to schedule entries
        """
        if not await self._ensure_authenticated():
            return {}

        try:
            url = f"{self.BASE_URL}/schedules"

            # Build request for each station and date
            today = datetime.now(timezone.utc).date()
            request_data = []

            for station_id in station_ids:
                for day_offset in range(days):
                    date = today + timedelta(days=day_offset)
                    request_data.append({
                        "stationID": station_id,
                        "date": [date.strftime("%Y-%m-%d")],
                    })

            response = await self.client.post(
                url, json=request_data, headers=self._get_headers()
            )
            response.raise_for_status()

            schedules = response.json()

            # Organize by station ID
            result: Dict[str, List[Dict[str, Any]]] = {}
            for schedule in schedules:
                station_id = schedule.get("stationID")
                if station_id:
                    if station_id not in result:
                        result[station_id] = []
                    result[station_id].extend(schedule.get("programs", []))

            return result

        except httpx.HTTPError as e:
            logger.error(f"Failed to get schedules: {e}")
            return {}

    async def get_programs(
        self, program_ids: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Get detailed program metadata.

        Args:
            program_ids: List of program IDs (max 5000)

        Returns:
            Dictionary mapping program IDs to metadata
        """
        if not await self._ensure_authenticated():
            return {}

        if len(program_ids) > 5000:
            logger.warning("Truncating program IDs to 5000 (API limit)")
            program_ids = program_ids[:5000]

        try:
            url = f"{self.BASE_URL}/programs"
            response = await self.client.post(
                url, json=program_ids, headers=self._get_headers()
            )
            response.raise_for_status()

            programs = response.json()

            # Organize by program ID
            result = {}
            for program in programs:
                prog_id = program.get("programID")
                if prog_id:
                    result[prog_id] = program

            return result

        except httpx.HTTPError as e:
            logger.error(f"Failed to get programs: {e}")
            return {}

    async def ingest_channel_epg(
        self, channel_name: str, channel_id: str, station_id: str
    ) -> int:
        """
        Ingest EPG data for a specific channel.

        Args:
            channel_name: Channel name for logging
            channel_id: MongoDB channel ID
            station_id: Schedules Direct station ID

        Returns:
            Number of EPG entries created
        """
        # Get schedules
        schedules = await self.get_schedules([station_id])
        station_schedules = schedules.get(station_id, [])

        if not station_schedules:
            logger.warning(f"No schedules found for {channel_name} (station {station_id})")
            return 0

        # Collect program IDs
        program_ids = [s.get("programID") for s in station_schedules if s.get("programID")]

        # Get program details
        programs = await self.get_programs(program_ids)

        created = 0
        for schedule in station_schedules:
            try:
                program_id = schedule.get("programID")
                if not program_id:
                    continue

                program = programs.get(program_id, {})

                # Parse times
                air_datetime = schedule.get("airDateTime")
                duration = schedule.get("duration", 3600)  # Default 1 hour

                if not air_datetime:
                    continue

                start_time = datetime.fromisoformat(air_datetime.replace("Z", "+00:00"))
                end_time = start_time + timedelta(seconds=duration)

                # Check if entry already exists
                existing = await EPGEntry.find_one({
                    "channel_id": channel_id,
                    "start_time": start_time,
                })

                if existing:
                    continue

                # Extract program details
                titles = program.get("titles", [])
                title = titles[0].get("title120") if titles else "Unknown"

                descriptions = program.get("descriptions", {})
                desc_list = descriptions.get("description1000", [])
                description = desc_list[0].get("description") if desc_list else ""

                genres = program.get("genres", [])

                # Get thumbnail if available
                thumbnail = None
                if program.get("hasImageArtwork"):
                    # Would need separate API call to get artwork
                    pass

                # Create EPG entry
                entry = EPGEntry(
                    channel_id=channel_id,
                    title=title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    category=genres[0] if genres else "Entertainment",
                    thumbnail=thumbnail,
                    cast=program.get("cast", []),
                    genres=genres,
                    rating=program.get("contentRating", [{}])[0].get("code") if program.get("contentRating") else None,
                    director=None,
                    recording_id=None,
                )

                await entry.insert()
                created += 1

            except Exception as e:
                logger.error(f"Failed to create EPG entry: {e}")
                continue

        logger.info(f"Created {created} EPG entries for {channel_name}")
        return created

    async def discover_israeli_lineups(self) -> List[Dict[str, Any]]:
        """
        Discover available Israeli lineups.

        Returns:
            List of available headends/lineups for Israel
        """
        logger.info("Discovering Israeli lineups...")
        headends = await self.search_headends(country="ISR")

        if headends:
            logger.info(f"Found {len(headends)} Israeli headends")
            for headend in headends:
                logger.info(f"  - {headend.get('headend')}: {headend.get('location')}")
        else:
            logger.warning("No Israeli headends found")

        return headends

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Singleton instance
schedules_direct_service = SchedulesDirectService()

"""
EPG Ingestion Service
Fetches real EPG data from external sources and updates the database
"""

import asyncio
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from app.models.content import EPGEntry, LiveChannel

logger = logging.getLogger(__name__)


class EPGIngestionService:
    """Service for ingesting real EPG data from external sources"""

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
        )

    async def ingest_kan11_epg(self) -> int:
        """
        Ingest EPG data for Kan 11 from official source

        Returns:
            Number of programs ingested
        """
        logger.info("Starting Kan 11 EPG ingestion")

        try:
            # Get Kan 11 channel
            kan11 = await LiveChannel.find_one({"name": "כאן 11"})
            if not kan11:
                logger.error("Kan 11 channel not found in database")
                return 0

            # Fetch schedule from Kan.org.il
            # Note: This URL may require VPN or Israeli IP
            url = "https://www.kan.org.il/tv-guide/api/schedule"

            try:
                response = await self.client.get(
                    url,
                    params={
                        "station": "kan11",
                        "date": datetime.now().strftime("%Y-%m-%d"),
                    },
                )
                response.raise_for_status()
                data = response.json()

                # Parse and store programs
                programs_created = await self._process_kan11_schedule(
                    str(kan11.id), data
                )

                logger.info(
                    f"Successfully ingested {programs_created} programs for Kan 11"
                )
                return programs_created

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 403:
                    logger.warning(
                        "Kan.org.il returned 403 - may require Israeli IP/VPN"
                    )
                    # Fall back to alternative source
                    return await self._ingest_from_alternative_source(str(kan11.id))
                raise

        except Exception as e:
            logger.error(f"Failed to ingest Kan 11 EPG: {str(e)}")
            return 0

    async def _process_kan11_schedule(
        self, channel_id: str, schedule_data: Dict[str, Any]
    ) -> int:
        """Process Kan 11 schedule data and create EPG entries"""
        programs_created = 0

        for program in schedule_data.get("programs", []):
            try:
                # Parse program data
                start_time = datetime.fromisoformat(
                    program["start_time"].replace("Z", "+00:00")
                )
                end_time = datetime.fromisoformat(
                    program["end_time"].replace("Z", "+00:00")
                )

                # Check if entry already exists
                existing = await EPGEntry.find_one(
                    {
                        "channel_id": channel_id,
                        "start_time": start_time,
                        "title": program.get("title", ""),
                    }
                )

                if existing:
                    continue

                # Create new EPG entry
                entry = EPGEntry(
                    channel_id=channel_id,
                    title=program.get("title", ""),
                    description=program.get("description", ""),
                    start_time=start_time,
                    end_time=end_time,
                    category=program.get("category", ""),
                    thumbnail=program.get("image"),
                    cast=program.get("cast", []),
                    genres=program.get("genres", []),
                    rating=program.get("rating"),
                    director=program.get("director"),
                    recording_id=None,
                )

                await entry.insert()
                programs_created += 1

            except Exception as e:
                logger.error(f"Failed to process program: {str(e)}")
                continue

        return programs_created

    async def _ingest_from_alternative_source(self, channel_id: str) -> int:
        """
        Fetch from alternative EPG sources when primary fails

        This method attempts to fetch EPG data from:
        1. XMLTV Israel community feeds
        2. EPG.pw aggregator
        3. iptv-org EPG database
        """
        logger.info("Attempting to fetch from alternative EPG sources")

        # Try XMLTV format sources
        xmltv_urls = [
            "https://raw.githubusercontent.com/epgshare01/share01/master/epg_ripper_IL1.xml",
            "https://raw.githubusercontent.com/epgshare01/share01/master/guide_israel.xml",
        ]

        for url in xmltv_urls:
            try:
                response = await self.client.get(url)
                if response.status_code == 200:
                    programs = await self._parse_xmltv(channel_id, response.text)
                    if programs > 0:
                        logger.info(
                            f"Successfully fetched {programs} programs from {url}"
                        )
                        return programs
            except Exception as e:
                logger.debug(f"Failed to fetch from {url}: {str(e)}")
                continue

        logger.warning("All alternative EPG sources failed")
        return 0

    async def _parse_xmltv(self, channel_id: str, xml_content: str) -> int:
        """Parse XMLTV format EPG data"""
        try:
            root = ET.fromstring(xml_content)
            programs_created = 0

            # Find programs for this channel
            # XMLTV uses channel IDs like "kan11.il"
            for programme in root.findall(".//programme[@channel='kan11.il']"):
                try:
                    start_str = programme.get("start")
                    stop_str = programme.get("stop")

                    # Parse XMLTV datetime format: YYYYMMDDHHmmss +TZ
                    start_time = datetime.strptime(start_str[:14], "%Y%m%d%H%M%S")
                    end_time = datetime.strptime(stop_str[:14], "%Y%m%d%H%M%S")

                    title_elem = programme.find("title")
                    desc_elem = programme.find("desc")
                    category_elem = programme.find("category")

                    # Check if exists
                    existing = await EPGEntry.find_one(
                        {"channel_id": channel_id, "start_time": start_time}
                    )

                    if existing:
                        continue

                    entry = EPGEntry(
                        channel_id=channel_id,
                        title=title_elem.text if title_elem is not None else "Untitled",
                        description=desc_elem.text if desc_elem is not None else "",
                        start_time=start_time,
                        end_time=end_time,
                        category=(
                            category_elem.text if category_elem is not None else ""
                        ),
                        thumbnail=None,
                        cast=[],
                        genres=[],
                        rating=None,
                        director=None,
                        recording_id=None,
                    )

                    await entry.insert()
                    programs_created += 1

                except Exception as e:
                    logger.error(f"Failed to parse XMLTV program: {str(e)}")
                    continue

            return programs_created

        except ET.ParseError as e:
            logger.error(f"Failed to parse XMLTV: {str(e)}")
            return 0

    async def ingest_all_channels(self) -> Dict[str, int]:
        """
        Ingest EPG data for all active channels

        Returns:
            Dictionary mapping channel names to number of programs ingested
        """
        results = {}

        # Get all active channels
        channels = await LiveChannel.find({"is_active": True}).to_list()

        # Channel mapping to EPG IDs used in XMLTV feeds
        channel_mapping = {
            "כאן 11": "kan11.il",
            "קשת 12": "keshet12.il",
            "רשת 13": "reshet13.il",
            "ערוץ 14": "channel14.il",
            "i24NEWS Hebrew": "i24news.il",
            "כאן חינוכית": "kanhinuchit.il",
        }

        for channel in channels:
            logger.info(f"Fetching EPG for {channel.name}")

            xmltv_id = channel_mapping.get(channel.name)
            if not xmltv_id:
                logger.warning(f"No XMLTV ID mapping for {channel.name}")
                results[channel.name] = 0
                continue

            # Try to fetch from multiple sources
            count = await self._fetch_channel_epg(
                str(channel.id), channel.name, xmltv_id
            )
            results[channel.name] = count

        logger.info(f"EPG ingestion complete: {results}")
        return results

    async def _fetch_channel_epg(
        self, channel_id: str, channel_name: str, xmltv_id: str
    ) -> int:
        """Fetch EPG for a specific channel from available sources"""

        # Try Israeli sources with VPN
        israeli_sources = [
            f"https://www.kan.org.il/api/schedule?station={xmltv_id.split('.')[0]}",
            f"https://api.mako.co.il/v2/epg/{xmltv_id}",
        ]

        for url in israeli_sources:
            try:
                response = await self.client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    count = await self._process_generic_schedule(channel_id, data)
                    if count > 0:
                        logger.info(
                            f"Fetched {count} programs for {channel_name} from {url}"
                        )
                        return count
            except Exception as e:
                logger.debug(f"Failed to fetch from {url}: {str(e)}")
                continue

        # Fall back to XMLTV sources
        return await self._fetch_from_xmltv(channel_id, xmltv_id)

    async def _fetch_from_xmltv(self, channel_id: str, xmltv_id: str) -> int:
        """Fetch from XMLTV sources"""
        xmltv_urls = [
            "https://raw.githubusercontent.com/epgshare01/share01/master/epg_ripper_IL1.xml.gz",
            "https://iptv-org.github.io/epg/guides/il/tv.schedulesdirect.org.epg.xml",
        ]

        for url in xmltv_urls:
            try:
                response = await self.client.get(url)
                if response.status_code == 200:
                    content = response.text
                    count = await self._parse_xmltv_for_channel(
                        channel_id, xmltv_id, content
                    )
                    if count > 0:
                        return count
            except Exception as e:
                logger.debug(f"Failed XMLTV fetch from {url}: {str(e)}")
                continue

        return 0

    async def _parse_xmltv_for_channel(
        self, channel_id: str, xmltv_id: str, xml_content: str
    ) -> int:
        """Parse XMLTV for specific channel"""
        try:
            root = ET.fromstring(xml_content)
            programs_created = 0

            for programme in root.findall(f".//programme[@channel='{xmltv_id}']"):
                try:
                    start_str = programme.get("start")
                    stop_str = programme.get("stop")

                    start_time = datetime.strptime(start_str[:14], "%Y%m%d%H%M%S")
                    end_time = datetime.strptime(stop_str[:14], "%Y%m%d%H%M%S")

                    title_elem = programme.find("title")
                    desc_elem = programme.find("desc")
                    category_elem = programme.find("category")

                    existing = await EPGEntry.find_one(
                        {"channel_id": channel_id, "start_time": start_time}
                    )

                    if existing:
                        continue

                    entry = EPGEntry(
                        channel_id=channel_id,
                        title=title_elem.text if title_elem is not None else "Untitled",
                        description=desc_elem.text if desc_elem is not None else "",
                        start_time=start_time,
                        end_time=end_time,
                        category=(
                            category_elem.text if category_elem is not None else ""
                        ),
                        thumbnail=None,
                        cast=[],
                        genres=[],
                        rating=None,
                        director=None,
                        recording_id=None,
                    )

                    await entry.insert()
                    programs_created += 1

                except Exception as e:
                    logger.error(f"Failed to parse XMLTV program: {str(e)}")
                    continue

            return programs_created

        except ET.ParseError as e:
            logger.error(f"Failed to parse XMLTV: {str(e)}")
            return 0

    async def _process_generic_schedule(
        self, channel_id: str, schedule_data: Dict[str, Any]
    ) -> int:
        """Process generic schedule data from various Israeli sources"""
        programs_created = 0

        # Handle different response formats
        programs = schedule_data.get("programs", schedule_data.get("schedule", []))

        for program in programs:
            try:
                # Try different time field names
                start_time_str = (
                    program.get("start_time")
                    or program.get("startTime")
                    or program.get("start")
                )
                end_time_str = (
                    program.get("end_time")
                    or program.get("endTime")
                    or program.get("end")
                )

                if not start_time_str or not end_time_str:
                    continue

                start_time = datetime.fromisoformat(
                    start_time_str.replace("Z", "+00:00")
                )
                end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))

                existing = await EPGEntry.find_one(
                    {"channel_id": channel_id, "start_time": start_time}
                )

                if existing:
                    continue

                entry = EPGEntry(
                    channel_id=channel_id,
                    title=program.get("title") or program.get("name") or "Untitled",
                    description=program.get("description") or program.get("desc") or "",
                    start_time=start_time,
                    end_time=end_time,
                    category=program.get("category") or program.get("genre") or "",
                    thumbnail=program.get("image") or program.get("thumbnail"),
                    cast=program.get("cast", []),
                    genres=program.get("genres", []),
                    rating=program.get("rating"),
                    director=program.get("director"),
                    recording_id=None,
                )

                await entry.insert()
                programs_created += 1

            except Exception as e:
                logger.error(f"Failed to process program: {str(e)}")
                continue

        return programs_created

    async def cleanup_old_epg(self, days_to_keep: int = 7):
        """Remove EPG entries older than specified days"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)

        result = await EPGEntry.find({"end_time": {"$lt": cutoff_date}}).delete()

        logger.info(f"Cleaned up {result.deleted_count} old EPG entries")
        return result.deleted_count

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Singleton instance
epg_ingestion_service = EPGIngestionService()

"""
Israeli Radio Stations Update Script
Fetches and updates all Israeli radio stations from the digital.100fm.co.il channel list.

This script:
1. Fetches the official channel list from digital.100fm.co.il
2. Parses the XML for all radio stations
3. Updates existing stations with correct stream URLs
4. Creates new stations if they don't exist
5. Maintains proper ordering and metadata

Usage:
    python -m app.scripts.update_israeli_radio_stations
"""

import asyncio
import logging
import xml.etree.ElementTree as ET
from typing import Optional
from urllib.request import urlopen

from app.models.content import RadioStation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Mapping of Hebrew names to English names and metadata
STATION_METADATA = {
    "מבזק חדשות 12": {
        "en": "News 12",
        "genre": "news",
        "tag": "national",
    },
    "רדיוס 100fm": {
        "en": "100FM",
        "genre": "pop",
        "tag": "local",
    },
    "רדיוס נוסטלגי": {
        "en": "Nostalgia 96.3FM",
        "genre": "oldies",
        "tag": "local",
    },
    "רדיו לב המדינה 91fm": {
        "en": "Lev Hamedina 91FM",
        "genre": "mixed",
        "tag": "local",
    },
    "רדיו פרוויה 89.1fm": {
        "en": "Pervoia 89.1FM",
        "genre": "russian",
        "tag": "local",
    },
    "כאן ב": {
        "en": "Kan Bet",
        "genre": "mixed",
        "tag": "national",
    },
    "גלצ 96.6fm": {
        "en": "Glz 96.6FM",
        "genre": "news",
        "tag": "national",
    },
    "כאן 88": {
        "en": "Kan 88",
        "genre": "mixed",
        "tag": "national",
    },
    "כאן ג": {
        "en": "Kan Gimel",
        "genre": "mixed",
        "tag": "national",
    },
    "fm 102 קול הים האדום": {
        "en": "Red Sea Radio 102FM",
        "genre": "mixed",
        "tag": "local",
    },
    "קול ברמה 92.1fm": {
        "en": "Kol Barama 92.1FM",
        "genre": "mixed",
        "tag": "local",
    },
    "כאן מורשת": {
        "en": "Kan Moreshet",
        "genre": "culture",
        "tag": "national",
    },
    "גלגלצ 91.8fm": {
        "en": "Glglz 91.8FM",
        "genre": "music",
        "tag": "national",
    },
    "קול חי 93fm": {
        "en": "Kol Chai 93FM",
        "genre": "religious",
        "tag": "local",
    },
    "רדיו גלי ישראל": {
        "en": "Galei Israel",
        "genre": "mixed",
        "tag": "local",
    },
    "רדיו דרום": {
        "en": "Darom Radio",
        "genre": "mixed",
        "tag": "local",
    },
    "כאן תרבות": {
        "en": "Kan Tarbut",
        "genre": "culture",
        "tag": "national",
    },
    "קול רגע 96fm": {
        "en": "Kol Rega 96FM",
        "genre": "music",
        "tag": "local",
    },
    "רדיו ללא הפסקה 103fm": {
        "en": "Non-Stop Radio 103FM",
        "genre": "pop",
        "tag": "local",
    },
    "כאן קול המוסיקה": {
        "en": "Kan Musica",
        "genre": "music",
        "tag": "national",
    },
    "רדיו נאס": {
        "en": "Radio Nas",
        "genre": "hip-hop",
        "tag": "local",
    },
    "כאן רקע": {
        "en": "Kan Reka",
        "genre": "ambient",
        "tag": "national",
    },
    "ירושלים 101fm": {
        "en": "Jerusalem 101FM",
        "genre": "mixed",
        "tag": "local",
    },
    "רדיו אלשמאס": {
        "en": "Radio Alshmmas",
        "genre": "arabic",
        "tag": "local",
    },
    "רדיו תל אביב": {
        "en": "Tel Aviv Radio",
        "genre": "mixed",
        "tag": "local",
    },
    "רדיו צפון ללא הפסקה": {
        "en": "North Non-Stop Radio",
        "genre": "pop",
        "tag": "local",
    },
    "חיפה 107.5fm": {
        "en": "Haifa 107.5FM",
        "genre": "mixed",
        "tag": "local",
    },
    "מכאן": {
        "en": "Makan",
        "genre": "music",
        "tag": "national",
    },
    "רדיו אמצע הדרך": {
        "en": "Emtza Haderech",
        "genre": "mixed",
        "tag": "local",
    },
    "רדיו מהות החיים": {
        "en": "Mahut Hachaim",
        "genre": "lifestyle",
        "tag": "internet",
    },
    "רדיו הקצה": {
        "en": "Katze Radio",
        "genre": "alternative",
        "tag": "internet",
    },
    "אקו 99fm": {
        "en": "Eco 99FM",
        "genre": "music",
        "tag": "local",
    },
    "רדיו חם אש": {
        "en": "Ham Esh Radio",
        "genre": "music",
        "tag": "local",
    },
}


async def fetch_channel_list() -> Optional[ET.Element]:
    """Fetch and parse the channel list XML from digital.100fm.co.il"""
    try:
        logger.info("Fetching channel list from digital.100fm.co.il...")
        url = "http://digital.100fm.co.il/ChannelList_Radio.xml"
        with urlopen(url, timeout=10) as response:
            xml_data = response.read()
        root = ET.fromstring(xml_data)
        logger.info("✓ Channel list fetched successfully")
        return root
    except Exception as e:
        logger.error(f"✗ Failed to fetch channel list: {e}")
        return None


async def update_radio_stations():
    """Main update function"""
    logger.info("=" * 70)
    logger.info("ISRAELI RADIO STATIONS UPDATE")
    logger.info("=" * 70)

    # Fetch channel list
    root = await fetch_channel_list()
    if not root:
        logger.error("Cannot proceed without channel list")
        return

    # Parse channels from XML
    channels = root.findall("Channel")
    logger.info(f"Found {len(channels)} channels in XML")

    # Get existing stations
    existing_stations = await RadioStation.find().to_list()
    existing_by_name = {station.name: station for station in existing_stations}
    logger.info(f"Found {len(existing_stations)} existing stations in database")

    # Process each channel
    created = 0
    updated = 0
    skipped = 0

    for idx, channel in enumerate(channels, 1):
        try:
            name_he = channel.findtext("name")
            if not name_he:
                logger.warning(f"[{idx}] Skipping channel without name")
                skipped += 1
                continue

            feed_url = channel.findtext("Feed")
            if not feed_url:
                logger.warning(f"[{idx}] Skipping {name_he} - no Feed URL")
                skipped += 1
                continue

            # Get metadata
            metadata = STATION_METADATA.get(name_he, {})
            name_en = metadata.get("en", name_he)
            genre = metadata.get("genre", "mixed")

            # Check if station exists
            if name_he in existing_by_name:
                # Update existing station
                station = existing_by_name[name_he]
                old_url = station.stream_url

                station.stream_url = feed_url
                station.stream_type = "hls"
                station.genre = genre
                station.is_active = True

                # Get image if available
                img = channel.findtext("img")
                if img:
                    station.logo = img

                await station.save()

                if old_url != feed_url:
                    logger.info(
                        f"[{idx}] ✓ UPDATED: {name_en} ({name_he})"
                    )
                    logger.info(f"     URL changed: {old_url[:50]}... → {feed_url[:50]}...")
                else:
                    logger.info(f"[{idx}] ✓ VERIFIED: {name_en} ({name_he})")
                updated += 1
            else:
                # Create new station
                img = channel.findtext("img")
                station = RadioStation(
                    name=name_he,
                    name_en=name_en,
                    stream_url=feed_url,
                    stream_type="hls",
                    genre=genre,
                    logo=img,
                    culture_id="israeli",
                    is_active=True,
                    order=idx,
                )
                await station.insert()
                logger.info(f"[{idx}] ✓ CREATED: {name_en} ({name_he})")
                created += 1

        except Exception as e:
            logger.error(f"[{idx}] ✗ Error processing channel: {e}")
            skipped += 1

    # Summary report
    logger.info("=" * 70)
    logger.info("SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Created:  {created} new stations")
    logger.info(f"Updated:  {updated} existing stations")
    logger.info(f"Skipped:  {skipped} channels (errors or missing data)")
    logger.info(f"Total:    {created + updated} stations active")
    logger.info("=" * 70)


def main():
    """Entry point"""
    asyncio.run(update_radio_stations())


if __name__ == "__main__":
    main()

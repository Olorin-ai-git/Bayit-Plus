"""
RokuIL Live-From-Israel Channel Import Script
Imports working TV channels and radio stations from the RokuIL/Live-From-Israel repository.

This script:
1. Adds verified working TV channels to the live_channels collection
2. Adds verified working radio stations to the radio_stations collection
3. Skips channels that are offline, require auth, or are inaccessible
4. Updates existing channels if they already exist

Usage:
    cd backend
    poetry run python -m app.scripts.import_rokuil_channels
"""

import asyncio
import logging

from app.core.database import connect_to_mongo
from app.models.content import LiveChannel, RadioStation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Verified working TV channels (tested 2026-02-01)
TV_CHANNELS = [
    {
        "name": "רשת 13",
        "name_en": "Reshet 13",
        "description": "ערוץ החדשות והבידור של רשת",
        "description_en": "Israel's leading news and entertainment channel",
        "stream_url": "https://d18b0e6mopany4.cloudfront.net/out/v1/2f2bc414a3db4698a8e94b89eaf2da2a/index.m3u8",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/Reshet%2013.jpg",
        "category": "news",
        "culture_id": "israeli",
        "supports_live_subtitles": True,
        "primary_language": "he",
        "order": 1,
    },
    {
        "name": "CNN",
        "name_en": "CNN",
        "description": "Cable News Network - חדשות בינלאומיות",
        "description_en": "Cable News Network - International News",
        "stream_url": "https://d3bp6dwmpbdajl.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-ury0meh5m4nzm/index.m3u8",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/CNN.png",
        "category": "news",
        "culture_id": "international",
        "supports_live_subtitles": True,
        "primary_language": "en",
        "order": 10,
    },
    {
        "name": "ABC News",
        "name_en": "ABC News",
        "description": "רשת החדשות האמריקאית ABC",
        "description_en": "American Broadcasting Company News",
        "stream_url": "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/ABCNews.jpg",
        "category": "news",
        "culture_id": "international",
        "supports_live_subtitles": True,
        "primary_language": "en",
        "order": 11,
    },
    {
        "name": "King 5 News",
        "name_en": "King 5 News",
        "description": "חדשות סיאטל - ערוץ מקומי אמריקאי",
        "description_en": "Seattle local news channel",
        "stream_url": "https://livevideo01.king5.com/hls/live/2006665/live/live.m3u8",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/King5News.png",
        "category": "news",
        "culture_id": "international",
        "supports_live_subtitles": True,
        "primary_language": "en",
        "order": 12,
    },
]

# Verified working radio stations (tested 2026-02-01)
RADIO_STATIONS = [
    {
        "name": "גלצ",
        "name_en": "Galaz",
        "description": "גלי צה״ל - רדיו צבאי",
        "description_en": "IDF Radio - Military Radio",
        "stream_url": "http://glzwizzlv.bynetcdn.com/glz_mp3",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/Gltz.jpg",
        "genre": "news",
        "culture_id": "israeli",
        "order": 1,
    },
    {
        "name": "גלגלצ",
        "name_en": "Galgalaz",
        "description": "גלגלצ - מוזיקה ובידור",
        "description_en": "Galgalaz - Music and Entertainment",
        "stream_url": "http://glzwizzlv.bynetcdn.com/glglz_mp3",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/Glgltz.jpg",
        "genre": "music",
        "culture_id": "israeli",
        "order": 2,
    },
    {
        "name": "כאן 88",
        "name_en": "88FM",
        "description": "כאן 88 - תחנת הרדיו של כאן",
        "description_en": "Kan 88 - Israeli Public Broadcasting",
        "stream_url": "http://kanliveicy.media.kan.org.il/icy/kan88_mp3",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/ipbc_radio_88.png",
        "genre": "mixed",
        "culture_id": "israeli",
        "order": 3,
    },
    {
        "name": "אקו 99",
        "name_en": "99FM Echo",
        "description": "אקו 99 - מוזיקה ובידור",
        "description_en": "Echo 99FM - Music and Entertainment",
        "stream_url": "http://99.livecdn.biz/99fm",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/eco99fm.png",
        "genre": "music",
        "culture_id": "israeli",
        "order": 4,
    },
    {
        "name": "רדיוס 100",
        "name_en": "100FM Radius",
        "description": "רדיוס 100FM - מוזיקה",
        "description_en": "Radius 100FM - Music",
        "stream_url": "https://cdn.cybercdn.live/Radios_100FM/Audio/playlist.m3u8",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/radius_100fm.png",
        "genre": "music",
        "stream_type": "hls",
        "culture_id": "israeli",
        "order": 5,
    },
    {
        "name": "102FM תל אביב",
        "name_en": "102FM Tel-Aviv",
        "description": "רדיו תל אביב 102FM",
        "description_en": "Tel Aviv Radio 102FM",
        "stream_url": "https://cdn88.mediacast.co.il/102fm-tlv/102fm_aac/icecast.audio",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/telaviv102fm.png",
        "genre": "mixed",
        "culture_id": "israeli",
        "order": 6,
    },
    {
        "name": "103FM ללא הפסקה",
        "name_en": "103FM Lelo Hafsaka",
        "description": "103FM - ללא הפסקה",
        "description_en": "103FM - Non-Stop Radio",
        "stream_url": "https://cdn.cybercdn.live/103FM/Live/icecast.audio",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/103fm.png",
        "genre": "pop",
        "culture_id": "israeli",
        "order": 7,
    },
    {
        "name": "107.5FM חיפה",
        "name_en": "107.5FM Haifa",
        "description": "רדיו חיפה 107.5FM",
        "description_en": "Haifa Radio 107.5FM",
        "stream_url": "http://ads11.livecdn.biz:80/radiohaifa",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/haifa_107.png",
        "genre": "mixed",
        "culture_id": "israeli",
        "order": 8,
    },
    {
        "name": "נוסטלגיה",
        "name_en": "Nostalgia",
        "description": "רדיו נוסטלגיה - להיטי העבר",
        "description_en": "Nostalgia Radio - Classic Hits",
        "stream_url": "http://194.213.4.197:8000/;",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/nostalgia_radio.png",
        "genre": "oldies",
        "culture_id": "israeli",
        "order": 9,
    },
    {
        "name": "כאן קול המוסיקה",
        "name_en": "Kol Hamusica",
        "description": "כאן קול המוסיקה - מוזיקה קלאסית",
        "description_en": "Kan Voice of Music - Classical Music",
        "stream_url": "http://kanliveicy.media.kan.org.il/icy/kankolhamusica_mp3",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/ipbc_radio_musika.png",
        "genre": "classical",
        "culture_id": "israeli",
        "order": 10,
    },
    {
        "name": "כאן תרבות",
        "name_en": "Kan Tarbut",
        "description": "כאן תרבות - תרבות וחברה",
        "description_en": "Kan Culture - Culture and Society",
        "stream_url": "http://kanliveicy.media.kan.org.il/icy/kantarbut_mp3",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/ipbc_radio_tarbut.png",
        "genre": "culture",
        "culture_id": "israeli",
        "order": 11,
    },
    {
        "name": "רשת ג",
        "name_en": "Reshet Gimel",
        "description": "רשת ג - מוזיקה ישראלית",
        "description_en": "Reshet Gimel - Israeli Music",
        "stream_url": "http://kanliveicy.media.kan.org.il/icy/kangimmel_mp3",
        "logo": "https://raw.githubusercontent.com/RokuIL/Live-From-Israel/master/Logos/ipbc_radio_gimmel.png",
        "genre": "israeli",
        "culture_id": "israeli",
        "order": 12,
    },
]


async def import_tv_channels():
    """Import verified working TV channels."""
    logger.info("=" * 70)
    logger.info("IMPORTING TV CHANNELS")
    logger.info("=" * 70)

    created = 0
    updated = 0

    for channel_data in TV_CHANNELS:
        name_en = channel_data["name_en"]

        # Check if channel already exists by stream URL or name
        existing = await LiveChannel.find_one(
            {"$or": [
                {"stream_url": channel_data["stream_url"]},
                {"name_en": name_en},
                {"name": channel_data["name"]},
            ]}
        )

        if existing:
            # Update existing channel
            for key, value in channel_data.items():
                setattr(existing, key, value)
            existing.is_active = True
            existing.stream_type = "hls"
            await existing.save()
            logger.info(f"  UPDATED: {name_en}")
            updated += 1
        else:
            # Create new channel
            channel = LiveChannel(
                **channel_data,
                stream_type="hls",
                is_active=True,
                requires_subscription="basic",
            )
            await channel.insert()
            logger.info(f"  CREATED: {name_en}")
            created += 1

    logger.info(f"\nTV Channels: {created} created, {updated} updated")
    return created, updated


async def import_radio_stations():
    """Import verified working radio stations."""
    logger.info("=" * 70)
    logger.info("IMPORTING RADIO STATIONS")
    logger.info("=" * 70)

    created = 0
    updated = 0

    for station_data in RADIO_STATIONS:
        name_en = station_data["name_en"]
        stream_type = station_data.pop("stream_type", "audio")

        # Check if station already exists by stream URL or name
        existing = await RadioStation.find_one(
            {"$or": [
                {"stream_url": station_data["stream_url"]},
                {"name_en": name_en},
                {"name": station_data["name"]},
            ]}
        )

        if existing:
            # Update existing station
            for key, value in station_data.items():
                setattr(existing, key, value)
            existing.stream_type = stream_type
            existing.is_active = True
            await existing.save()
            logger.info(f"  UPDATED: {name_en}")
            updated += 1
        else:
            # Create new station
            station = RadioStation(
                **station_data,
                stream_type=stream_type,
                is_active=True,
            )
            await station.insert()
            logger.info(f"  CREATED: {name_en}")
            created += 1

    logger.info(f"\nRadio Stations: {created} created, {updated} updated")
    return created, updated


async def main():
    """Main import function."""
    logger.info("=" * 70)
    logger.info("RokuIL CHANNEL IMPORT")
    logger.info("Source: github.com/RokuIL/Live-From-Israel")
    logger.info("=" * 70)

    # Initialize database connection
    await connect_to_mongo()

    # Import TV channels
    tv_created, tv_updated = await import_tv_channels()

    # Import radio stations
    radio_created, radio_updated = await import_radio_stations()

    # Summary
    logger.info("=" * 70)
    logger.info("IMPORT COMPLETE")
    logger.info("=" * 70)
    logger.info(f"TV Channels:     {tv_created} created, {tv_updated} updated")
    logger.info(f"Radio Stations:  {radio_created} created, {radio_updated} updated")
    logger.info(f"Total:           {tv_created + radio_created} new entries")
    logger.info("=" * 70)
    logger.info("\nNOTE: The following channels were NOT imported due to issues:")
    logger.info("  - Kan 11: Master manifest OK but chunklist returns 404 (offline)")
    logger.info("  - Keshet 12: Requires authentication ticket")
    logger.info("  - i24 News: JWT token expired")
    logger.info("  - Big Brother: Connection timeout")
    logger.info("  - Sport 1-5, ESPN, Sky Sports: 403 Forbidden")
    logger.info("  - Fox News: 403 Forbidden")
    logger.info("  - Reshet Bet: 404 Not Found")
    logger.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Direct MongoDB Update Script for Israeli Radio Stations
This script updates radio stations without requiring the full app context.

Usage:
    python scripts/update_radio_stations_direct.py

Environment Variables:
    MONGODB_CONNECTION_STRING - MongoDB connection string (default: mongodb://localhost:27017)
    MONGODB_DATABASE - Database name (default: bayit-plus)
"""

import asyncio
import logging
import os
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional
from urllib.request import urlopen

from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Channel data extracted from digital.100fm.co.il/ChannelList_Radio.xml
CHANNELS_DATA = [
    {
        "name": "מבזק חדשות 12",
        "name_en": "News 12",
        "feed": "http://newsredirect.azurewebsites.net/api/HttpTriggerNewsRedirect?code=a0oI8hfbcn254SZOu4CN8Pm5vUR/L2uFoaRILW0ajQ2bAoZnm3Tmuw==",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/news12.png",
        "genre": "news",
        "order": 1,
    },
    {
        "name": "רדיוס 100fm",
        "name_en": "100FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Radios100FM/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/100fm.png",
        "genre": "pop",
        "order": 2,
    },
    {
        "name": "רדיוס נוסטלגי",
        "name_en": "Nostalgia 96.3FM",
        "feed": "https://cdn.cybercdn.live/Radios_Radio_App/Nostalgia_963fm/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/963fm.png",
        "genre": "oldies",
        "order": 3,
    },
    {
        "name": "רדיו לב המדינה 91fm",
        "name_en": "Lev Hamedina 91FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Lev_Hamedina/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/91fm.png",
        "genre": "mixed",
        "order": 4,
    },
    {
        "name": "רדיו פרוויה 89.1fm",
        "name_en": "Pervoia 89.1FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Pervoia/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/891fm.png",
        "genre": "russian",
        "order": 5,
    },
    {
        "name": "כאן ב",
        "name_en": "Kan Bet",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Bet/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/95fm.png",
        "genre": "mixed",
        "order": 6,
    },
    {
        "name": "גלצ 96.6fm",
        "name_en": "Glz 96.6FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Glz/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/966fm.png",
        "genre": "news",
        "order": 7,
    },
    {
        "name": "כאן 88",
        "name_en": "Kan 88",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_88/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/88fm.png",
        "genre": "mixed",
        "order": 8,
    },
    {
        "name": "כאן ג",
        "name_en": "Kan Gimel",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Gimmel/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/897fm.png",
        "genre": "mixed",
        "order": 9,
    },
    {
        "name": "fm 102 קול הים האדום",
        "name_en": "Red Sea Radio 102FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Eilat_Radio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1022fm.png",
        "genre": "mixed",
        "order": 10,
    },
    {
        "name": "קול ברמה 92.1fm",
        "name_en": "Kol Barama 92.1FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kol_Barama/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/921fm.png",
        "genre": "mixed",
        "order": 11,
    },
    {
        "name": "כאן מורשת",
        "name_en": "Kan Moreshet",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Moreshet/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/908fm.png",
        "genre": "culture",
        "order": 12,
    },
    {
        "name": "גלגלצ 91.8fm",
        "name_en": "Glglz 91.8FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Glglz/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/918fm.png",
        "genre": "music",
        "order": 13,
    },
    {
        "name": "קול חי 93fm",
        "name_en": "Kol Chai 93FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kol_Hai/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/93fm.png",
        "genre": "religious",
        "order": 14,
    },
    {
        "name": "רדיו גלי ישראל",
        "name_en": "Galei Israel",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Galei_Israel/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/94fm.png",
        "genre": "mixed",
        "order": 15,
    },
    {
        "name": "רדיו דרום",
        "name_en": "Darom Radio",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Darom_Radio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/958fm.png",
        "genre": "mixed",
        "order": 16,
    },
    {
        "name": "כאן תרבות",
        "name_en": "Kan Tarbut",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Tarbut/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1049fm.png",
        "genre": "culture",
        "order": 17,
    },
    {
        "name": "קול רגע 96fm",
        "name_en": "Kol Rega 96FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kol_Rega/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/96fm.png",
        "genre": "music",
        "order": 18,
    },
    {
        "name": "רדיו ללא הפסקה 103fm",
        "name_en": "Non-Stop Radio 103FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/NonStop_Radio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/103fm.png",
        "genre": "pop",
        "order": 19,
    },
    {
        "name": "כאן קול המוסיקה",
        "name_en": "Kan Musica",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Musica/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/972fm.png",
        "genre": "music",
        "order": 20,
    },
    {
        "name": "רדיו נאס",
        "name_en": "Radio Nas",
        "feed": "https://cdna.streamgates.net/RadioNas/Live-Audio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1033fm.png",
        "genre": "hip-hop",
        "order": 21,
    },
    {
        "name": "כאן רקע",
        "name_en": "Kan Reka",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Reka/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1005fm.png",
        "genre": "ambient",
        "order": 22,
    },
    {
        "name": "ירושלים 101fm",
        "name_en": "Jerusalem 101FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Jerusalem_Radio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/101fm.png",
        "genre": "mixed",
        "order": 23,
    },
    {
        "name": "רדיו אלשמאס",
        "name_en": "Radio Alshmmas",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Ashams/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1011fm.png",
        "genre": "arabic",
        "order": 24,
    },
    {
        "name": "רדיו תל אביב",
        "name_en": "Tel Aviv Radio",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/TLV_Radio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/102fm.png",
        "genre": "mixed",
        "order": 25,
    },
    {
        "name": "רדיו צפון ללא הפסקה",
        "name_en": "North Non-Stop Radio",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Tzafon_NonStop/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1045fm.png",
        "genre": "pop",
        "order": 26,
    },
    {
        "name": "חיפה 107.5fm",
        "name_en": "Haifa 107.5FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Haifa_Radio/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/1075fm.png",
        "genre": "mixed",
        "order": 27,
    },
    {
        "name": "מכאן",
        "name_en": "Makan",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Kan_Makan/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/937fm.png",
        "genre": "music",
        "order": 28,
    },
    {
        "name": "רדיו אמצע הדרך",
        "name_en": "Emtza Haderech",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Emtza_Haderech/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/90fm.png",
        "genre": "mixed",
        "order": 29,
    },
    {
        "name": "רדיו מהות החיים",
        "name_en": "Mahut Hachaim",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Mahut/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/internet2.png",
        "genre": "lifestyle",
        "order": 30,
    },
    {
        "name": "רדיו הקצה",
        "name_en": "Katze Radio",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Katze/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/internet3.png",
        "genre": "alternative",
        "order": 31,
    },
    {
        "name": "אקו 99fm",
        "name_en": "Eco 99FM",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Eco99FM/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/99fm.png",
        "genre": "music",
        "order": 32,
    },
    {
        "name": "רדיו חם אש",
        "name_en": "Ham Esh Radio",
        "feed": "https://cdna.streamgates.net/Radios_Radio_App/Ham_Esh/playlist.m3u8",
        "img": "https://d203uamca1bsc4.cloudfront.net/AllFM/995fm.png",
        "genre": "music",
        "order": 33,
    },
]


async def update_radio_stations():
    """Update radio stations in MongoDB"""
    logger.info("=" * 70)
    logger.info("ISRAELI RADIO STATIONS DATABASE UPDATE")
    logger.info("=" * 70)

    # Get MongoDB connection
    mongo_url = os.getenv("MONGODB_CONNECTION_STRING", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DATABASE", "bayit-plus")

    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        collection = db["radio_stations"]

        logger.info(f"Connected to MongoDB: {db_name}")

        created = 0
        updated = 0

        for channel in CHANNELS_DATA:
            try:
                # Prepare document
                doc = {
                    "name": channel["name"],
                    "name_en": channel.get("name_en"),
                    "stream_url": channel["feed"],
                    "stream_type": "hls",
                    "genre": channel.get("genre", "mixed"),
                    "logo": channel.get("img"),
                    "culture_id": "israeli",
                    "is_active": True,
                    "order": channel.get("order", 0),
                }

                # Try to update, else insert
                result = await collection.update_one(
                    {"name": channel["name"]},
                    {"$set": doc},
                    upsert=True,
                )

                if result.upserted_id:
                    logger.info(
                        f"✓ CREATED: {channel['name_en']} ({channel['name']})"
                    )
                    created += 1
                else:
                    logger.info(
                        f"✓ UPDATED: {channel['name_en']} ({channel['name']})"
                    )
                    updated += 1

            except Exception as e:
                logger.error(f"✗ Error processing {channel['name']}: {e}")

        # Summary
        logger.info("=" * 70)
        logger.info("SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Created:  {created} new stations")
        logger.info(f"Updated:  {updated} existing stations")
        logger.info(f"Total:    {created + updated} stations")
        logger.info("=" * 70)

        client.close()

    except Exception as e:
        logger.error(f"✗ Failed to connect to MongoDB: {e}")
        logger.error("Make sure MongoDB is running and connection string is correct")


if __name__ == "__main__":
    asyncio.run(update_radio_stations())

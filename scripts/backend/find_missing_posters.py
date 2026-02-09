#!/usr/bin/env python3
"""
Find missing posters for channels, podcasts, and radio stations.

This script checks which content items are missing posters and searches
the web to find appropriate logos/cover images.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.content import LiveChannel, Podcast, RadioStation
from app.core.config import settings


async def check_missing_posters():
    """Check which content items are missing posters."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[LiveChannel, Podcast, RadioStation]
    )

    print("\n" + "="*80)
    print("CHECKING FOR MISSING POSTERS")
    print("="*80)

    # Check Live Channels
    print("\n📺 LIVE CHANNELS:")
    print("-" * 80)
    channels = await LiveChannel.find().to_list()
    print(f"Total channels: {len(channels)}")

    missing_channel_posters = []
    for ch in channels:
        has_logo = bool(ch.logo)
        has_thumbnail = bool(ch.thumbnail)
        status = "✅" if (has_logo or has_thumbnail) else "❌"
        print(f"{status} {ch.name}")
        if ch.logo:
            print(f"   Logo: {ch.logo[:80]}")
        if ch.thumbnail:
            print(f"   Thumbnail: {ch.thumbnail[:80]}")

        if not (has_logo or has_thumbnail):
            missing_channel_posters.append({
                'id': str(ch.id),
                'name': ch.name,
                'type': 'channel'
            })

    # Check Podcasts
    print("\n\n🎙️ PODCASTS:")
    print("-" * 80)
    podcasts = await Podcast.find().to_list()
    print(f"Total podcasts: {len(podcasts)}")

    missing_podcast_posters = []
    for pod in podcasts:
        has_cover = bool(pod.cover)
        status = "✅" if has_cover else "❌"
        print(f"{status} {pod.title}")
        if pod.cover:
            print(f"   Cover: {pod.cover[:80]}")

        if not has_cover:
            missing_podcast_posters.append({
                'id': str(pod.id),
                'name': pod.title,
                'type': 'podcast'
            })

    # Check Radio Stations
    print("\n\n📻 RADIO STATIONS:")
    print("-" * 80)
    stations = await RadioStation.find().to_list()
    print(f"Total stations: {len(stations)}")

    missing_station_posters = []
    for station in stations:
        has_logo = bool(station.logo)
        status = "✅" if has_logo else "❌"
        print(f"{status} {station.name}")
        if station.logo:
            print(f"   Logo: {station.logo[:80]}")

        if not has_logo:
            missing_station_posters.append({
                'id': str(station.id),
                'name': station.name,
                'type': 'radio'
            })

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"📺 Channels missing posters: {len(missing_channel_posters)}/{len(channels)}")
    print(f"🎙️ Podcasts missing posters: {len(missing_podcast_posters)}/{len(podcasts)}")
    print(f"📻 Radio stations missing posters: {len(missing_station_posters)}/{len(stations)}")

    total_missing = len(missing_channel_posters) + len(missing_podcast_posters) + len(missing_station_posters)
    print(f"\n❌ Total items missing posters: {total_missing}")

    if total_missing > 0:
        print("\n\nItems needing posters:")
        if missing_channel_posters:
            print("\n📺 Channels:")
            for item in missing_channel_posters:
                print(f"  - {item['name']} (ID: {item['id']})")

        if missing_podcast_posters:
            print("\n🎙️ Podcasts:")
            for item in missing_podcast_posters:
                print(f"  - {item['name']} (ID: {item['id']})")

        if missing_station_posters:
            print("\n📻 Radio Stations:")
            for item in missing_station_posters:
                print(f"  - {item['name']} (ID: {item['id']})")

    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(check_missing_posters())

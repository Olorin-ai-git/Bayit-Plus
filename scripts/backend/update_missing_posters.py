#!/usr/bin/env python3
"""
Update missing posters for channels, podcasts, and radio stations.

This script updates the 2 items that are currently missing posters.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.content import Podcast, RadioStation
from app.core.config import settings


# Poster mappings (ID -> cover URL)
POSTER_UPDATES = {
    'podcast': {
        '697b9c24c1c5fbdd964ad13f': {  # Raymond Tec News
            'name': 'Raymond Tec News',
            'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/41/71/bb/4171bba7-9346-d382-7834-8588471bb78a/mza_7740670937940920071.jpg/1200x1200bf.webp'
        }
    },
    'radio': {
        '6963bff4abb3ca055cdd84b0': {  # כאן קול המוזיקה
            'name': 'כאן קול המוזיקה',
            'logo': 'https://www.israel-radio.com/wp-content/uploads/2015/01/radio_israel.png'
        }
    }
}


async def update_posters():
    """Update missing posters in database."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Podcast, RadioStation]
    )

    print("\n" + "="*80)
    print("UPDATING MISSING POSTERS")
    print("="*80)

    updated_count = 0

    # Update podcasts
    print("\n🎙️ PODCASTS:")
    print("-" * 80)
    for podcast_id, data in POSTER_UPDATES['podcast'].items():
        podcast = await Podcast.get(podcast_id)
        if not podcast:
            print(f"❌ Podcast '{data['name']}' not found - ID: {podcast_id}")
            continue

        if podcast.cover:
            print(f"⏭️  '{data['name']}' already has cover - skipping")
            continue

        podcast.cover = data['cover']
        await podcast.save()
        print(f"✅ Updated '{data['name']}'")
        print(f"   Cover: {data['cover'][:80]}")
        updated_count += 1

    # Update radio stations
    print("\n📻 RADIO STATIONS:")
    print("-" * 80)
    for station_id, data in POSTER_UPDATES['radio'].items():
        station = await RadioStation.get(station_id)
        if not station:
            print(f"❌ Radio station '{data['name']}' not found - ID: {station_id}")
            continue

        if station.logo:
            print(f"⏭️  '{data['name']}' already has logo - skipping")
            continue

        station.logo = data['logo']
        await station.save()
        print(f"✅ Updated '{data['name']}'")
        print(f"   Logo: {data['logo'][:80]}")
        updated_count += 1

    print("\n" + "="*80)
    print(f"🎉 Updated {updated_count} items with posters!")
    print("="*80)

    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(update_posters())

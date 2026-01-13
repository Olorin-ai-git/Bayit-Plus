#!/usr/bin/env python
"""
EPG Ingestion Script
Run this script to fetch and update EPG data from real sources
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.content import EPGEntry, LiveChannel
from app.core.config import settings
from app.services.epg_ingestion_service import epg_ingestion_service


async def main():
    """Main ingestion function"""
    print("=" * 60)
    print("EPG Data Ingestion Script")
    print("=" * 60)

    # Initialize database
    print("\n[1/4] Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[EPGEntry, LiveChannel]
    )
    print("✓ Connected to MongoDB")

    # Clean up old data
    print("\n[2/4] Cleaning up old EPG entries...")
    deleted_count = await epg_ingestion_service.cleanup_old_epg(days_to_keep=7)
    print(f"✓ Removed {deleted_count} old entries")

    # Ingest new data
    print("\n[3/4] Fetching EPG data from sources...")
    print("Note: Some sources may require VPN or Israeli IP address")
    print()

    results = await epg_ingestion_service.ingest_all_channels()

    # Display results
    print("\n[4/4] Ingestion Results:")
    print("-" * 40)
    total_programs = 0
    for channel, count in results.items():
        status = "✓" if count > 0 else "✗"
        print(f"  {status} {channel}: {count} programs")
        total_programs += count

    print("-" * 40)
    print(f"Total: {total_programs} programs ingested")

    # Verify database state
    print("\n" + "=" * 60)
    print("Database Status")
    print("=" * 60)

    total_entries = await EPGEntry.count()
    total_channels = await LiveChannel.count()

    print(f"Total EPG entries in database: {total_entries}")
    print(f"Total active channels: {total_channels}")

    # Show sample data
    if total_entries > 0:
        print("\nSample EPG entries:")
        sample_entries = await EPGEntry.find().sort("-start_time").limit(5).to_list()
        for entry in sample_entries:
            print(f"  • {entry.start_time.strftime('%Y-%m-%d %H:%M')} - {entry.title}")

    # Cleanup
    await epg_ingestion_service.close()
    client.close()

    print("\n" + "=" * 60)
    print("Ingestion Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

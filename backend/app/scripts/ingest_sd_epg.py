"""
Schedules Direct EPG Ingestion Script

Ingests real EPG data from Schedules Direct for channels that have SD station IDs.

Current supported channels:
- Israel Plus (Station ID: 27549) from DISH lineup

Usage:
    export SCHEDULES_DIRECT_USERNAME="your_username"
    export SCHEDULES_DIRECT_PASSWORD="your_password"

    cd backend
    poetry run python -m app.scripts.ingest_sd_epg
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict, List

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Channel mapping: Bayit+ channel name -> Schedules Direct station ID
# These are from the DISH 501 New York lineup
SD_CHANNEL_MAP: Dict[str, str] = {
    "Israel Plus": "27549",
    # Add more channels as discovered
}


async def main():
    """Ingest EPG from Schedules Direct."""
    # Check credentials
    username = os.environ.get("SCHEDULES_DIRECT_USERNAME")
    password = os.environ.get("SCHEDULES_DIRECT_PASSWORD")

    if not username or not password:
        logger.error("Missing credentials!")
        logger.error("Set environment variables:")
        logger.error('  export SCHEDULES_DIRECT_USERNAME="your_username"')
        logger.error('  export SCHEDULES_DIRECT_PASSWORD="your_password"')
        sys.exit(1)

    # Import after checking credentials to avoid startup issues
    from app.core.database import connect_to_mongo
    from app.models.content import EPGEntry, LiveChannel
    from app.services.schedules_direct_service import SchedulesDirectService

    logger.info("=" * 70)
    logger.info("SCHEDULES DIRECT EPG INGESTION")
    logger.info("=" * 70)

    # Connect to database
    await connect_to_mongo()

    # Create service
    service = SchedulesDirectService(username=username, password=password)

    try:
        # Authenticate
        logger.info("Authenticating with Schedules Direct...")
        if not await service.authenticate():
            logger.error("Authentication failed!")
            sys.exit(1)
        logger.info("Authentication successful!")

        results: Dict[str, int] = {}

        # Process each mapped channel
        for channel_name, station_id in SD_CHANNEL_MAP.items():
            logger.info("")
            logger.info(f"Processing: {channel_name} (Station ID: {station_id})")

            # Find channel in database
            channel = await LiveChannel.find_one({"name": channel_name})
            if not channel:
                # Try English name
                channel = await LiveChannel.find_one({"name_en": channel_name})

            if not channel:
                logger.warning(f"Channel '{channel_name}' not found in database")
                # Create the channel if it doesn't exist
                channel = LiveChannel(
                    name="ישראל פלוס",
                    name_en="Israel Plus",
                    logo_url="https://upload.wikimedia.org/wikipedia/he/7/7e/Israel_plus_logo.png",
                    stream_url="",  # Need to add stream URL
                    category="Israeli",
                    language="hebrew",
                    is_active=True,
                    is_live=True,
                )
                await channel.insert()
                logger.info(f"Created channel: {channel_name}")

            channel_id = str(channel.id)

            # Get schedules from SD
            logger.info(f"Fetching schedules for station {station_id}...")
            schedules = await service.get_schedules([station_id], days=7)
            station_schedules = schedules.get(station_id, [])

            if not station_schedules:
                logger.warning(f"No schedules found for {channel_name}")
                results[channel_name] = 0
                continue

            logger.info(f"Found {len(station_schedules)} schedule entries")

            # Get program IDs
            program_ids = [s.get("programID") for s in station_schedules if s.get("programID")]
            logger.info(f"Fetching details for {len(program_ids)} programs...")

            # Get program details
            programs = await service.get_programs(program_ids)
            logger.info(f"Retrieved {len(programs)} program details")

            # Create EPG entries
            created = 0
            for schedule in station_schedules:
                try:
                    program_id = schedule.get("programID")
                    if not program_id:
                        continue

                    program = programs.get(program_id, {})

                    # Parse times
                    air_datetime = schedule.get("airDateTime")
                    duration = schedule.get("duration", 3600)

                    if not air_datetime:
                        continue

                    start_time = datetime.fromisoformat(air_datetime.replace("Z", "+00:00"))
                    end_time = start_time + timedelta(seconds=duration)

                    # Skip past entries
                    if end_time < datetime.now(timezone.utc):
                        continue

                    # Check if exists
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
                    desc_list = descriptions.get("description1000", []) or descriptions.get("description100", [])
                    description = desc_list[0].get("description") if desc_list else ""

                    genres = program.get("genres", [])

                    # Get thumbnail/artwork
                    thumbnail = None
                    if program.get("hasImageArtwork"):
                        # SD has a separate artwork endpoint
                        artwork = program.get("episodeImage", {})
                        if artwork:
                            thumbnail = artwork.get("uri")

                    # Rating handling
                    rating = None
                    content_ratings = program.get("contentRating", [])
                    if content_ratings:
                        rating = content_ratings[0].get("code")

                    # Cast handling - SD returns objects, we need strings
                    cast_list = []
                    raw_cast = program.get("cast", [])
                    if raw_cast:
                        for cast_member in raw_cast:
                            if isinstance(cast_member, dict):
                                name = cast_member.get("name")
                                if name:
                                    cast_list.append(name)
                            elif isinstance(cast_member, str):
                                cast_list.append(cast_member)

                    # Create entry
                    entry = EPGEntry(
                        channel_id=channel_id,
                        title=title,
                        description=description,
                        start_time=start_time,
                        end_time=end_time,
                        category=genres[0] if genres else "Entertainment",
                        thumbnail=thumbnail,
                        cast=cast_list,
                        genres=genres,
                        rating=rating,
                        director=None,
                        recording_id=None,
                    )

                    await entry.insert()
                    created += 1

                except Exception as e:
                    logger.error(f"Failed to create EPG entry: {e}")
                    continue

            logger.info(f"Created {created} EPG entries for {channel_name}")
            results[channel_name] = created

        # Summary
        logger.info("")
        logger.info("=" * 70)
        logger.info("INGESTION COMPLETE")
        logger.info("=" * 70)
        total = sum(results.values())
        logger.info(f"Total EPG entries created: {total}")
        for channel, count in results.items():
            logger.info(f"  {channel}: {count}")

    finally:
        await service.close()


if __name__ == "__main__":
    asyncio.run(main())

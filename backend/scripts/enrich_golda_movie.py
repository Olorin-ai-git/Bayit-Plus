#!/usr/bin/env python3
"""
Script to enrich the movie 'Golda' with TMDB data and extract subtitles.

This script:
1. Searches for the movie 'Golda' in the MongoDB database
2. Fetches TMDB metadata (poster, backdrop, cast, director, etc.)
3. Extracts embedded subtitles from the video file
4. Updates the Content document with all enriched data

Usage:
    poetry run python scripts/enrich_golda_movie.py
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Add the parent directory to the path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set environment variables before importing app modules
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point for the script."""
    from app.core.config import settings
    from app.models.content import Content
    from app.models.subtitles import SubtitleTrackDoc, TranslationCacheDoc
    from app.services.tmdb_service import tmdb_service
    from app.services.ffmpeg_service import ffmpeg_service

    logger.info("=" * 60)
    logger.info("ENRICHING MOVIE: GOLDA")
    logger.info("=" * 60)

    # Step 1: Connect to MongoDB
    logger.info("\n📡 Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, SubtitleTrackDoc, TranslationCacheDoc]
    )
    logger.info(f"✅ Connected to database: {settings.MONGODB_DB_NAME}")

    # Step 2: Search for 'Golda' in the database
    logger.info("\n🔍 Searching for movie 'Golda' in database...")

    # Try multiple search patterns
    golda_movie = await Content.find_one(
        {"title": {"$regex": "golda", "$options": "i"}}
    )

    if not golda_movie:
        # Try title_en field
        golda_movie = await Content.find_one(
            {"title_en": {"$regex": "golda", "$options": "i"}}
        )

    if not golda_movie:
        logger.error("❌ Movie 'Golda' not found in database!")
        logger.info("\n📋 Listing all movies in database (first 20):")
        all_content = await Content.find().limit(20).to_list()
        for i, content in enumerate(all_content, 1):
            logger.info(f"  {i}. {content.title} (ID: {content.id})")
        return

    logger.info(f"✅ Found movie: '{golda_movie.title}'")
    logger.info(f"   ID: {golda_movie.id}")
    logger.info(f"   Stream URL: {golda_movie.stream_url}")
    logger.info(f"   Year: {golda_movie.year}")
    logger.info(f"   Current TMDB ID: {golda_movie.tmdb_id}")
    logger.info(f"   Current Subtitles: {golda_movie.available_subtitle_languages}")

    # Step 3: Fetch TMDB data
    logger.info("\n🎬 Fetching TMDB data for 'Golda'...")

    # Golda (2023) is about Golda Meir during the Yom Kippur War
    year = golda_movie.year if golda_movie.year else 2023
    tmdb_data = await tmdb_service.enrich_movie_content("Golda", year)

    if tmdb_data.get("tmdb_id"):
        logger.info(f"✅ TMDB data fetched successfully!")
        logger.info(f"   TMDB ID: {tmdb_data['tmdb_id']}")
        logger.info(f"   IMDB ID: {tmdb_data['imdb_id']}")
        logger.info(f"   Rating: {tmdb_data['imdb_rating']}")
        logger.info(f"   Genres: {tmdb_data['genres']}")
        logger.info(f"   Director: {tmdb_data['director']}")
        logger.info(f"   Cast: {tmdb_data['cast'][:5]}...")
        logger.info(f"   Poster: {tmdb_data['poster']}")
        logger.info(f"   Backdrop: {tmdb_data['backdrop']}")
        logger.info(f"   Trailer: {tmdb_data['trailer_url']}")
    else:
        logger.warning("⚠️ Could not fetch TMDB data for 'Golda'")

    # Step 4: Extract subtitles from video file
    logger.info("\n📺 Analyzing video for embedded subtitles...")

    stream_url = golda_movie.stream_url
    extracted_subtitles = []

    try:
        # First, verify FFmpeg is installed
        ffmpeg_status = await ffmpeg_service.verify_ffmpeg_installation()
        if not ffmpeg_status["ffmpeg_installed"]:
            logger.error("❌ FFmpeg is not installed!")
        else:
            logger.info(f"✅ FFmpeg version: {ffmpeg_status['ffmpeg_version']}")

            # Analyze video to find subtitle tracks
            video_metadata = await ffmpeg_service.analyze_video(stream_url)

            logger.info(f"   Video Duration: {video_metadata.get('duration', 0):.2f}s")
            logger.info(f"   Resolution: {video_metadata.get('width')}x{video_metadata.get('height')}")
            logger.info(f"   Codec: {video_metadata.get('codec')}")

            subtitle_tracks = video_metadata.get("subtitle_tracks", [])
            logger.info(f"   Subtitle tracks found: {len(subtitle_tracks)}")

            if subtitle_tracks:
                for track in subtitle_tracks:
                    logger.info(
                        f"      - Track {track['index']}: "
                        f"Language={track['language']}, "
                        f"Codec={track['codec']}, "
                        f"Title={track.get('title', 'N/A')}"
                    )

                # Extract all subtitles
                logger.info("\n📝 Extracting subtitle tracks...")
                extracted_subtitles = await ffmpeg_service.extract_all_subtitles(
                    stream_url,
                    languages=["he", "en", "es", "ar", "ru", "fr"],  # Priority languages
                    max_parallel=3,
                    max_subtitles=10
                )

                logger.info(f"✅ Extracted {len(extracted_subtitles)} subtitle tracks")
                for sub in extracted_subtitles:
                    content_preview = sub['content'][:100].replace('\n', ' ')
                    logger.info(f"   - {sub['language']}: {len(sub['content'])} chars")
            else:
                logger.info("   No embedded subtitle tracks found in video")

    except Exception as e:
        logger.error(f"❌ Error analyzing video: {str(e)}")

    # Step 5: Store subtitles in database
    if extracted_subtitles:
        logger.info("\n💾 Storing subtitles in database...")

        for sub in extracted_subtitles:
            try:
                # Parse SRT content into cues
                from app.services.subtitle_parser import parse_srt_content
                cues = parse_srt_content(sub['content'])

                # Check if subtitle track already exists
                existing_track = await SubtitleTrackDoc.find_one({
                    "content_id": str(golda_movie.id),
                    "language": sub['language']
                })

                if existing_track:
                    logger.info(f"   ↻ Updating existing {sub['language']} subtitle track")
                    existing_track.cues = cues
                    existing_track.format = sub['format']
                    existing_track.source = "embedded"
                    existing_track.updated_at = datetime.utcnow()
                    await existing_track.save()
                else:
                    logger.info(f"   + Creating new {sub['language']} subtitle track")
                    new_track = SubtitleTrackDoc(
                        content_id=str(golda_movie.id),
                        content_type="vod",
                        language=sub['language'],
                        language_name=get_language_name(sub['language']),
                        format=sub['format'],
                        cues=cues,
                        is_default=(sub['language'] == 'en'),
                        is_auto_generated=False,
                        source="embedded",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    await new_track.insert()

            except Exception as e:
                logger.error(f"   ❌ Failed to store {sub['language']} subtitles: {str(e)}")

    # Step 6: Update Content document with enriched data
    logger.info("\n📦 Updating Content document...")

    update_data = {
        "updated_at": datetime.utcnow()
    }

    # Add TMDB data
    if tmdb_data.get("tmdb_id"):
        update_data["tmdb_id"] = tmdb_data["tmdb_id"]
        update_data["imdb_id"] = tmdb_data.get("imdb_id")
        update_data["imdb_rating"] = tmdb_data.get("imdb_rating")
        update_data["imdb_votes"] = tmdb_data.get("imdb_votes")
        update_data["trailer_url"] = tmdb_data.get("trailer_url")
        update_data["poster_url"] = tmdb_data.get("poster")
        update_data["thumbnail"] = tmdb_data.get("poster")  # Use poster as thumbnail
        update_data["backdrop"] = tmdb_data.get("backdrop")
        update_data["genres"] = tmdb_data.get("genres")
        update_data["cast"] = tmdb_data.get("cast")
        update_data["director"] = tmdb_data.get("director")

        if tmdb_data.get("overview") and not golda_movie.description:
            update_data["description_en"] = tmdb_data["overview"]

        if tmdb_data.get("release_year"):
            update_data["year"] = tmdb_data["release_year"]

    # Add subtitle info
    if extracted_subtitles:
        update_data["has_subtitles"] = True
        update_data["available_subtitle_languages"] = [s["language"] for s in extracted_subtitles]
        update_data["embedded_subtitle_count"] = len(extracted_subtitles)
        update_data["subtitle_extraction_status"] = "completed"
        update_data["subtitle_last_checked"] = datetime.utcnow()

    # Add video metadata if available
    if 'video_metadata' in locals() and video_metadata:
        update_data["video_metadata"] = {
            "duration": video_metadata.get("duration"),
            "width": video_metadata.get("width"),
            "height": video_metadata.get("height"),
            "codec": video_metadata.get("codec"),
            "bitrate": video_metadata.get("bitrate"),
            "fps": video_metadata.get("fps")
        }

        # Determine quality tier
        height = video_metadata.get("height", 0)
        if height >= 2160:
            update_data["quality_tier"] = "4k"
        elif height >= 1080:
            update_data["quality_tier"] = "1080p"
        elif height >= 720:
            update_data["quality_tier"] = "720p"
        elif height >= 480:
            update_data["quality_tier"] = "480p"

    # Apply updates
    for key, value in update_data.items():
        setattr(golda_movie, key, value)

    await golda_movie.save()

    logger.info("✅ Content document updated successfully!")

    # Step 7: Summary
    logger.info("\n" + "=" * 60)
    logger.info("ENRICHMENT COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Title: {golda_movie.title}")
    logger.info(f"TMDB ID: {golda_movie.tmdb_id}")
    logger.info(f"IMDB ID: {golda_movie.imdb_id}")
    logger.info(f"Rating: {golda_movie.imdb_rating}")
    logger.info(f"Year: {golda_movie.year}")
    logger.info(f"Director: {golda_movie.director}")
    logger.info(f"Genres: {golda_movie.genres}")
    logger.info(f"Quality: {golda_movie.quality_tier}")
    logger.info(f"Poster: {golda_movie.poster_url}")
    logger.info(f"Backdrop: {golda_movie.backdrop}")
    logger.info(f"Trailer: {golda_movie.trailer_url}")
    logger.info(f"Subtitles: {golda_movie.available_subtitle_languages}")
    logger.info("=" * 60)

    # Close connections
    await tmdb_service.close()
    client.close()


def get_language_name(code: str) -> str:
    """Get full language name from ISO 639-1 code."""
    language_names = {
        "he": "עברית",
        "en": "English",
        "es": "Español",
        "ar": "العربية",
        "ru": "Русский",
        "fr": "Français",
        "de": "Deutsch",
        "it": "Italiano",
        "pt": "Português",
        "yi": "ייִדיש",
    }
    return language_names.get(code, code.upper())


def parse_srt_content(content: str) -> list:
    """Parse SRT content into subtitle cues."""
    cues = []
    blocks = content.strip().split("\n\n")

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue

        try:
            # Parse index
            index = int(lines[0])

            # Parse timestamp line: "00:00:01,000 --> 00:00:03,000"
            time_line = lines[1]
            start_str, end_str = time_line.split(" --> ")

            start_time = parse_srt_timestamp(start_str.strip())
            end_time = parse_srt_timestamp(end_str.strip())

            # Get text (remaining lines)
            text = "\n".join(lines[2:])

            cues.append({
                "index": index,
                "start_time": start_time,
                "end_time": end_time,
                "text": text
            })
        except (ValueError, IndexError):
            continue

    return cues


def parse_srt_timestamp(timestamp: str) -> float:
    """Parse SRT timestamp to seconds."""
    # Format: "00:00:01,000" or "00:00:01.000"
    timestamp = timestamp.replace(",", ".")
    parts = timestamp.split(":")

    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])

    return hours * 3600 + minutes * 60 + seconds


if __name__ == "__main__":
    asyncio.run(main())

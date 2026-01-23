"""
Fix Failed VOD Metadata Enrichment
Cleans up titles with release tags and retries TMDB enrichment
"""

import asyncio
import re
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import logging

from app.core.config import settings
from app.models.content import Content
from app.services.tmdb_service import tmdb_service
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def clean_title(title: str) -> str:
    """
    Clean movie/TV title by removing release group tags, quality indicators, etc.

    Examples:
        "Coco p Rip -EVO" -> "Coco"
        "Django Unchained Upscaled Soup" -> "Django Unchained"
        "Ice Age p multisub-HighCode" -> "Ice Age"
    """
    # Store original for comparison
    original = title

    # Remove file extensions
    title = re.sub(r"\.(mkv|mp4|avi|mov)$", "", title, flags=re.IGNORECASE)

    # Remove resolution/quality indicators
    # 1080p, 720p, 2160p, 4K, UHD, HD, BluRay, BRRip, WEBRip, etc.
    quality_patterns = [
        r"\b(2160|1080|720|480|360)p?\b",
        r"\b(4K|UHD|HD|SD)\b",
        r"\b(BluRay|BRRip|BDRip|WEBRip|WEB-DL|HDRip|DVDRip)\b",
        r"\b(PROPER|REPACK|INTERNAL|LIMITED)\b",
    ]
    for pattern in quality_patterns:
        title = re.sub(pattern, "", title, flags=re.IGNORECASE)

    # Remove codec info
    # x264, x265, H264, H265, HEVC, AAC, AC3, DTS, etc.
    codec_patterns = [
        r"\b(x264|x265|H\.?264|H\.?265|HEVC|XviD|DivX)\b",
        r"\b(AAC|AC3|DTS|MP3|FLAC)\b",
        r"\b(5\.1|7\.1|2\.0)\b",
    ]
    for pattern in codec_patterns:
        title = re.sub(pattern, "", title, flags=re.IGNORECASE)

    # Remove release group tags (usually at the end)
    # -EVO, -MX, -POOP, -HighCode, etc.
    title = re.sub(r"-[A-Z0-9]+\]?$", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\[[A-Z0-9]+\]$", "", title, flags=re.IGNORECASE)

    # Remove common release keywords
    release_keywords = [
        r"\bRip\b",
        r"\bUpscaled\b",
        r"\bmultisub\b",
        r"\bExtended\b",
        r"\bUnrated\b",
        r"\bDirector\'?s? Cut\b",
        r"\bTheatrical\b",
        r"\bRemastered\b",
        r"\bUltra\b",
        r"\bEdition\b",
        r"\bRemix\b",
        r"\bSoup\b",  # Release group
        r"\banoXmous\b",  # Release group
        r"\bHighCode\b",  # Release group
        r"\bN O K\b",  # Release group
        r"\bChina\b",  # Region indicator
    ]
    for keyword in release_keywords:
        title = re.sub(keyword, "", title, flags=re.IGNORECASE)

    # Remove standalone 'p' (usually part of "1080p" but sometimes separated)
    title = re.sub(r"\s+p\s+", " ", title, flags=re.IGNORECASE)
    title = re.sub(r"\s+p$", "", title, flags=re.IGNORECASE)

    # Remove extra spaces, dashes, brackets
    title = re.sub(r"\s+", " ", title)  # Multiple spaces to single
    title = re.sub(r"\s*-\s*$", "", title)  # Trailing dash
    title = re.sub(r"^\s*-\s*", "", title)  # Leading dash
    title = title.strip()

    # Remove trailing/leading special characters
    title = title.strip(" -[]()_.")

    logger.debug(f"   🧹 Cleaned: '{original}' -> '{title}'")
    return title


async def connect_db():
    """Connect to MongoDB"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[Content])
    logger.info("✅ Connected to MongoDB")


async def enrich_with_cleaned_title(content: Content, dry_run: bool = False) -> bool:
    """
    Attempt to enrich content with cleaned title.
    Returns True if successful, False otherwise.
    """
    try:
        original_title = content.title
        cleaned_title = clean_title(original_title)

        if cleaned_title == original_title:
            logger.info(f"   ℹ️  Title unchanged: {original_title}")
        else:
            logger.info(f"   🧹 Cleaned: '{original_title}' -> '{cleaned_title}'")

        # Determine content type
        is_series = content.is_series or content.season is not None

        # Fetch metadata from TMDB with cleaned title
        if is_series:
            logger.info(f"   🎬 Fetching TV series metadata")
            metadata = await tmdb_service.enrich_series_content(
                title=cleaned_title, year=content.year
            )
        else:
            logger.info(f"   🎬 Fetching movie metadata")
            metadata = await tmdb_service.enrich_movie_content(
                title=cleaned_title, year=content.year
            )

        if not metadata.get("tmdb_id"):
            logger.warning(f"   ⚠️  Still no TMDB results for: {cleaned_title}")
            return False

        # Update all missing fields
        updated_fields = []

        if metadata.get("tmdb_id") and not content.tmdb_id:
            content.tmdb_id = metadata["tmdb_id"]
            updated_fields.append("tmdb_id")

        if metadata.get("imdb_id") and not content.imdb_id:
            content.imdb_id = metadata["imdb_id"]
            updated_fields.append("imdb_id")

        if metadata.get("overview") and not content.description:
            content.description = metadata["overview"]
            updated_fields.append("description")

        if metadata.get("poster") and not content.poster_url:
            content.poster_url = metadata["poster"]
            if not content.thumbnail:
                content.thumbnail = metadata["poster"]
            updated_fields.append("poster/thumbnail")

        if metadata.get("backdrop") and not content.backdrop:
            content.backdrop = metadata["backdrop"]
            updated_fields.append("backdrop")

        if metadata.get("genres") and (not content.genres or len(content.genres) == 0):
            content.genres = metadata["genres"]
            if metadata["genres"]:
                content.genre = metadata["genres"][0]
            updated_fields.append("genres")

        if metadata.get("cast") and (not content.cast or len(content.cast) == 0):
            content.cast = metadata["cast"]
            updated_fields.append("cast")

        if metadata.get("director") and not content.director:
            content.director = metadata["director"]
            updated_fields.append("director")

        if metadata.get("imdb_rating") is not None and content.imdb_rating is None:
            content.imdb_rating = metadata["imdb_rating"]
            updated_fields.append("imdb_rating")

        if metadata.get("imdb_votes") is not None and content.imdb_votes is None:
            content.imdb_votes = metadata["imdb_votes"]
            updated_fields.append("imdb_votes")

        if metadata.get("release_year") and not content.year:
            content.year = metadata["release_year"]
            updated_fields.append("year")

        if metadata.get("trailer_url") and not content.trailer_url:
            content.trailer_url = metadata["trailer_url"]
            updated_fields.append("trailer")

        if metadata.get("runtime") and not content.duration:
            runtime_min = metadata["runtime"]
            hours = runtime_min // 60
            minutes = runtime_min % 60
            content.duration = f"{hours}:{minutes:02d}:00"
            updated_fields.append("duration")

        if is_series:
            if metadata.get("total_seasons") and not content.total_seasons:
                content.total_seasons = metadata["total_seasons"]
                updated_fields.append("total_seasons")

            if metadata.get("total_episodes") and not content.total_episodes:
                content.total_episodes = metadata["total_episodes"]
                updated_fields.append("total_episodes")

        if not content.content_type:
            content.content_type = "series" if is_series else "movie"
            updated_fields.append("content_type")

        if not updated_fields:
            logger.info(f"   ℹ️  No updates needed")
            return False

        logger.info(f"   ✅ Updated fields: {', '.join(updated_fields)}")

        if not dry_run:
            await content.save()
            logger.info(f"   💾 Saved to database")
        else:
            logger.info(f"   🔍 DRY RUN - No changes saved")

        return True

    except Exception as e:
        logger.error(f"   ❌ Error: {str(e)}")
        return False


async def main(dry_run: bool = False):
    """
    Main function to fix failed enrichments.

    Args:
        dry_run: If True, only log what would be changed without saving
    """
    try:
        await connect_db()

        # Find all content without TMDB ID (these are the ones that failed)
        logger.info("🔍 Finding content without TMDB metadata...")

        failed_content = await Content.find(Content.tmdb_id == None).to_list()

        logger.info(f"📋 Found {len(failed_content)} items without TMDB ID")

        if not failed_content:
            logger.info("✨ All content already has TMDB metadata!")
            return

        # Show summary
        logger.info("\n" + "=" * 80)
        logger.info("ITEMS TO FIX")
        logger.info("=" * 80)
        for item in failed_content[:10]:
            logger.info(f"  • {item.title}")
        if len(failed_content) > 10:
            logger.info(f"  ... and {len(failed_content) - 10} more")
        logger.info("=" * 80 + "\n")

        # Process each item
        success_count = 0
        failed_count = 0

        for idx, content in enumerate(failed_content, 1):
            logger.info(f"\n[{idx}/{len(failed_content)}] {'-'*60}")
            logger.info(f"📝 Processing: {content.title}")

            success = await enrich_with_cleaned_title(content, dry_run=dry_run)

            if success:
                success_count += 1
            else:
                failed_count += 1

            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)

        # Final summary
        logger.info("\n" + "=" * 80)
        logger.info("FIX COMPLETE")
        logger.info("=" * 80)
        logger.info(f"✅ Successfully fixed: {success_count}")
        logger.info(f"❌ Still failed: {failed_count}")
        logger.info(f"📊 Total processed: {len(failed_content)}")
        logger.info("=" * 80)

        if dry_run:
            logger.info("\n🔍 DRY RUN MODE - No changes were saved to database")
            logger.info("Run without --dry-run to apply changes")

    except Exception as e:
        logger.error(f"❌ Fatal error: {str(e)}")
        raise
    finally:
        await tmdb_service.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fix failed VOD metadata enrichment")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without saving to database",
    )

    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))

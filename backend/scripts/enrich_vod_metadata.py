"""
VOD Metadata Enrichment Script
Scans all VOD content for missing metadata and enriches it using TMDB API
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.content import Content
from app.services.tmdb_service import tmdb_service
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def connect_db():
    """Connect to MongoDB"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=database,
        document_models=[Content]
    )
    logger.info("✅ Connected to MongoDB")


def needs_enrichment(content: Content) -> tuple[bool, list[str]]:
    """
    Check if content needs metadata enrichment.
    Returns (needs_enrichment, list_of_missing_fields)
    """
    missing = []

    # Critical fields that should always be present
    if not content.thumbnail and not content.thumbnail_data and not content.poster_url:
        missing.append("thumbnail/poster")

    if not content.backdrop and not content.backdrop_data:
        missing.append("backdrop")

    if not content.description:
        missing.append("description")

    # TMDB metadata
    if not content.tmdb_id:
        missing.append("tmdb_id")

    if not content.imdb_id:
        missing.append("imdb_id")

    if not content.genres or len(content.genres) == 0:
        missing.append("genres")

    if not content.cast or len(content.cast) == 0:
        missing.append("cast")

    if not content.director:
        missing.append("director")

    if not content.trailer_url:
        missing.append("trailer")

    return len(missing) > 0, missing


async def enrich_content(content: Content, dry_run: bool = False) -> bool:
    """
    Enrich a single content item with TMDB metadata.
    Returns True if successful, False otherwise.
    """
    try:
        logger.info(f"📝 Processing: {content.title} (ID: {content.id})")

        # Determine content type
        is_series = content.is_series or content.season is not None

        # Fetch metadata from TMDB
        if is_series:
            logger.info(f"   🎬 Fetching TV series metadata for: {content.title}")
            metadata = await tmdb_service.enrich_series_content(
                title=content.title,
                year=content.year
            )
        else:
            logger.info(f"   🎬 Fetching movie metadata for: {content.title}")
            metadata = await tmdb_service.enrich_movie_content(
                title=content.title,
                year=content.year
            )

        if not metadata.get("tmdb_id"):
            logger.warning(f"   ⚠️  No TMDB results found for: {content.title}")
            return False

        # Update fields
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
            # Also set as thumbnail if missing
            if not content.thumbnail:
                content.thumbnail = metadata["poster"]
            updated_fields.append("poster/thumbnail")

        if metadata.get("backdrop") and not content.backdrop:
            content.backdrop = metadata["backdrop"]
            updated_fields.append("backdrop")

        if metadata.get("genres") and (not content.genres or len(content.genres) == 0):
            content.genres = metadata["genres"]
            # Set primary genre as well
            if metadata["genres"]:
                content.genre = metadata["genres"][0]
            updated_fields.append("genres")

        if metadata.get("cast") and (not content.cast or len(content.cast) == 0):
            content.cast = metadata["cast"]
            updated_fields.append("cast")

        if metadata.get("director") and not content.director:
            content.director = metadata["director"]
            updated_fields.append("director")

        if metadata.get("trailer_url") and not content.trailer_url:
            content.trailer_url = metadata["trailer_url"]
            updated_fields.append("trailer")

        if metadata.get("runtime") and not content.duration:
            # Convert runtime minutes to HH:MM:SS format
            runtime_min = metadata["runtime"]
            hours = runtime_min // 60
            minutes = runtime_min % 60
            content.duration = f"{hours}:{minutes:02d}:00"
            updated_fields.append("duration")

        # Series-specific fields
        if is_series:
            if metadata.get("total_seasons") and not content.total_seasons:
                content.total_seasons = metadata["total_seasons"]
                updated_fields.append("total_seasons")

            if metadata.get("total_episodes") and not content.total_episodes:
                content.total_episodes = metadata["total_episodes"]
                updated_fields.append("total_episodes")

        # Set content type
        if not content.content_type:
            content.content_type = "series" if is_series else "movie"
            updated_fields.append("content_type")

        if not updated_fields:
            logger.info(f"   ℹ️  No updates needed for: {content.title}")
            return False

        logger.info(f"   ✅ Updated fields: {', '.join(updated_fields)}")

        if not dry_run:
            await content.save()
            logger.info(f"   💾 Saved to database")
        else:
            logger.info(f"   🔍 DRY RUN - No changes saved")

        return True

    except Exception as e:
        logger.error(f"   ❌ Error enriching {content.title}: {str(e)}")
        return False


async def main(dry_run: bool = False, limit: int = None):
    """
    Main function to enrich all VOD content.

    Args:
        dry_run: If True, only log what would be changed without saving
        limit: Maximum number of items to process (None for all)
    """
    try:
        await connect_db()

        # Query all content
        logger.info("🔍 Scanning VOD library...")

        all_content = await Content.find_all().to_list()
        logger.info(f"📊 Total content items: {len(all_content)}")

        # Filter content that needs enrichment
        needs_update = []
        for content in all_content:
            needs, missing = needs_enrichment(content)
            if needs:
                needs_update.append((content, missing))

        logger.info(f"📋 Content needing enrichment: {len(needs_update)}")

        if not needs_update:
            logger.info("✨ All content already has complete metadata!")
            return

        # Show summary
        logger.info("\n" + "="*80)
        logger.info("ENRICHMENT SUMMARY")
        logger.info("="*80)
        for content, missing in needs_update[:10]:  # Show first 10
            logger.info(f"  • {content.title}: Missing {', '.join(missing)}")
        if len(needs_update) > 10:
            logger.info(f"  ... and {len(needs_update) - 10} more")
        logger.info("="*80 + "\n")

        # Apply limit if specified
        if limit:
            needs_update = needs_update[:limit]
            logger.info(f"🎯 Processing first {limit} items")

        # Process each content
        success_count = 0
        failed_count = 0
        skipped_count = 0

        for idx, (content, missing) in enumerate(needs_update, 1):
            logger.info(f"\n[{idx}/{len(needs_update)}] {'-'*60}")

            success = await enrich_content(content, dry_run=dry_run)

            if success:
                success_count += 1
            elif success is False:
                failed_count += 1
            else:
                skipped_count += 1

            # Add small delay to avoid rate limiting
            await asyncio.sleep(0.5)

        # Final summary
        logger.info("\n" + "="*80)
        logger.info("ENRICHMENT COMPLETE")
        logger.info("="*80)
        logger.info(f"✅ Successfully enriched: {success_count}")
        logger.info(f"❌ Failed: {failed_count}")
        logger.info(f"⏭️  Skipped (no changes): {skipped_count}")
        logger.info(f"📊 Total processed: {len(needs_update)}")
        logger.info("="*80)

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

    parser = argparse.ArgumentParser(description="Enrich VOD metadata from TMDB")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without saving to database"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Maximum number of items to process"
    )

    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))

"""
VOD Metadata Enrichment Script
Scans all VOD content for missing metadata and enriches it using TMDB API
"""

import asyncio
import re
import sys
import traceback
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

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

# Regex patterns for episode title formats
EPISODE_TITLE_PATTERNS = [
    # "SeriesName-Season1-Episode5" or "SeriesName-S01-E05"
    re.compile(
        r"^(.+?)[-_ ]*(?:Season|S)\s*\d+[-_ ]*(?:Episode|E|Ep)\s*\d+",
        re.IGNORECASE,
    ),
    # "SeriesName S01E05"
    re.compile(r"^(.+?)[-_ ]*S\d+E\d+", re.IGNORECASE),
    # "SeriesName - Episode 5" or "SeriesName Episode 5"
    re.compile(r"^(.+?)[-_ ]*(?:Episode|Ep)\s*\d+", re.IGNORECASE),
]


def extract_series_name(title: str) -> str:
    """
    Extract the series name from an episode title.
    e.g. "HaBurganim-Season1-Episode5" -> "HaBurganim"
         "The Son-Season1-Episode2" -> "The Son"
         "Rain Dogs-Season1-Episode1" -> "Rain Dogs"
    Falls back to original title if no pattern matches.
    """
    for pattern in EPISODE_TITLE_PATTERNS:
        match = pattern.match(title)
        if match:
            series_name = match.group(1).strip().rstrip("-_ ")
            if series_name:
                return series_name
    return title


def is_episode_content(content: Content) -> bool:
    """Check if content is an individual episode (not a series parent)."""
    if content.content_type and content.content_type.lower() == "episode":
        return True
    if content.episode is not None:
        return True
    if content.series_id:
        return True
    return False


def is_series_type(content: Content) -> bool:
    """
    Determine if content is series-type using category_name and content_type.
    The is_series field was removed; we use category and structural fields.
    """
    # Check content_type field
    ct = (content.content_type or "").lower()
    if ct in ("series", "episode"):
        return True

    # Check category_name for series keywords
    cat = (content.category_name or "").lower()
    series_keywords = ["series", "סדרות", "israeli series", "סדרות ישראליות"]
    if any(kw in cat for kw in series_keywords):
        return True

    # Check structural fields
    if content.season is not None or content.series_id:
        return True
    if content.total_episodes and content.total_episodes > 0:
        return True

    return False


async def connect_db() -> AsyncIOMotorClient:
    """Connect to MongoDB and return the client."""
    from pymongo.errors import OperationFailure

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.MONGODB_DB_NAME]

    try:
        await init_beanie(database=database, document_models=[Content])
    except OperationFailure as e:
        if "IndexOptionsConflict" in str(e) or e.code == 85:
            logger.warning("Index conflict (existing DB indexes differ) - continuing with existing indexes")
        else:
            raise

    logger.info("Connected to MongoDB")
    return client


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


async def save_updates(
    content: Content, updated_fields_map: dict, db_client: AsyncIOMotorClient
) -> bool:
    """
    Save updated fields using direct MongoDB $set instead of Beanie save().
    This avoids full-document replace which can trigger validation/index conflicts.
    """
    if not updated_fields_map:
        return False

    db = db_client[settings.MONGODB_DB_NAME]
    result = await db.content.update_one(
        {"_id": content.id},
        {"$set": updated_fields_map},
    )
    return result.modified_count > 0


async def enrich_content(
    content: Content, db_client: AsyncIOMotorClient, dry_run: bool = False
) -> bool:
    """
    Enrich a single content item with TMDB metadata.
    Returns True if successful, False otherwise.
    """
    try:
        logger.info(f"Processing: {content.title} (ID: {content.id})")

        is_series = is_series_type(content)
        is_episode = is_episode_content(content)

        # For episodes, extract the series name for TMDB search
        search_title = content.title
        if is_episode:
            extracted = extract_series_name(content.title)
            if extracted != content.title:
                logger.info(
                    f"   Episode detected - extracted series name: '{extracted}'"
                )
                search_title = extracted

        # Use title_en if the primary title is non-Latin (Hebrew, etc.)
        if content.title_en and not search_title[0].isascii():
            search_title = content.title_en
            logger.info(f"   Using English title for TMDB search: '{search_title}'")

        # Fetch metadata from TMDB
        if is_series or is_episode:
            logger.info(f"   Fetching TV series metadata for: {search_title}")
            metadata = await tmdb_service.enrich_series_content(
                title=search_title, year=content.year
            )
        else:
            logger.info(f"   Fetching movie metadata for: {search_title}")
            metadata = await tmdb_service.enrich_movie_content(
                title=search_title, year=content.year
            )

        if not metadata.get("tmdb_id"):
            logger.warning(f"   No TMDB results found for: {search_title}")
            return False

        # Build $set update map (only changed fields)
        updates = {}
        updated_field_names = []

        if metadata.get("tmdb_id") and not content.tmdb_id:
            updates["tmdb_id"] = metadata["tmdb_id"]
            updated_field_names.append("tmdb_id")

        if metadata.get("imdb_id") and not content.imdb_id:
            updates["imdb_id"] = metadata["imdb_id"]
            updated_field_names.append("imdb_id")

        if metadata.get("overview") and not content.description:
            updates["description"] = metadata["overview"]
            updated_field_names.append("description")

        if metadata.get("poster") and not content.poster_url:
            updates["poster_url"] = metadata["poster"]
            if not content.thumbnail:
                updates["thumbnail"] = metadata["poster"]
            updated_field_names.append("poster/thumbnail")

        if metadata.get("backdrop") and not content.backdrop:
            updates["backdrop"] = metadata["backdrop"]
            updated_field_names.append("backdrop")

        if metadata.get("genres") and (not content.genres or len(content.genres) == 0):
            updates["genres"] = metadata["genres"]
            if metadata["genres"]:
                updates["genre"] = metadata["genres"][0]
            updated_field_names.append("genres")

        if metadata.get("cast") and (not content.cast or len(content.cast) == 0):
            updates["cast"] = metadata["cast"]
            updated_field_names.append("cast")

        if metadata.get("director") and not content.director:
            updates["director"] = metadata["director"]
            updated_field_names.append("director")

        if metadata.get("imdb_rating") is not None and content.imdb_rating is None:
            updates["imdb_rating"] = metadata["imdb_rating"]
            updated_field_names.append("imdb_rating")

        if metadata.get("imdb_votes") is not None and content.imdb_votes is None:
            updates["imdb_votes"] = metadata["imdb_votes"]
            updated_field_names.append("imdb_votes")

        if metadata.get("release_year") and not content.year:
            updates["year"] = metadata["release_year"]
            updated_field_names.append("year")

        if metadata.get("trailer_url") and not content.trailer_url:
            updates["trailer_url"] = metadata["trailer_url"]
            updated_field_names.append("trailer")

        if metadata.get("runtime") and not content.duration:
            runtime_min = metadata["runtime"]
            hours = runtime_min // 60
            minutes = runtime_min % 60
            updates["duration"] = f"{hours}:{minutes:02d}:00"
            updated_field_names.append("duration")

        # Series-specific fields (only for parent series, not episodes)
        if is_series and not is_episode:
            if metadata.get("total_seasons") and not content.total_seasons:
                updates["total_seasons"] = metadata["total_seasons"]
                updated_field_names.append("total_seasons")

            if metadata.get("total_episodes") and not content.total_episodes:
                updates["total_episodes"] = metadata["total_episodes"]
                updated_field_names.append("total_episodes")

        # Set content type if missing
        if not content.content_type:
            if is_episode:
                updates["content_type"] = "episode"
            elif is_series:
                updates["content_type"] = "series"
            else:
                updates["content_type"] = "movie"
            updated_field_names.append("content_type")

        if not updates:
            logger.info(f"   No updates needed for: {content.title}")
            return False

        logger.info(f"   Updated fields: {', '.join(updated_field_names)}")

        if not dry_run:
            saved = await save_updates(content, updates, db_client)
            if saved:
                logger.info("   Saved to database")
            else:
                logger.warning("   No document modified (already up to date)")
        else:
            logger.info("   DRY RUN - No changes saved")

        return True

    except Exception as e:
        logger.error(
            f"   Error enriching {content.title}: {type(e).__name__}: {repr(e)}"
        )
        logger.debug(traceback.format_exc())
        return False


async def main(dry_run: bool = False, limit: int = None):
    """
    Main function to enrich all VOD content.

    Args:
        dry_run: If True, only log what would be changed without saving
        limit: Maximum number of items to process (None for all)
    """
    try:
        db_client = await connect_db()

        # Query all content (excluding audiobooks and podcasts)
        logger.info("Scanning VOD library...")

        all_content = await Content.find_all().to_list()
        logger.info(f"Total content items: {len(all_content)}")

        # Filter content that needs enrichment (exclude audiobooks and podcasts)
        needs_update = []
        excluded_count = 0
        for content in all_content:
            # Skip audiobooks and podcasts
            content_type = getattr(content, "content_type", None)
            if content_type and content_type.lower() in ("audiobook", "podcast"):
                excluded_count += 1
                continue

            needs, missing = needs_enrichment(content)
            if needs:
                needs_update.append((content, missing))

        if excluded_count > 0:
            logger.info(
                f"Excluded {excluded_count} audiobooks/podcasts from enrichment"
            )

        logger.info(f"Content needing enrichment: {len(needs_update)}")

        if not needs_update:
            logger.info("All content already has complete metadata!")
            return

        # Show summary
        logger.info("\n" + "=" * 80)
        logger.info("ENRICHMENT SUMMARY")
        logger.info("=" * 80)
        for content, missing in needs_update[:10]:  # Show first 10
            logger.info(f"  {content.title}: Missing {', '.join(missing)}")
        if len(needs_update) > 10:
            logger.info(f"  ... and {len(needs_update) - 10} more")
        logger.info("=" * 80 + "\n")

        # Apply limit if specified
        if limit:
            needs_update = needs_update[:limit]
            logger.info(f"Processing first {limit} items")

        # Process each content
        success_count = 0
        failed_count = 0
        skipped_count = 0

        for idx, (content, missing) in enumerate(needs_update, 1):
            logger.info(f"\n[{idx}/{len(needs_update)}] {'-'*60}")

            success = await enrich_content(content, db_client, dry_run=dry_run)

            if success:
                success_count += 1
            elif success is False:
                failed_count += 1
            else:
                skipped_count += 1

            # Add small delay to avoid rate limiting
            await asyncio.sleep(0.5)

        # Final summary
        logger.info("\n" + "=" * 80)
        logger.info("ENRICHMENT COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Successfully enriched: {success_count}")
        logger.info(f"Failed: {failed_count}")
        logger.info(f"Skipped (no changes): {skipped_count}")
        logger.info(f"Total processed: {len(needs_update)}")
        logger.info("=" * 80)

        if dry_run:
            logger.info("\nDRY RUN MODE - No changes were saved to database")
            logger.info("Run without --dry-run to apply changes")

    except Exception as e:
        logger.error(f"Fatal error: {type(e).__name__}: {repr(e)}")
        logger.error(traceback.format_exc())
        raise
    finally:
        await tmdb_service.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Enrich VOD metadata from TMDB")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without saving to database",
    )
    parser.add_argument("--limit", type=int, help="Maximum number of items to process")

    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))

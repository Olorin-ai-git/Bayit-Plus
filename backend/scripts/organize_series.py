#!/usr/bin/env python3
"""
Script to organize all series in the database.

This script:
1. Scans the database for all series content
2. Groups episodes by series name and season
3. Creates series parent objects (if they don't exist)
4. Fetches TMDB metadata for each series
5. Links episodes to their series parent
6. Propagates poster/backdrop/metadata to episodes

Usage:
    poetry run python scripts/organize_series.py
"""

import asyncio
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Hebrew series name mapping (Hebrew -> English for TMDB search)
HEBREW_SERIES_MAPPING = {
    "הבורגנים": "The Bourgeois",  # Israeli drama series
    "פאודה": "Fauda",
    "שטיסל": "Shtisel",
    "טהרן": "Tehran",
    "הבורר": "The Arbitrator",
    "מאפיה": "Mafia",
}


class SeriesOrganizer:
    """Organizes series content in the database."""

    def __init__(self, db):
        self.db = db
        self.tmdb_service = None
        self.stats = {
            "series_found": 0,
            "series_created": 0,
            "series_updated": 0,
            "episodes_linked": 0,
            "episodes_enriched": 0,
            "tmdb_fetched": 0,
            "errors": 0,
        }

    async def initialize_tmdb(self):
        """Initialize TMDB service."""
        try:
            from app.services.tmdb_service import TMDBService
            self.tmdb_service = TMDBService()
            logger.info("✅ TMDB service initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize TMDB service: {e}")
            self.tmdb_service = None

    def extract_series_info(self, title: str) -> Tuple[str, Optional[int], Optional[int]]:
        """
        Extract series name, season, and episode from title.

        Returns: (series_name, season_number, episode_number)
        """
        # Pattern: "Series Name S01E01" or "Series Name S01E01 - Episode Title"
        pattern = r'^(.+?)\s*[Ss](\d+)[Ee](\d+)'
        match = re.match(pattern, title)

        if match:
            series_name = match.group(1).strip()
            season = int(match.group(2))
            episode = int(match.group(3))
            return series_name, season, episode

        # Try Hebrew patterns
        hebrew_season = r'עונה\s*(\d+)'
        hebrew_episode = r'פרק\s*(\d+)'

        season_match = re.search(hebrew_season, title)
        episode_match = re.search(hebrew_episode, title)

        if season_match or episode_match:
            # Remove Hebrew markers to get series name
            series_name = re.sub(hebrew_season, '', title)
            series_name = re.sub(hebrew_episode, '', series_name)
            series_name = re.sub(r'\s*-\s*$', '', series_name).strip()

            season = int(season_match.group(1)) if season_match else None
            episode = int(episode_match.group(1)) if episode_match else None

            return series_name, season, episode

        return title, None, None

    def is_hebrew(self, text: str) -> bool:
        """Check if text contains Hebrew characters."""
        return any(0x0590 <= ord(c) <= 0x05FF for c in text)

    async def scan_series(self) -> Dict[str, List[dict]]:
        """Scan database and group content by series."""
        logger.info("🔍 Scanning database for series content...")

        all_content = await self.db.content.find({}).to_list(None)
        logger.info(f"   Total content items: {len(all_content)}")

        # Group by series name
        series_groups = defaultdict(list)

        for content in all_content:
            title = content.get("title", "")
            series_name, season, episode = self.extract_series_info(title)

            # Only consider as series if we found season/episode info
            if season is not None or episode is not None:
                # Store parsed info with content
                content["_parsed_season"] = season
                content["_parsed_episode"] = episode
                series_groups[series_name].append(content)

        self.stats["series_found"] = len(series_groups)
        logger.info(f"✅ Found {len(series_groups)} series with {sum(len(eps) for eps in series_groups.values())} total episodes")

        return dict(series_groups)

    async def fetch_tmdb_series_data(self, series_name: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Fetch TMDB metadata for a series."""
        if not self.tmdb_service:
            return None

        # Check Hebrew mapping
        search_name = HEBREW_SERIES_MAPPING.get(series_name, series_name)

        try:
            logger.info(f"   🎬 Fetching TMDB data for '{search_name}'...")
            result = await self.tmdb_service.enrich_series_content(search_name, year)

            if result.get("tmdb_id"):
                self.stats["tmdb_fetched"] += 1
                logger.info(f"      ✅ Found: TMDB ID {result['tmdb_id']}")
                return result
            else:
                logger.warning(f"      ⚠️ No TMDB results for '{search_name}'")
                return None

        except Exception as e:
            logger.error(f"      ❌ TMDB error for '{search_name}': {e}")
            self.stats["errors"] += 1
            return None

    async def find_or_create_series_parent(
        self,
        series_name: str,
        episodes: List[dict],
        tmdb_data: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        """Find existing series parent or create a new one."""

        # Check if a series parent already exists
        existing = await self.db.content.find_one({
            "title": series_name,
            "content_type": "series",
            "is_series": True,
            "season": None,
            "episode": None
        })

        if existing:
            logger.info(f"   📂 Found existing series parent: {existing['_id']}")
            series_id = str(existing["_id"])

            # Update with TMDB data if available
            if tmdb_data and tmdb_data.get("tmdb_id"):
                await self.update_series_with_tmdb(existing["_id"], tmdb_data, episodes)
                self.stats["series_updated"] += 1

            return series_id

        # Create new series parent
        logger.info(f"   📁 Creating new series parent for '{series_name}'")

        # Get category from first episode
        category_id = episodes[0].get("category_id") if episodes else None

        # Calculate total seasons and episodes
        seasons = set()
        for ep in episodes:
            if ep.get("_parsed_season"):
                seasons.add(ep["_parsed_season"])

        # Build series document
        now = datetime.now(timezone.utc)
        series_doc = {
            "title": series_name,
            "title_en": tmdb_data.get("original_title") if tmdb_data else None,
            "description": tmdb_data.get("overview") if tmdb_data else None,
            "description_en": tmdb_data.get("overview") if tmdb_data else None,
            "category_id": category_id,
            "content_type": "series",
            "is_series": True,
            "is_published": True,
            "season": None,
            "episode": None,
            "total_seasons": len(seasons) if seasons else (tmdb_data.get("total_seasons") if tmdb_data else None),
            "total_episodes": len(episodes),
            "stream_url": "",  # Parent has no stream
            "stream_type": "hls",
            "created_at": now,
            "updated_at": now,
        }

        # Add TMDB data
        if tmdb_data:
            series_doc.update({
                "tmdb_id": tmdb_data.get("tmdb_id"),
                "imdb_id": tmdb_data.get("imdb_id"),
                "imdb_rating": tmdb_data.get("imdb_rating"),
                "imdb_votes": tmdb_data.get("imdb_votes"),
                "poster_url": tmdb_data.get("poster"),
                "thumbnail": tmdb_data.get("poster"),
                "backdrop": tmdb_data.get("backdrop"),
                "trailer_url": tmdb_data.get("trailer_url"),
                "genres": tmdb_data.get("genres"),
                "cast": tmdb_data.get("cast"),
                "year": tmdb_data.get("release_year"),
            })
        else:
            # Try to get poster from first episode
            for ep in episodes:
                if ep.get("poster_url") or ep.get("thumbnail"):
                    series_doc["poster_url"] = ep.get("poster_url")
                    series_doc["thumbnail"] = ep.get("thumbnail") or ep.get("poster_url")
                    series_doc["backdrop"] = ep.get("backdrop")
                    break

        result = await self.db.content.insert_one(series_doc)
        series_id = str(result.inserted_id)
        self.stats["series_created"] += 1

        logger.info(f"      ✅ Created series parent: {series_id}")
        return series_id

    async def update_series_with_tmdb(self, series_oid: ObjectId, tmdb_data: Dict[str, Any], episodes: List[dict]):
        """Update existing series with TMDB data."""
        update_data = {
            "updated_at": datetime.now(timezone.utc),
            "total_episodes": len(episodes),
        }

        if tmdb_data.get("tmdb_id"):
            update_data["tmdb_id"] = tmdb_data["tmdb_id"]
        if tmdb_data.get("imdb_id"):
            update_data["imdb_id"] = tmdb_data["imdb_id"]
        if tmdb_data.get("imdb_rating"):
            update_data["imdb_rating"] = tmdb_data["imdb_rating"]
        if tmdb_data.get("poster"):
            update_data["poster_url"] = tmdb_data["poster"]
            update_data["thumbnail"] = tmdb_data["poster"]
        if tmdb_data.get("backdrop"):
            update_data["backdrop"] = tmdb_data["backdrop"]
        if tmdb_data.get("trailer_url"):
            update_data["trailer_url"] = tmdb_data["trailer_url"]
        if tmdb_data.get("genres"):
            update_data["genres"] = tmdb_data["genres"]
        if tmdb_data.get("cast"):
            update_data["cast"] = tmdb_data["cast"]
        if tmdb_data.get("overview"):
            update_data["description"] = tmdb_data["overview"]
            update_data["description_en"] = tmdb_data["overview"]
        if tmdb_data.get("total_seasons"):
            update_data["total_seasons"] = tmdb_data["total_seasons"]

        await self.db.content.update_one(
            {"_id": series_oid},
            {"$set": update_data}
        )
        logger.info(f"      ✅ Updated series with TMDB data")

    async def link_episodes_to_series(
        self,
        series_id: str,
        series_name: str,
        episodes: List[dict],
        tmdb_data: Optional[Dict[str, Any]]
    ):
        """Link episodes to series parent and propagate metadata."""
        logger.info(f"   🔗 Linking {len(episodes)} episodes to series...")

        for ep in episodes:
            ep_id = ep["_id"]
            season = ep.get("_parsed_season")
            episode_num = ep.get("_parsed_episode")

            update_data = {
                "series_id": series_id,
                "is_series": True,
                "content_type": "episode",
                "updated_at": datetime.now(timezone.utc),
            }

            if season is not None:
                update_data["season"] = season
            if episode_num is not None:
                update_data["episode"] = episode_num

            # Propagate metadata from TMDB if episode doesn't have it
            if tmdb_data:
                if not ep.get("poster_url") and tmdb_data.get("poster"):
                    update_data["poster_url"] = tmdb_data["poster"]
                if not ep.get("thumbnail") and tmdb_data.get("poster"):
                    update_data["thumbnail"] = tmdb_data["poster"]
                if not ep.get("backdrop") and tmdb_data.get("backdrop"):
                    update_data["backdrop"] = tmdb_data["backdrop"]
                if not ep.get("genres") and tmdb_data.get("genres"):
                    update_data["genres"] = tmdb_data["genres"]
                if not ep.get("cast") and tmdb_data.get("cast"):
                    update_data["cast"] = tmdb_data["cast"]
                if not ep.get("tmdb_id") and tmdb_data.get("tmdb_id"):
                    update_data["tmdb_id"] = tmdb_data["tmdb_id"]
                if not ep.get("imdb_id") and tmdb_data.get("imdb_id"):
                    update_data["imdb_id"] = tmdb_data["imdb_id"]

            await self.db.content.update_one(
                {"_id": ep_id},
                {"$set": update_data}
            )
            self.stats["episodes_linked"] += 1

            if len(update_data) > 4:  # More than just series_id, is_series, content_type, updated_at
                self.stats["episodes_enriched"] += 1

        logger.info(f"      ✅ Linked {len(episodes)} episodes")

    async def organize_all_series(self):
        """Main method to organize all series."""
        logger.info("=" * 80)
        logger.info("SERIES ORGANIZATION SCRIPT")
        logger.info("=" * 80)

        # Initialize TMDB
        await self.initialize_tmdb()

        # Scan for series
        series_groups = await self.scan_series()

        if not series_groups:
            logger.info("No series found in database.")
            return

        # Process each series
        logger.info("\n" + "=" * 80)
        logger.info("PROCESSING SERIES")
        logger.info("=" * 80)

        for series_name, episodes in sorted(series_groups.items(), key=lambda x: -len(x[1])):
            logger.info(f"\n📺 Processing: {series_name} ({len(episodes)} episodes)")

            # Check if Hebrew
            is_hebrew = self.is_hebrew(series_name)
            if is_hebrew:
                logger.info(f"   [HEBREW SERIES]")

            # Get first air year from episodes
            years = [ep.get("year") for ep in episodes if ep.get("year")]
            year = min(years) if years else None

            # Fetch TMDB data
            tmdb_data = await self.fetch_tmdb_series_data(series_name, year)

            # Find or create series parent
            series_id = await self.find_or_create_series_parent(series_name, episodes, tmdb_data)

            if series_id:
                # Link episodes
                await self.link_episodes_to_series(series_id, series_name, episodes, tmdb_data)
            else:
                logger.error(f"   ❌ Failed to create series parent for '{series_name}'")
                self.stats["errors"] += 1

            # Rate limit TMDB calls
            await asyncio.sleep(0.5)

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print organization summary."""
        logger.info("\n" + "=" * 80)
        logger.info("ORGANIZATION SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Series found:      {self.stats['series_found']}")
        logger.info(f"Series created:    {self.stats['series_created']}")
        logger.info(f"Series updated:    {self.stats['series_updated']}")
        logger.info(f"Episodes linked:   {self.stats['episodes_linked']}")
        logger.info(f"Episodes enriched: {self.stats['episodes_enriched']}")
        logger.info(f"TMDB data fetched: {self.stats['tmdb_fetched']}")
        logger.info(f"Errors:            {self.stats['errors']}")
        logger.info("=" * 80)


async def main():
    """Main entry point."""
    # Connect to MongoDB
    url = "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/bayit_plus?retryWrites=true&w=majority"
    client = AsyncIOMotorClient(url)
    db = client["bayit_plus"]

    logger.info("📡 Connected to MongoDB")

    try:
        organizer = SeriesOrganizer(db)
        await organizer.organize_all_series()
    finally:
        if organizer.tmdb_service:
            await organizer.tmdb_service.close()
        client.close()
        logger.info("🔌 Disconnected from MongoDB")


if __name__ == "__main__":
    asyncio.run(main())

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
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(backend_dir / ".env")

import logging

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
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
            "episodes_titles_cleaned": 0,
            "orphans_detected": 0,
            "orphans_relinked": 0,
            "orphan_parents_created": 0,
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

    def extract_series_info(
        self, title: str
    ) -> Tuple[str, Optional[int], Optional[int]]:
        """
        Extract series name, season, and episode from title.

        Returns: (series_name, season_number, episode_number)
        """
        # Pattern: "Series Name S01E01" or "Series Name S01E01 - Episode Title"
        pattern = r"^(.+?)\s*[Ss](\d+)[Ee](\d+)"
        match = re.match(pattern, title)

        if match:
            series_name = match.group(1).strip()
            season = int(match.group(2))
            episode = int(match.group(3))
            return series_name, season, episode

        # Try Hebrew patterns
        hebrew_season = r"עונה\s*(\d+)"
        hebrew_episode = r"פרק\s*(\d+)"

        season_match = re.search(hebrew_season, title)
        episode_match = re.search(hebrew_episode, title)

        if season_match or episode_match:
            # Remove Hebrew markers to get series name
            series_name = re.sub(hebrew_season, "", title)
            series_name = re.sub(hebrew_episode, "", series_name)
            series_name = re.sub(r"\s*-\s*$", "", series_name).strip()

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
        logger.info(
            f"✅ Found {len(series_groups)} series with {sum(len(eps) for eps in series_groups.values())} total episodes"
        )

        return dict(series_groups)

    async def fetch_tmdb_series_data(
        self, series_name: str, year: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
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
        tmdb_data: Optional[Dict[str, Any]],
    ) -> Optional[str]:
        """Find existing series parent or create a new one."""

        # Check if a series parent already exists
        existing = await self.db.content.find_one(
            {
                "title": series_name,
                "content_type": "series",
                "is_series": True,
                "season": None,
                "episode": None,
            }
        )

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
            "total_seasons": len(seasons)
            if seasons
            else (tmdb_data.get("total_seasons") if tmdb_data else None),
            "total_episodes": len(episodes),
            "stream_url": "",  # Parent has no stream
            "stream_type": "hls",
            "created_at": now,
            "updated_at": now,
        }

        # Add TMDB data
        if tmdb_data:
            series_doc.update(
                {
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
                }
            )
        else:
            # Try to get poster from first episode
            for ep in episodes:
                if ep.get("poster_url") or ep.get("thumbnail"):
                    series_doc["poster_url"] = ep.get("poster_url")
                    series_doc["thumbnail"] = ep.get("thumbnail") or ep.get(
                        "poster_url"
                    )
                    series_doc["backdrop"] = ep.get("backdrop")
                    break

        result = await self.db.content.insert_one(series_doc)
        series_id = str(result.inserted_id)
        self.stats["series_created"] += 1

        logger.info(f"      ✅ Created series parent: {series_id}")
        return series_id

    async def update_series_with_tmdb(
        self, series_oid: ObjectId, tmdb_data: Dict[str, Any], episodes: List[dict]
    ):
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

        await self.db.content.update_one({"_id": series_oid}, {"$set": update_data})
        logger.info(f"      ✅ Updated series with TMDB data")

    async def link_episodes_to_series(
        self,
        series_id: str,
        series_name: str,
        episodes: List[dict],
        tmdb_data: Optional[Dict[str, Any]],
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

            await self.db.content.update_one({"_id": ep_id}, {"$set": update_data})
            self.stats["episodes_linked"] += 1

            if (
                len(update_data) > 4
            ):  # More than just series_id, is_series, content_type, updated_at
                self.stats["episodes_enriched"] += 1

        logger.info(f"      ✅ Linked {len(episodes)} episodes")

    def format_episode_title(
        self, series_title: str, season: int, episode: int
    ) -> str:
        """Format episode title as: SeriesTitle-Season{N}-Episode{N}"""
        return f"{series_title.strip()}-Season{season}-Episode{episode}"

    def normalize_title_for_matching(self, title: str) -> str:
        """Normalize title for matching (lowercase, remove special chars)."""
        normalized = title.lower()
        normalized = re.sub(r"[^\w\s]", "", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    async def detect_orphan_episodes(self) -> List[dict]:
        """Detect episodes with invalid series_id (parent doesn't exist)."""
        logger.info("🔍 Detecting orphan episodes...")

        # Find all episodes (have series_id, season, episode set)
        episodes = await self.db.content.find(
            {
                "series_id": {"$ne": None},
                "season": {"$ne": None},
                "episode": {"$ne": None},
            }
        ).to_list(None)

        orphans = []
        for ep in episodes:
            series_id = ep.get("series_id")
            if not series_id:
                continue

            # Check if parent exists
            try:
                parent = await self.db.content.find_one({"_id": ObjectId(series_id)})
                if not parent:
                    orphans.append(ep)
            except Exception:
                orphans.append(ep)

        self.stats["orphans_detected"] = len(orphans)
        logger.info(f"   Found {len(orphans)} orphan episodes")
        return orphans

    async def relink_orphan_episodes(self, orphans: List[dict]) -> int:
        """Relink orphan episodes to correct series parents by title matching."""
        if not orphans:
            return 0

        logger.info(f"🔗 Attempting to relink {len(orphans)} orphan episodes...")

        # Build series parent lookup by normalized title
        series_parents = await self.db.content.find(
            {
                "is_series": True,
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                ],
                "season": None,
            }
        ).to_list(None)

        # Create lookup dict
        series_lookup: Dict[str, dict] = {}
        for parent in series_parents:
            norm = self.normalize_title_for_matching(parent.get("title", ""))
            if parent.get("season") is None and parent.get("episode") is None:
                series_lookup[norm] = parent

        relinked = 0
        for ep in orphans:
            title = ep.get("title", "")
            series_name, _, _ = self.extract_series_info(title)
            norm_name = self.normalize_title_for_matching(series_name)

            if norm_name in series_lookup:
                new_parent = series_lookup[norm_name]
                await self.db.content.update_one(
                    {"_id": ep["_id"]},
                    {"$set": {"series_id": str(new_parent["_id"])}}
                )
                relinked += 1
                logger.info(f"   ✅ Relinked: {title} -> {new_parent.get('title')}")

        self.stats["orphans_relinked"] = relinked
        logger.info(f"   Relinked {relinked} orphan episodes")
        return relinked

    async def create_parents_for_remaining_orphans(
        self, orphans: List[dict]
    ) -> int:
        """Create parent series for orphans that couldn't be relinked."""
        # Re-check which orphans still have invalid parents
        still_orphaned = []
        for ep in orphans:
            series_id = ep.get("series_id")
            try:
                parent = await self.db.content.find_one({"_id": ObjectId(series_id)})
                if not parent:
                    still_orphaned.append(ep)
            except Exception:
                still_orphaned.append(ep)

        if not still_orphaned:
            return 0

        logger.info(
            f"📁 Creating parents for {len(still_orphaned)} remaining orphans..."
        )

        # Group by series name
        orphan_groups: Dict[str, List[dict]] = defaultdict(list)
        for ep in still_orphaned:
            series_name, _, _ = self.extract_series_info(ep.get("title", ""))
            if series_name:
                orphan_groups[series_name].append(ep)

        created = 0
        for series_name, episodes in orphan_groups.items():
            # Get sample episode
            sample = episodes[0]
            seasons = set(ep.get("season") for ep in episodes if ep.get("season"))

            # Create parent
            now = datetime.now(timezone.utc)
            series_doc = {
                "title": series_name,
                "is_series": True,
                "content_type": "series",
                "season": None,
                "episode": None,
                "series_id": None,
                "total_seasons": len(seasons) if seasons else 1,
                "total_episodes": len(episodes),
                "stream_url": sample.get("stream_url", ""),
                "stream_type": sample.get("stream_type", "hls"),
                "is_published": sample.get("is_published", True),
                "category_id": sample.get("category_id"),
                "section_ids": sample.get("section_ids", []),
                "primary_section_id": sample.get("primary_section_id"),
                "content_format": "series",
                "thumbnail": sample.get("thumbnail"),
                "backdrop": sample.get("backdrop"),
                "created_at": now,
                "updated_at": now,
            }

            result = await self.db.content.insert_one(series_doc)
            parent_id = str(result.inserted_id)
            created += 1

            # Link episodes to new parent
            for ep in episodes:
                await self.db.content.update_one(
                    {"_id": ep["_id"]},
                    {"$set": {"series_id": parent_id}}
                )

            logger.info(
                f"   ✅ Created '{series_name}' with {len(episodes)} episodes"
            )

        self.stats["orphan_parents_created"] = created
        return created

    async def clean_episode_titles(self) -> int:
        """Clean all episode titles to format: SeriesTitle-Season{N}-Episode{N}"""
        logger.info("🧹 Cleaning episode titles...")

        # Find all episodes with valid parents
        episodes = await self.db.content.find(
            {
                "series_id": {"$ne": None},
                "season": {"$ne": None},
                "episode": {"$ne": None},
            }
        ).to_list(None)

        # Cache parents
        parent_cache: Dict[str, dict] = {}
        cleaned = 0

        for ep in episodes:
            series_id = ep.get("series_id")
            if series_id not in parent_cache:
                try:
                    parent = await self.db.content.find_one(
                        {"_id": ObjectId(series_id)}
                    )
                    parent_cache[series_id] = parent
                except Exception:
                    parent_cache[series_id] = None

            parent = parent_cache.get(series_id)
            if not parent:
                continue

            new_title = self.format_episode_title(
                parent.get("title", ""),
                ep.get("season"),
                ep.get("episode"),
            )

            if ep.get("title") != new_title:
                await self.db.content.update_one(
                    {"_id": ep["_id"]},
                    {"$set": {"title": new_title}}
                )
                cleaned += 1

        self.stats["episodes_titles_cleaned"] = cleaned
        logger.info(f"   Cleaned {cleaned} episode titles")
        return cleaned

    async def verify_integrity(self) -> Dict[str, Any]:
        """Verify series/episode integrity and return report."""
        logger.info("🔍 Verifying series integrity...")

        report = {
            "total_series_parents": 0,
            "total_episodes": 0,
            "orphan_episodes": 0,
            "episodes_with_clean_titles": 0,
            "episodes_with_dirty_titles": 0,
            "series_without_episodes": [],
            "issues": [],
        }

        # Count series parents
        series_parents = await self.db.content.find(
            {
                "is_series": True,
                "season": None,
                "episode": None,
            }
        ).to_list(None)
        report["total_series_parents"] = len(series_parents)

        # Count episodes
        episodes = await self.db.content.find(
            {
                "series_id": {"$ne": None},
                "season": {"$ne": None},
                "episode": {"$ne": None},
            }
        ).to_list(None)
        report["total_episodes"] = len(episodes)

        # Check for orphans and title format
        parent_cache: Dict[str, dict] = {}
        for ep in episodes:
            series_id = ep.get("series_id")

            # Check parent exists
            if series_id not in parent_cache:
                try:
                    parent = await self.db.content.find_one(
                        {"_id": ObjectId(series_id)}
                    )
                    parent_cache[series_id] = parent
                except Exception:
                    parent_cache[series_id] = None

            parent = parent_cache.get(series_id)
            if not parent:
                report["orphan_episodes"] += 1
                continue

            # Check title format
            expected_title = self.format_episode_title(
                parent.get("title", ""),
                ep.get("season"),
                ep.get("episode"),
            )
            if ep.get("title") == expected_title:
                report["episodes_with_clean_titles"] += 1
            else:
                report["episodes_with_dirty_titles"] += 1

        # Check for series without episodes
        for parent in series_parents:
            parent_id = str(parent["_id"])
            episode_count = await self.db.content.count_documents(
                {"series_id": parent_id}
            )
            if episode_count == 0:
                report["series_without_episodes"].append(parent.get("title"))

        # Generate issues list
        if report["orphan_episodes"] > 0:
            report["issues"].append(
                f"{report['orphan_episodes']} orphan episodes found"
            )
        if report["episodes_with_dirty_titles"] > 0:
            report["issues"].append(
                f"{report['episodes_with_dirty_titles']} episodes with non-standard titles"
            )
        if report["series_without_episodes"]:
            report["issues"].append(
                f"{len(report['series_without_episodes'])} series without episodes"
            )

        return report

    async def organize_all_series(
        self, fix_orphans: bool = True, clean_titles: bool = True
    ):
        """Main method to organize all series."""
        logger.info("=" * 80)
        logger.info("SERIES ORGANIZATION SCRIPT")
        logger.info("=" * 80)

        # Initialize TMDB
        await self.initialize_tmdb()

        # Step 1: Detect and fix orphan episodes
        if fix_orphans:
            logger.info("\n" + "=" * 80)
            logger.info("PHASE 1: ORPHAN EPISODE DETECTION & REPAIR")
            logger.info("=" * 80)

            orphans = await self.detect_orphan_episodes()
            if orphans:
                # Try to relink to existing parents
                await self.relink_orphan_episodes(orphans)
                # Create parents for remaining orphans
                await self.create_parents_for_remaining_orphans(orphans)

        # Step 2: Scan for unlinked series content
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 2: SCANNING FOR UNLINKED SERIES")
        logger.info("=" * 80)

        series_groups = await self.scan_series()

        if series_groups:
            # Process each series
            logger.info("\n" + "=" * 80)
            logger.info("PHASE 3: PROCESSING SERIES")
            logger.info("=" * 80)

            for series_name, episodes in sorted(
                series_groups.items(), key=lambda x: -len(x[1])
            ):
                logger.info(
                    f"\n📺 Processing: {series_name} ({len(episodes)} episodes)"
                )

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
                series_id = await self.find_or_create_series_parent(
                    series_name, episodes, tmdb_data
                )

                if series_id:
                    # Link episodes
                    await self.link_episodes_to_series(
                        series_id, series_name, episodes, tmdb_data
                    )
                else:
                    logger.error(
                        f"   ❌ Failed to create series parent for '{series_name}'"
                    )
                    self.stats["errors"] += 1

                # Rate limit TMDB calls
                await asyncio.sleep(0.5)
        else:
            logger.info("No unlinked series found.")

        # Step 3: Clean episode titles
        if clean_titles:
            logger.info("\n" + "=" * 80)
            logger.info("PHASE 4: CLEANING EPISODE TITLES")
            logger.info("=" * 80)
            await self.clean_episode_titles()

        # Step 4: Final integrity verification
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 5: INTEGRITY VERIFICATION")
        logger.info("=" * 80)
        report = await self.verify_integrity()
        self.print_integrity_report(report)

        # Print summary
        self.print_summary()

    def print_integrity_report(self, report: Dict[str, Any]):
        """Print integrity verification report."""
        logger.info(f"   Series parents:        {report['total_series_parents']}")
        logger.info(f"   Total episodes:        {report['total_episodes']}")
        logger.info(f"   Orphan episodes:       {report['orphan_episodes']}")
        logger.info(f"   Clean titles:          {report['episodes_with_clean_titles']}")
        logger.info(f"   Dirty titles:          {report['episodes_with_dirty_titles']}")

        if report["series_without_episodes"]:
            logger.warning(
                f"   Series without episodes: {len(report['series_without_episodes'])}"
            )

        if report["issues"]:
            logger.warning("\n   ⚠️ ISSUES FOUND:")
            for issue in report["issues"]:
                logger.warning(f"      - {issue}")
        else:
            logger.info("\n   ✅ ALL INTEGRITY CHECKS PASSED")

    def print_summary(self):
        """Print organization summary."""
        logger.info("\n" + "=" * 80)
        logger.info("ORGANIZATION SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Series found:           {self.stats['series_found']}")
        logger.info(f"Series created:         {self.stats['series_created']}")
        logger.info(f"Series updated:         {self.stats['series_updated']}")
        logger.info(f"Episodes linked:        {self.stats['episodes_linked']}")
        logger.info(f"Episodes enriched:      {self.stats['episodes_enriched']}")
        logger.info(f"Titles cleaned:         {self.stats['episodes_titles_cleaned']}")
        logger.info(f"Orphans detected:       {self.stats['orphans_detected']}")
        logger.info(f"Orphans relinked:       {self.stats['orphans_relinked']}")
        logger.info(f"Orphan parents created: {self.stats['orphan_parents_created']}")
        logger.info(f"TMDB data fetched:      {self.stats['tmdb_fetched']}")
        logger.info(f"Errors:                 {self.stats['errors']}")
        logger.info("=" * 80)


async def main(
    verify_only: bool = False,
    fix_orphans: bool = True,
    clean_titles: bool = True,
):
    """Main entry point."""
    # Connect to MongoDB
    url = os.getenv("MONGODB_URI")
    if not url:
        raise RuntimeError("MONGODB_URI environment variable not set")
    client = AsyncIOMotorClient(url)
    db = client["bayit_plus"]

    logger.info("📡 Connected to MongoDB")

    organizer = SeriesOrganizer(db)

    try:
        if verify_only:
            # Only run integrity verification
            logger.info("=" * 80)
            logger.info("SERIES INTEGRITY VERIFICATION")
            logger.info("=" * 80)
            report = await organizer.verify_integrity()
            organizer.print_integrity_report(report)

            if report["issues"]:
                logger.info("\n💡 Run without --verify to fix issues")
                return 1
            return 0
        else:
            await organizer.organize_all_series(
                fix_orphans=fix_orphans,
                clean_titles=clean_titles,
            )
            return 0
    finally:
        if organizer.tmdb_service:
            await organizer.tmdb_service.close()
        client.close()
        logger.info("🔌 Disconnected from MongoDB")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Organize series content in the database"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Only verify integrity without making changes",
    )
    parser.add_argument(
        "--no-fix-orphans",
        action="store_true",
        help="Skip orphan episode detection and repair",
    )
    parser.add_argument(
        "--no-clean-titles",
        action="store_true",
        help="Skip episode title cleaning",
    )

    args = parser.parse_args()

    exit_code = asyncio.run(
        main(
            verify_only=args.verify,
            fix_orphans=not args.no_fix_orphans,
            clean_titles=not args.no_clean_titles,
        )
    )
    sys.exit(exit_code)

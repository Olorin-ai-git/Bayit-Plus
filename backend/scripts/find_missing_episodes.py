#!/usr/bin/env python3
"""
Script to find missing episodes in series by comparing against TMDB.

Scans the database and compares against TMDB to identify:
1. All series and their expected episode counts from TMDB
2. Missing episodes per season
3. Series not found in TMDB

Usage:
    poetry run python scripts/find_missing_episodes.py
"""

import asyncio
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.services.tmdb_service import TMDBService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Hebrew to English series name mapping for TMDB search
HEBREW_SERIES_MAPPING = {
    "הבורגנים": "The Bourgeois",
    "פאודה": "Fauda",
    "שטיסל": "Shtisel",
    "טהרן": "Tehran",
    "הבורר": "The Arbitrator",
    "מאפיה": "Mafia",
    "פלמח": "Palmach",
    "תאגד": "Tagad",
}


class MissingEpisodeFinder:
    """Finds missing episodes by comparing database against TMDB."""

    def __init__(self, db):
        self.db = db
        self.tmdb = TMDBService()
        self.results: List[Dict] = []

    async def find_all_series(self) -> List[dict]:
        """Find all series parent documents."""
        series_parents = await self.db.content.find({
            "is_series": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"content_type": "series"}
            ],
            "episode": None
        }).to_list(None)

        logger.info(f"Found {len(series_parents)} series in database")
        return series_parents

    async def get_episodes_for_series(self, series_id: str) -> List[dict]:
        """Get all episodes for a series from database."""
        episodes = await self.db.content.find({
            "series_id": series_id,
            "is_series": True
        }).to_list(None)
        return episodes

    def group_episodes_by_season(self, episodes: List[dict]) -> Dict[int, Set[int]]:
        """Group episode numbers by season."""
        seasons: Dict[int, Set[int]] = defaultdict(set)
        for ep in episodes:
            season_num = ep.get("season")
            episode_num = ep.get("episode")
            if season_num is not None and episode_num is not None:
                seasons[season_num].add(episode_num)
        return dict(seasons)

    async def get_tmdb_series_info(self, series_name: str, tmdb_id: Optional[int] = None) -> Optional[Dict]:
        """Get series info from TMDB including all seasons and episodes."""
        # Use existing TMDB ID if available
        if tmdb_id:
            details = await self.tmdb.get_tv_series_details(tmdb_id)
            if details:
                return await self._build_tmdb_info(details)

        # Search by name
        search_name = HEBREW_SERIES_MAPPING.get(series_name, series_name)
        search_result = await self.tmdb.search_tv_series(search_name)

        if not search_result:
            # Try with English name if it's Hebrew
            if any(0x0590 <= ord(c) <= 0x05FF for c in series_name):
                logger.warning(f"   ⚠️ No TMDB result for '{series_name}' - try adding to HEBREW_SERIES_MAPPING")
            return None

        tmdb_id = search_result.get("id")
        details = await self.tmdb.get_tv_series_details(tmdb_id)

        if not details:
            return None

        return await self._build_tmdb_info(details)

    async def _build_tmdb_info(self, details: Dict) -> Dict:
        """Build TMDB info dict with season details."""
        tmdb_id = details.get("id")
        total_seasons = details.get("number_of_seasons", 0)
        total_episodes = details.get("number_of_episodes", 0)

        # Get episode counts per season
        seasons_info = {}
        for season in details.get("seasons", []):
            season_num = season.get("season_number")
            # Skip season 0 (specials)
            if season_num == 0:
                continue

            episode_count = season.get("episode_count", 0)
            seasons_info[season_num] = {
                "episode_count": episode_count,
                "name": season.get("name"),
                "air_date": season.get("air_date")
            }

        return {
            "tmdb_id": tmdb_id,
            "name": details.get("name"),
            "total_seasons": total_seasons,
            "total_episodes": total_episodes,
            "status": details.get("status"),
            "seasons": seasons_info
        }

    async def analyze_series(self, series: dict) -> Dict:
        """Analyze a single series against TMDB."""
        series_id = str(series["_id"])
        series_name = series.get("title", "Unknown")
        db_tmdb_id = series.get("tmdb_id")

        logger.info(f"\n📺 Analyzing: {series_name}")

        # Get episodes from database
        db_episodes = await self.get_episodes_for_series(series_id)
        db_seasons = self.group_episodes_by_season(db_episodes)

        # Get TMDB info
        tmdb_info = await self.get_tmdb_series_info(series_name, db_tmdb_id)

        if not tmdb_info:
            logger.warning(f"   ❌ Not found in TMDB")
            return {
                "name": series_name,
                "id": series_id,
                "tmdb_found": False,
                "db_episodes": len(db_episodes),
                "db_seasons": db_seasons,
                "missing_seasons": {},
                "total_missing": 0
            }

        logger.info(f"   ✅ TMDB: {tmdb_info['name']} - {tmdb_info['total_seasons']} seasons, {tmdb_info['total_episodes']} episodes")

        # Compare each season
        missing_seasons = {}
        total_missing = 0

        for season_num, season_info in sorted(tmdb_info["seasons"].items()):
            expected_count = season_info["episode_count"]
            expected_episodes = set(range(1, expected_count + 1))

            db_episode_nums = db_seasons.get(season_num, set())
            missing_episodes = sorted(expected_episodes - db_episode_nums)

            if missing_episodes:
                missing_seasons[season_num] = {
                    "expected": expected_count,
                    "have": len(db_episode_nums),
                    "missing": missing_episodes,
                    "present": sorted(db_episode_nums)
                }
                total_missing += len(missing_episodes)
                logger.info(f"   Season {season_num}: have {len(db_episode_nums)}/{expected_count}, missing: {missing_episodes}")
            else:
                logger.info(f"   Season {season_num}: ✓ complete ({len(db_episode_nums)}/{expected_count})")

        # Check for seasons in DB but not in TMDB (might be specials or errors)
        extra_seasons = set(db_seasons.keys()) - set(tmdb_info["seasons"].keys())
        if extra_seasons:
            logger.warning(f"   ⚠️ Extra seasons in DB not in TMDB: {sorted(extra_seasons)}")

        return {
            "name": series_name,
            "id": series_id,
            "tmdb_found": True,
            "tmdb_id": tmdb_info["tmdb_id"],
            "tmdb_name": tmdb_info["name"],
            "tmdb_status": tmdb_info["status"],
            "tmdb_total_seasons": tmdb_info["total_seasons"],
            "tmdb_total_episodes": tmdb_info["total_episodes"],
            "db_episodes": len(db_episodes),
            "db_seasons": {k: sorted(v) for k, v in db_seasons.items()},
            "missing_seasons": missing_seasons,
            "total_missing": total_missing,
            "extra_seasons": sorted(extra_seasons) if extra_seasons else []
        }

    async def run_analysis(self):
        """Run the full analysis."""
        logger.info("=" * 80)
        logger.info("MISSING EPISODES ANALYSIS (via TMDB)")
        logger.info("=" * 80)

        series_list = await self.find_all_series()

        if not series_list:
            logger.info("No series found in database.")
            return

        # Analyze each series
        for series in series_list:
            result = await self.analyze_series(series)
            self.results.append(result)
            # Rate limit TMDB calls
            await asyncio.sleep(0.3)

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print analysis summary."""
        logger.info("\n" + "=" * 80)
        logger.info("SUMMARY REPORT")
        logger.info("=" * 80)

        # Series with missing episodes
        with_missing = [r for r in self.results if r["total_missing"] > 0]
        complete = [r for r in self.results if r["tmdb_found"] and r["total_missing"] == 0]
        not_found = [r for r in self.results if not r["tmdb_found"]]

        if with_missing:
            logger.info("\n🔴 SERIES WITH MISSING EPISODES:")
            logger.info("-" * 60)
            for r in sorted(with_missing, key=lambda x: -x["total_missing"]):
                logger.info(f"\n{r['name']} (TMDB: {r.get('tmdb_name', 'N/A')})")
                logger.info(f"   Status: {r.get('tmdb_status', 'Unknown')}")
                logger.info(f"   TMDB expects: {r.get('tmdb_total_episodes', '?')} episodes across {r.get('tmdb_total_seasons', '?')} seasons")
                logger.info(f"   We have: {r['db_episodes']} episodes")
                logger.info(f"   Missing: {r['total_missing']} episodes")

                for season_num, season_data in sorted(r["missing_seasons"].items()):
                    logger.info(f"\n   Season {season_num}:")
                    logger.info(f"      Have: {season_data['have']}/{season_data['expected']}")
                    logger.info(f"      Present: {season_data['present']}")
                    logger.info(f"      Missing: {season_data['missing']}")

        if complete:
            logger.info("\n\n✅ COMPLETE SERIES:")
            logger.info("-" * 60)
            for r in sorted(complete, key=lambda x: x["name"]):
                seasons_str = ", ".join(f"S{k}:{len(v)}" for k, v in sorted(r["db_seasons"].items()))
                logger.info(f"   ✓ {r['name']} ({seasons_str})")

        if not_found:
            logger.info("\n\n⚠️ NOT FOUND IN TMDB:")
            logger.info("-" * 60)
            for r in sorted(not_found, key=lambda x: x["name"]):
                logger.info(f"   ? {r['name']} ({r['db_episodes']} episodes in DB)")

        # Final stats
        total_series = len(self.results)
        total_missing = sum(r["total_missing"] for r in self.results)

        logger.info("\n" + "=" * 80)
        logger.info("TOTALS")
        logger.info("=" * 80)
        logger.info(f"Total series analyzed: {total_series}")
        logger.info(f"Complete series: {len(complete)}")
        logger.info(f"Series with missing episodes: {len(with_missing)}")
        logger.info(f"Series not found in TMDB: {len(not_found)}")
        logger.info(f"Total missing episodes: {total_missing}")

    async def close(self):
        """Clean up resources."""
        await self.tmdb.close()


async def main():
    """Main entry point."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    logger.info(f"📡 Connected to MongoDB: {settings.MONGODB_DB_NAME}")

    finder = MissingEpisodeFinder(db)
    try:
        await finder.run_analysis()
    finally:
        await finder.close()
        client.close()
        logger.info("\n🔌 Disconnected")


if __name__ == "__main__":
    asyncio.run(main())

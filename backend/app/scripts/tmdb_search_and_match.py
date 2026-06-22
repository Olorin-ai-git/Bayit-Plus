"""
TMDB Search and Match Script

Automatically finds and assigns TMDB IDs to series without them.

This script:
1. Finds all series without TMDB IDs
2. Searches TMDB API by title
3. Matches based on title similarity and year
4. Assigns TMDB IDs with confidence scoring
5. Flags uncertain matches for manual review

Usage:
    python -m app.scripts.tmdb_search_and_match [--dry-run] [--limit N] [--confidence THRESHOLD]
"""

import asyncio
import logging
import os
import re
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple

import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"


class TMDBMatcher:
    """Matches series to TMDB IDs using intelligent search and scoring."""

    def __init__(
        self,
        dry_run: bool = False,
        limit: Optional[int] = None,
        confidence_threshold: float = 0.75,
    ):
        self.dry_run = dry_run
        self.limit = limit
        self.confidence_threshold = confidence_threshold
        self.stats = {
            "searched": 0,
            "matched": 0,
            "uncertain": 0,
            "no_results": 0,
            "errors": 0,
        }
        self.db = None
        self.uncertain_matches = []

    async def initialize(self):
        """Initialize database connection."""
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI
            if hasattr(settings, "MONGODB_URI")
            else settings.MONGODB_URL
        )
        self.db = client[settings.MONGODB_DB_NAME]
        logger.info("[OK] Connected to database")

    def clean_title(self, title: str) -> str:
        """Clean title for better matching."""
        # Remove season/episode info
        title = re.sub(r"[-\s](S\d+E\d+|Season\s*\d+|Episode\s*\d+).*", "", title, flags=re.IGNORECASE)
        # Remove year in parentheses
        title = re.sub(r"\s*\(\d{4}\)", "", title)
        # Remove common suffixes
        title = re.sub(r"\s*[-:]\s*(The Series|TV Series).*", "", title, flags=re.IGNORECASE)
        # Clean whitespace
        title = " ".join(title.split())
        return title.strip()

    def calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings (0.0 to 1.0)."""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

    async def search_tmdb(self, title: str) -> Optional[List[Dict]]:
        """Search TMDB for series by title."""
        if not TMDB_API_KEY:
            logger.warning("TMDB_API_KEY not set")
            return None

        url = f"{TMDB_BASE_URL}/search/tv"
        params = {"api_key": TMDB_API_KEY, "query": title}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, params=params, timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("results", [])
                    else:
                        logger.warning(f"TMDB API error {response.status} for: {title}")
                        return None
        except Exception as e:
            logger.error(f"Error searching TMDB for '{title}': {e}")
            return None

    def score_match(
        self, series_title: str, tmdb_result: Dict, series_year: Optional[int] = None
    ) -> Tuple[float, str]:
        """
        Score a TMDB match result.

        Returns:
            Tuple of (score, reason)
            Score: 0.0 to 1.0 (higher is better)
            Reason: Explanation of the score
        """
        tmdb_title = tmdb_result.get("name", "")
        tmdb_original_title = tmdb_result.get("original_name", "")
        tmdb_year = None

        # Extract year from first_air_date
        first_air_date = tmdb_result.get("first_air_date")
        if first_air_date:
            try:
                tmdb_year = int(first_air_date[:4])
            except (ValueError, TypeError):
                pass

        # Calculate title similarity
        title_similarity = self.calculate_similarity(series_title, tmdb_title)
        original_similarity = self.calculate_similarity(series_title, tmdb_original_title)
        best_title_similarity = max(title_similarity, original_similarity)

        # Year matching bonus
        year_bonus = 0.0
        year_info = ""
        if series_year and tmdb_year:
            year_diff = abs(series_year - tmdb_year)
            if year_diff == 0:
                year_bonus = 0.2
                year_info = f" (exact year match: {series_year})"
            elif year_diff <= 1:
                year_bonus = 0.1
                year_info = f" (year close: {series_year} ≈ {tmdb_year})"
            else:
                year_bonus = -0.1
                year_info = f" (year mismatch: {series_year} vs {tmdb_year})"
        elif tmdb_year:
            year_info = f" (TMDB year: {tmdb_year})"

        # Popularity bonus (higher popularity = slightly more likely to be correct)
        popularity = tmdb_result.get("popularity", 0)
        popularity_bonus = min(popularity / 1000, 0.1)  # Max 0.1 bonus

        # Calculate final score
        final_score = min(best_title_similarity + year_bonus + popularity_bonus, 1.0)

        # Build reason
        reason = f"Title: '{tmdb_title}' (similarity: {best_title_similarity:.2f}){year_info}"

        return final_score, reason

    def get_match_confidence_label(self, score: float) -> str:
        """Get confidence label for a match score."""
        if score >= 0.95:
            return "EXCELLENT"
        elif score >= 0.85:
            return "HIGH"
        elif score >= 0.75:
            return "GOOD"
        elif score >= 0.65:
            return "UNCERTAIN"
        else:
            return "LOW"

    async def match_series(self, series: Dict) -> Optional[Dict]:
        """
        Find the best TMDB match for a series.

        Returns:
            Dict with tmdb_id, score, and reason, or None if no good match
        """
        title = series.get("title", "")
        clean_series_title = self.clean_title(title)
        series_year = series.get("year")

        logger.info(f"  Searching TMDB for: '{clean_series_title}'")

        # Search TMDB
        results = await self.search_tmdb(clean_series_title)

        if not results:
            logger.warning(f"[FAIL] No TMDB results found")
            return None

        if len(results) == 0:
            logger.warning(f"[FAIL] Empty results")
            return None

        # Score all results
        scored_results = []
        for result in results[:10]:  # Only consider top 10 results
            score, reason = self.score_match(clean_series_title, result, series_year)
            scored_results.append(
                {
                    "tmdb_id": result["id"],
                    "title": result.get("name"),
                    "score": score,
                    "reason": reason,
                    "year": result.get("first_air_date", "")[:4] if result.get("first_air_date") else None,
                    "popularity": result.get("popularity", 0),
                }
            )

        # Sort by score
        scored_results.sort(key=lambda x: x["score"], reverse=True)

        # Get best match
        best_match = scored_results[0]
        confidence = self.get_match_confidence_label(best_match["score"])

        logger.info(
            f"    Best match: {best_match['title']} (TMDB: {best_match['tmdb_id']})"
        )
        logger.info(f"    Confidence: {confidence} (score: {best_match['score']:.3f})")
        logger.info(f"    {best_match['reason']}")

        # Show alternative matches if score is uncertain
        if best_match["score"] < self.confidence_threshold and len(scored_results) > 1:
            logger.info(f"    Alternatives:")
            for alt in scored_results[1:3]:  # Show up to 2 alternatives
                logger.info(
                    f"      - {alt['title']} (score: {alt['score']:.3f}, year: {alt['year']})"
                )

        return best_match

    async def process_series(self):
        """Process all series without TMDB IDs."""
        logger.info("=" * 80)
        logger.info("TMDB SEARCH AND MATCH")
        logger.info("=" * 80)

        # Find series without TMDB IDs
        query = {
            "content_format": "series",
            "$or": [{"tmdb_id": {"$exists": False}}, {"tmdb_id": None}],
        }

        cursor = self.db.content.find(query)
        if self.limit:
            cursor = cursor.limit(self.limit)

        series_list = await cursor.to_list(length=None)
        logger.info(f"Found {len(series_list)} series without TMDB IDs")
        logger.info("")

        for idx, series in enumerate(series_list, 1):
            title = series.get("title", "Unknown")
            series_id = series["_id"]

            logger.info(f"[{idx}/{len(series_list)}] {title}")

            # Search and match
            match = await self.match_series(series)

            if match:
                self.stats["searched"] += 1

                if match["score"] >= self.confidence_threshold:
                    # High confidence match - assign automatically
                    logger.info(
                        f"[OK] Auto-assigning TMDB ID: {match['tmdb_id']} ({self.get_match_confidence_label(match['score'])} confidence)"
                    )

                    if not self.dry_run:
                        await self.db.content.update_one(
                            {"_id": series_id}, {"$set": {"tmdb_id": match["tmdb_id"]}}
                        )

                    self.stats["matched"] += 1
                else:
                    # Uncertain match - flag for review
                    logger.warning(
                        f"[WARN] Uncertain match (score: {match['score']:.3f}) - flagged for review"
                    )
                    self.uncertain_matches.append(
                        {
                            "series_title": title,
                            "series_id": str(series_id),
                            "tmdb_id": match["tmdb_id"],
                            "tmdb_title": match["title"],
                            "score": match["score"],
                            "reason": match["reason"],
                        }
                    )
                    self.stats["uncertain"] += 1
            else:
                logger.warning(f"[FAIL] No suitable match found")
                self.stats["no_results"] += 1

            logger.info("")

            # Rate limiting
            await asyncio.sleep(0.25)

    def print_summary(self):
        """Print summary report."""
        logger.info("")
        logger.info("=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total searched:    {self.stats['searched']}")
        logger.info(f"Auto-matched: {self.stats['matched']} [OK]")
        logger.info(f"Uncertain matches: {self.stats['uncertain']} [WARN]")
        logger.info(f"No results: {self.stats['no_results']} [FAIL]")
        logger.info(f"Errors:            {self.stats['errors']}")
        logger.info("")

        if self.uncertain_matches:
            logger.info("=" * 80)
            logger.info("UNCERTAIN MATCHES - MANUAL REVIEW RECOMMENDED")
            logger.info("=" * 80)
            for match in self.uncertain_matches:
                logger.info(f"\nSeries: {match['series_title']}")
                logger.info(f"  → Suggested: {match['tmdb_title']} (TMDB: {match['tmdb_id']})")
                logger.info(f"  → Score: {match['score']:.3f}")
                logger.info(f"  → {match['reason']}")
                logger.info(f"  → MongoDB ID: {match['series_id']}")
            logger.info("")
            logger.info(
                f"To manually assign, update MongoDB with: "
                f"db.content.updateOne({{_id: ObjectId('...')}}, {{$set: {{tmdb_id: ...}}}})"
            )
            logger.info("")

        logger.info("=" * 80)
        if self.dry_run:
            logger.info("DRY RUN MODE - No changes were made")
        else:
            logger.info(
                f"Assigned {self.stats['matched']} TMDB IDs successfully"
            )
        logger.info("=" * 80)

    async def run(self):
        """Run the matching process."""
        if not TMDB_API_KEY:
            logger.error("=" * 80)
            logger.error("ERROR: TMDB_API_KEY environment variable is not set")
            logger.error("Please set TMDB_API_KEY before running this script")
            logger.error("=" * 80)
            return

        await self.initialize()

        logger.info(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        logger.info(f"Confidence threshold: {self.confidence_threshold}")
        if self.limit:
            logger.info(f"Limit: {self.limit} items")
        logger.info("")

        await self.process_series()
        self.print_summary()


async def main():
    """Entry point."""
    import sys

    dry_run = "--dry-run" in sys.argv
    limit = None
    confidence = 0.75

    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
        if arg == "--confidence" and i + 1 < len(sys.argv):
            confidence = float(sys.argv[i + 1])

    matcher = TMDBMatcher(dry_run=dry_run, limit=limit, confidence_threshold=confidence)
    await matcher.run()


if __name__ == "__main__":
    asyncio.run(main())

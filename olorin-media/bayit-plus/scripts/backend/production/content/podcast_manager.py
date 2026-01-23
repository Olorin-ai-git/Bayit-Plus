#!/usr/bin/env python3
"""
Unified Podcast Management Tool.

Consolidates 35+ individual podcast scripts into a single tool
with Strategy pattern for different podcast sources.

Replaces individual scripts:
- add_apple_podcasts_feed.py
- add_echad_beyom_podcast.py
- add_hashavoua_podcast.py
- update_podcasts_from_103fm.py
- update_real_podcasts.py
- update_podcasts_with_real_data.py
- add_rss_feeds.py
- And 28+ more individual podcast scripts

Usage:
    # Add single podcast from RSS
    python podcast_manager.py add-rss --url "https://feed.url" --title "Podcast Name"

    # Add from Apple Podcasts
    python podcast_manager.py add-apple --url "https://podcasts.apple.com/..."

    # Batch add from YAML config
    python podcast_manager.py batch-add podcast_sources.yaml

    # Update all podcasts from their sources
    python podcast_manager.py update-all

    # Sync from 103FM
    python podcast_manager.py sync-103fm
"""
import argparse
import asyncio
import sys
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import yaml

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3]))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.models.content import Podcast, PodcastEpisode


class PodcastSource(ABC):
    """
    Abstract base class for podcast sources.

    Implements Strategy pattern - each source type has its own implementation.
    """

    @abstractmethod
    async def fetch_podcast_data(self, source_url: str) -> Dict:
        """
        Fetch podcast metadata from source.

        Args:
            source_url: URL to podcast source

        Returns:
            Dictionary with podcast data (title, description, cover_url, etc.)
        """
        pass

    @abstractmethod
    async def fetch_episodes(
        self, source_url: str, limit: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch episode data from source.

        Args:
            source_url: URL to podcast source
            limit: Maximum number of episodes to fetch

        Returns:
            List of episode dictionaries
        """
        pass


class RSSSource(PodcastSource):
    """RSS feed podcast source."""

    async def fetch_podcast_data(self, source_url: str) -> Dict:
        """Fetch podcast data from RSS feed."""
        # TODO: Implement RSS feed parsing
        # Use feedparser library to parse RSS
        # Extract: title, description, cover_url, language, author
        raise NotImplementedError(
            "RSS feed parsing to be implemented. "
            "Will use feedparser library to extract podcast metadata."
        )

    async def fetch_episodes(
        self, source_url: str, limit: Optional[int] = None
    ) -> List[Dict]:
        """Fetch episodes from RSS feed."""
        # TODO: Implement episode parsing from RSS
        raise NotImplementedError(
            "RSS episode parsing to be implemented. "
            "Will extract: title, description, audio_url, duration, pub_date."
        )


class AppleSource(PodcastSource):
    """Apple Podcasts source."""

    async def fetch_podcast_data(self, source_url: str) -> Dict:
        """Convert Apple Podcasts URL to RSS and fetch data."""
        # TODO: Implement Apple Podcasts URL conversion
        # Use existing apple_podcasts_converter service
        from app.services.apple_podcasts_converter import (
            convert_apple_podcasts_to_rss,
        )

        result = await convert_apple_podcasts_to_rss(source_url)
        if not result:
            raise ValueError(f"Failed to convert Apple Podcasts URL: {source_url}")

        # Then use RSS parser
        rss_source = RSSSource()
        return await rss_source.fetch_podcast_data(result["rss_url"])

    async def fetch_episodes(
        self, source_url: str, limit: Optional[int] = None
    ) -> List[Dict]:
        """Fetch episodes via Apple Podcasts RSS conversion."""
        from app.services.apple_podcasts_converter import (
            convert_apple_podcasts_to_rss,
        )

        result = await convert_apple_podcasts_to_rss(source_url)
        if not result:
            raise ValueError(f"Failed to convert Apple Podcasts URL: {source_url}")

        rss_source = RSSSource()
        return await rss_source.fetch_episodes(result["rss_url"], limit)


class Radio103FMSource(PodcastSource):
    """103FM Radio station podcast source."""

    async def fetch_podcast_data(self, source_url: str) -> Dict:
        """Scrape podcast data from 103FM website."""
        # TODO: Implement 103FM scraping
        # Use httpx + BeautifulSoup to scrape podcast page
        raise NotImplementedError(
            "103FM scraping to be implemented. "
            "Will use existing update_podcasts_from_103fm.py logic."
        )

    async def fetch_episodes(
        self, source_url: str, limit: Optional[int] = None
    ) -> List[Dict]:
        """Scrape episodes from 103FM website."""
        # TODO: Implement episode scraping
        raise NotImplementedError(
            "103FM episode scraping to be implemented."
        )


class PodcastManager:
    """
    Unified podcast management with source strategy pattern.

    Supports multiple podcast sources via pluggable strategy classes.
    """

    def __init__(self):
        """Initialize manager with available sources."""
        self.sources = {
            "rss": RSSSource(),
            "apple": AppleSource(),
            "103fm": Radio103FMSource(),
        }

    async def add_podcast(
        self,
        source_type: str,
        source_url: str,
        metadata: Optional[Dict] = None,
        auto_publish: bool = False,
    ) -> Podcast:
        """
        Add single podcast from any source.

        Args:
            source_type: Type of source ('rss', 'apple', '103fm')
            source_url: URL to podcast source
            metadata: Optional metadata overrides
            auto_publish: Whether to auto-publish new episodes

        Returns:
            Created Podcast document

        Raises:
            ValueError: If source_type is invalid
        """
        if source_type not in self.sources:
            raise ValueError(
                f"Unknown source type: {source_type}. "
                f"Valid options: {', '.join(self.sources.keys())}"
            )

        source = self.sources[source_type]

        print(f"Fetching podcast data from {source_type}...")
        podcast_data = await source.fetch_podcast_data(source_url)

        # Merge with provided metadata (overrides)
        if metadata:
            podcast_data.update(metadata)

        # Check if podcast already exists
        existing = await Podcast.find_one(Podcast.title == podcast_data["title"])
        if existing:
            print(f"  ⚠️  Podcast already exists: {existing.title}")
            return existing

        # Create podcast
        podcast = Podcast(
            title=podcast_data["title"],
            description=podcast_data.get("description", ""),
            cover_url=podcast_data.get("cover_url", ""),
            rss_feed_url=source_url if source_type == "rss" else None,
            auto_publish=auto_publish,
            created_at=datetime.utcnow(),
        )

        await podcast.insert()
        print(f"  ✅ Created podcast: {podcast.title}")

        # Fetch and add initial episodes
        print(f"  Fetching episodes...")
        episodes = await source.fetch_episodes(source_url, limit=10)
        print(f"  Found {len(episodes)} episodes")

        # TODO: Add episode creation logic

        return podcast

    async def batch_add(self, config_file: Path) -> List[Podcast]:
        """
        Batch add podcasts from YAML configuration.

        Args:
            config_file: Path to YAML config file

        Returns:
            List of created Podcast documents

        Config format:
            podcasts:
              - name: "Podcast Name"
                source: "rss"
                feed_url: "https://feed.url"
                category: "news"
                auto_publish: true

              - name: "Another Podcast"
                source: "apple"
                apple_url: "https://podcasts.apple.com/..."
                auto_publish: false
        """
        with open(config_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        podcasts = []

        for podcast_config in config.get("podcasts", []):
            try:
                source_type = podcast_config["source"]
                source_url = podcast_config.get("feed_url") or podcast_config.get(
                    "apple_url"
                )

                metadata = {
                    "title": podcast_config.get("name"),
                    "category": podcast_config.get("category"),
                }

                podcast = await self.add_podcast(
                    source_type,
                    source_url,
                    metadata=metadata,
                    auto_publish=podcast_config.get("auto_publish", False),
                )

                podcasts.append(podcast)

            except Exception as e:
                print(f"  ❌ Failed to add {podcast_config.get('name')}: {e}")

        return podcasts

    async def update_from_source(self, podcast_id: str) -> int:
        """
        Refresh podcast from original source.

        Args:
            podcast_id: Podcast ObjectId

        Returns:
            Number of new episodes added
        """
        # TODO: Implement update logic
        raise NotImplementedError(
            "Update logic to be implemented. "
            "Will fetch new episodes from source and add to database."
        )

    async def update_all(self) -> Dict[str, int]:
        """
        Update all podcasts from their sources.

        Returns:
            Dictionary with podcast_id -> new_episodes_count
        """
        # TODO: Implement bulk update
        raise NotImplementedError(
            "Bulk update to be implemented. "
            "Will iterate through all podcasts with source URLs."
        )


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Unified Podcast Management Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Add RSS podcast
    add_rss = subparsers.add_parser("add-rss", help="Add podcast from RSS feed")
    add_rss.add_argument("--url", required=True, help="RSS feed URL")
    add_rss.add_argument("--title", help="Podcast title override")
    add_rss.add_argument("--auto-publish", action="store_true", help="Auto-publish episodes")

    # Add Apple podcast
    add_apple = subparsers.add_parser("add-apple", help="Add podcast from Apple Podcasts")
    add_apple.add_argument("--url", required=True, help="Apple Podcasts URL")
    add_apple.add_argument("--title", help="Podcast title override")
    add_apple.add_argument("--auto-publish", action="store_true", help="Auto-publish episodes")

    # Batch add
    batch = subparsers.add_parser("batch-add", help="Batch add from YAML config")
    batch.add_argument("config", help="Path to YAML config file")

    # Update all
    subparsers.add_parser("update-all", help="Update all podcasts from sources")

    # Sync 103FM
    subparsers.add_parser("sync-103fm", help="Sync podcasts from 103FM")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        await connect_to_mongo()

        manager = PodcastManager()

        if args.command == "add-rss":
            metadata = {"title": args.title} if args.title else None
            podcast = await manager.add_podcast(
                "rss", args.url, metadata=metadata, auto_publish=args.auto_publish
            )
            print(f"\n✅ Added podcast: {podcast.title}")

        elif args.command == "add-apple":
            metadata = {"title": args.title} if args.title else None
            podcast = await manager.add_podcast(
                "apple", args.url, metadata=metadata, auto_publish=args.auto_publish
            )
            print(f"\n✅ Added podcast: {podcast.title}")

        elif args.command == "batch-add":
            config_file = Path(args.config)
            podcasts = await manager.batch_add(config_file)
            print(f"\n✅ Added {len(podcasts)} podcasts")

        elif args.command == "update-all":
            print("⚠️  Update-all not yet implemented")
            print("   Will update all podcasts from their source feeds")

        elif args.command == "sync-103fm":
            print("⚠️  103FM sync not yet implemented")
            print("   Will scrape and sync all 103FM podcasts")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)

    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())

"""
Content Embedder Runner

Main runner class and CLI entry point.
"""

import argparse
import asyncio
import logging
import sys

from app.core.database import get_database
from app.models.content import Content
from app.models.content_embedding import ContentEmbedding
from app.models.subtitles import SubtitleTrackDoc

from scripts.olorin.embedder.client import EmbeddingClient
from scripts.olorin.embedder.content import embed_content_metadata
from scripts.olorin.embedder.subtitles import embed_subtitles

logger = logging.getLogger(__name__)


class ContentEmbedder:
    """Batch content embedder for Olorin.ai semantic search."""

    def __init__(
        self, batch_size: int = 100, force: bool = False, dry_run: bool = False
    ):
        """Initialize embedder with options."""
        self.batch_size = batch_size
        self.force = force
        self.dry_run = dry_run
        self._client = EmbeddingClient(dry_run=dry_run)

    async def initialize(self):
        """Initialize clients and connections."""
        await self._client.initialize()

    async def run(self, content_type: str = "all") -> dict:
        """
        Run embedding for specified content type.

        Args:
            content_type: Type to embed (all, movies, series, subtitles, metadata)

        Returns:
            Results dict by content type
        """
        await self.initialize()

        results = {}

        if content_type in ("all", "movies", "series", "metadata"):
            results["metadata"] = await embed_content_metadata(
                client=self._client,
                batch_size=self.batch_size,
                force=self.force,
                dry_run=self.dry_run,
            )

        if content_type in ("all", "subtitles"):
            results["subtitles"] = await embed_subtitles(
                client=self._client,
                force=self.force,
                dry_run=self.dry_run,
            )

        return results


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Embed content for Olorin.ai semantic search"
    )
    parser.add_argument(
        "--content-type",
        choices=["all", "movies", "series", "subtitles", "metadata"],
        default="all",
        help="Type of content to embed",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of items per batch",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-embed existing content",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without making changes",
    )

    args = parser.parse_args()

    # Use existing database infrastructure (no duplicate connections)
    db = await get_database()

    logger.info(
        f"Starting content embedding (type={args.content_type}, dry_run={args.dry_run})"
    )

    embedder = ContentEmbedder(
        batch_size=args.batch_size,
        force=args.force,
        dry_run=args.dry_run,
    )

    try:
        results = await embedder.run(content_type=args.content_type)
        logger.info(f"Embedding complete: {results}")
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

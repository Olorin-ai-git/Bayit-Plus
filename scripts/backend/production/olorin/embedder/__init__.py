"""
Olorin.ai Content Embedding Package

Batch embeds content (subtitles, titles, descriptions) into Pinecone for semantic search.

Usage:
    poetry run python -m scripts.olorin.embedder [OPTIONS]

Options:
    --content-type TYPE    Type of content to embed: all, movies, series, subtitles
    --batch-size SIZE      Number of items per batch (default: 100)
    --force               Re-embed existing content
    --dry-run             Preview without making changes
"""

import asyncio
import logging

from scripts.olorin.embedder.runner import ContentEmbedder, main

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

__all__ = ["ContentEmbedder", "main"]


if __name__ == "__main__":
    asyncio.run(main())

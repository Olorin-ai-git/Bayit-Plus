"""
Olorin.ai Content Embedding Script

DEPRECATED: This module has been refactored into the embedder/ subpackage.
This file is kept for backward compatibility.

Import from scripts.olorin.embedder instead.

Usage:
    poetry run python -m scripts.olorin.embed_content [OPTIONS]
"""

import asyncio
import logging

# Re-export from new location for backward compatibility
from scripts.olorin.embedder import ContentEmbedder, main

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

__all__ = ["ContentEmbedder", "main"]


if __name__ == "__main__":
    asyncio.run(main())

"""
Olorin.ai Cultural References Seeder

DEPRECATED: This module has been refactored into the seeder/ subpackage.
This file is kept for backward compatibility.

Import from scripts.olorin.seeder instead.

Usage:
    poetry run python -m scripts.olorin.seed_cultural_references
"""

import asyncio
import logging

# Re-export from new location for backward compatibility
from scripts.olorin.seeder import seed_cultural_references, get_reference_stats
from scripts.olorin.seeder.data import ALL_REFERENCES

# Backward compatibility alias
CULTURAL_REFERENCES = ALL_REFERENCES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

__all__ = [
    "seed_cultural_references",
    "get_reference_stats",
    "CULTURAL_REFERENCES",
    "ALL_REFERENCES",
]


async def main():
    """Main entry point."""
    result = await seed_cultural_references()
    logger.info(f"Result: {result}")


if __name__ == "__main__":
    asyncio.run(main())

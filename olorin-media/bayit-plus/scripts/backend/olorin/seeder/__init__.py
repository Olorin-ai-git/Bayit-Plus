"""
Olorin.ai Cultural References Seeder

Seeds the cultural reference knowledge base with Israeli/Jewish cultural references.

Usage:
    poetry run python -m scripts.olorin.seeder

Categories seeded:
    - Israeli politicians (current & historical)
    - Political parties
    - Israeli laws & legal terms
    - Hebrew slang & idioms
    - Jewish holidays & traditions
    - Historical events
    - IDF terminology
    - Notable places
    - Cultural figures
"""

import asyncio
import logging

from scripts.olorin.seeder.runner import seed_cultural_references, get_reference_stats
from scripts.olorin.seeder.data import ALL_REFERENCES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

__all__ = ["seed_cultural_references", "get_reference_stats", "ALL_REFERENCES"]


async def main():
    """Main entry point."""
    result = await seed_cultural_references()
    logger.info(f"Result: {result}")


if __name__ == "__main__":
    asyncio.run(main())

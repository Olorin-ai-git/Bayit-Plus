"""
Enrich Podcasts with English and Spanish Translations

This script reads all existing podcasts from the database and adds English and Spanish
translations for titles, authors, and categories while keeping the Hebrew originals.

DEPRECATED: This script is maintained for backward compatibility.
New code should use: backend/localize_content.py podcast
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import connect_to_mongo
from app.services.content_localization import localization_processor


async def enrich_podcast_translations():
    """Enrich all podcasts with English and Spanish translations using the universal service."""

    await connect_to_mongo()

    print("=" * 80)
    print("Podcast Translation Enrichment Script")
    print("Using universal localization service")
    print("=" * 80)
    print("\nThis script will add English and Spanish translations to all podcasts.")
    print("Hebrew content will be preserved.\n")

    results = await localization_processor.process_podcast()

    print("\n" + "=" * 80)
    print("Enrichment complete!")
    print(f"  Total:   {results['total']}")
    print(f"  Updated: {results['processed']}")
    print(f"  Skipped: {results['skipped']}")
    print("=" * 80)

    if results["processed"] > 0:
        print("\n✅ Detailed Results:")
        for result in results["results"]:
            if result["needs_update"]:
                print(f"\n  Podcast ID: {result['item_id']}")
                print(f"  Fields translated: {len(result['translated_fields'])}")
                for field_info in result["translated_fields"]:
                    print(
                        f"    • {field_info['field']}: {field_info['translation'][:50]}..."
                    )


if __name__ == "__main__":
    asyncio.run(enrich_podcast_translations())

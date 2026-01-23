#!/usr/bin/env python3
"""
Localize Content Command

CLI script for translating Bayit+ content to English and Spanish.
Supports all content types: podcast, content (VOD), livechannel, radio, category.

Usage:
    poetry run python localize_content.py [content-type] [content-id]

Examples:
    poetry run python localize_content.py podcast
    poetry run python localize_content.py podcast 507f1f77bcf86cd799439011
    poetry run python localize_content.py content
    poetry run python localize_content.py livechannel
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import connect_to_mongo
from app.services.content_localization import localization_processor

CONTENT_TYPES = ["podcast", "content", "livechannel", "radio", "category"]


def print_banner():
    """Print command banner."""
    print("=" * 80)
    print("🌐 Bayit+ Content Localization System")
    print("=" * 80)


def print_usage():
    """Print usage information."""
    print("\nUsage:")
    print("  poetry run python localize_content.py [content-type] [content-id]")
    print("\nContent Types:")
    print("  podcast       - Translate podcasts")
    print("  content       - Translate VOD content (movies, series)")
    print("  livechannel   - Translate live TV channels")
    print("  radio         - Translate radio stations")
    print("  category      - Translate categories")
    print("\nExamples:")
    print("  poetry run python localize_content.py podcast")
    print("  poetry run python localize_content.py podcast 507f1f77bcf86cd799439011")
    print("  poetry run python localize_content.py content")
    print("\nOptions:")
    print("  [content-id]  - Optional: Process specific item by MongoDB ObjectId")
    print("                  If omitted, processes all items of that type")


def print_results(results: Dict[str, Any]):
    """
    Print processing results.

    Args:
        results: Processing results dictionary
    """
    print("\n" + "=" * 80)
    print("📊 Translation Results")
    print("=" * 80)

    if "error" in results:
        print(f"\n❌ Error: {results['error']}")
        return

    content_type = results.get("type", "unknown")
    total = results.get("total", 0)
    processed = results.get("processed", 0)
    skipped = results.get("skipped", 0)

    print(f"\nContent Type: {content_type}")
    print(f"Total Items:  {total}")
    print(f"Translated:   {processed}")
    print(f"Skipped:      {skipped}")

    if processed > 0:
        print("\n✅ Translation Summary:")
        for result in results.get("results", []):
            if result["needs_update"]:
                item_id = result["item_id"]
                field_count = len(result["translated_fields"])
                print(f"\n  Item ID: {item_id}")
                print(f"  Fields translated: {field_count}")

                for field_info in result["translated_fields"]:
                    field_name = field_info["field"]
                    original = field_info["original"]
                    translation = field_info["translation"]
                    print(f"    • {field_name}")
                    print(f"      Original:    {original}")
                    print(f"      Translation: {translation}")

    print("\n" + "=" * 80)


async def localize_content(content_type: str, content_id: Optional[str] = None):
    """
    Main localization function.

    Args:
        content_type: Type of content to localize
        content_id: Optional specific item ID
    """
    print_banner()

    if content_type not in CONTENT_TYPES:
        print(f"\n❌ Error: Invalid content type '{content_type}'")
        print(f"   Supported types: {', '.join(CONTENT_TYPES)}")
        print_usage()
        sys.exit(1)

    print(f"\n🔄 Starting localization...")
    print(f"   Type: {content_type}")
    if content_id:
        print(f"   ID: {content_id}")
    else:
        print(f"   Scope: All items")

    print(f"\n⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    await connect_to_mongo()
    print("✓ Connected to database")

    start_time = datetime.now()

    if content_type == "podcast":
        results = await localization_processor.process_podcast(content_id)
    elif content_type == "content":
        results = await localization_processor.process_content(content_id)
    elif content_type == "livechannel":
        results = await localization_processor.process_live_channel(content_id)
    elif content_type == "radio":
        results = await localization_processor.process_radio_station(content_id)
    elif content_type == "category":
        results = await localization_processor.process_category(content_id)
    else:
        print(f"\n❌ Error: Unsupported content type '{content_type}'")
        sys.exit(1)

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print_results(results)

    print(f"\n⏱️  Duration: {duration:.2f} seconds")
    print(f"⏰ Finished at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")

    if "error" not in results:
        print("\n✅ Localization completed successfully!")
    else:
        print("\n❌ Localization completed with errors")
        sys.exit(1)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print_banner()
        print("\n❌ Error: Missing content type argument")
        print_usage()
        sys.exit(1)

    if sys.argv[1] in ["--help", "-h", "help"]:
        print_banner()
        print_usage()
        sys.exit(0)

    content_type = sys.argv[1].lower()
    content_id = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        asyncio.run(localize_content(content_type, content_id))
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

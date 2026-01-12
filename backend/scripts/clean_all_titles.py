#!/usr/bin/env python3
"""
Direct Title Cleanup Script
Cleans all messy titles in the content collection without using the AI agent.
Removes file extensions, quality markers, release groups, and other junk.
"""

import asyncio
import re
import sys
from pathlib import Path

# Add parent directory to path to import app modules
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.content import Content
from app.core.config import get_settings


# Patterns to remove from titles
JUNK_PATTERNS = [
    # File extensions
    r'\.mp4$', r'\.mkv$', r'\.avi$', r'\.mov$', r'\.wmv$', r'\.flv$',

    # Quality markers
    r'\b(1080p|720p|480p|360p|4K|2160p|HDRip|WEBRip|BluRay|BRRip|DVDRip|DVDScr|HDTV)\b',
    r'\bWEB-?DL\b',

    # Release groups (common ones)
    r'\[YTS\.MX\]', r'\[YTS\]', r'\[YIFY\]', r'\[RARBG\]',
    r'\[MX\]', r'\[.*?\]',  # Any bracketed text
    r'\(.*?\)',  # Any parenthesized text at the end

    # Release groups without brackets
    r'\b(YIFY|YTS|RARBG|BOKUT|MDMA|BoK|x264|h264|AAC)\b',

    # Codec info
    r'\b(XviD|x264|h264|h265|HEVC|AAC|AC3|DTS)\b',

    # Source indicators
    r'\b(WEB|LINE|R5|CAM|TS|TC)\b',

    # Extra markers
    r'\b(TV|com)\b',

    # Single letter 'p' often used for quality
    r'\sp\s*$',  # ' p' at end
    r'^p\s',  # 'p ' at start

    # Ellipsis and dots
    r'\.{2,}',  # Multiple dots
    r'\s*\.\.\.$',  # Ellipsis at end

    # Extra dashes and spaces
    r'\s*-\s*$',  # Trailing dash
    r'^\s*-\s*',  # Leading dash
]


def clean_title(title: str) -> str:
    """Clean a single title by removing file junk."""
    if not title:
        return title

    original = title
    cleaned = title

    # Apply all patterns
    for pattern in JUNK_PATTERNS:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    # Clean up extra whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)  # Multiple spaces to one
    cleaned = cleaned.strip()  # Remove leading/trailing spaces

    # If we removed everything, keep the original
    if not cleaned or len(cleaned) < 2:
        return original

    return cleaned


async def clean_all_titles():
    """Clean all titles in the content collection."""

    # Get settings and connect to database
    settings = get_settings()

    print(f"Connecting to MongoDB: {settings.MONGODB_URL}")
    client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Initialize Beanie
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content]
    )

    print("Connected to database")

    # Get all content items
    print("Fetching all content items...")
    try:
        content_items = await Content.find_all().to_list()
    except:
        # If find_all doesn't work, try find() with empty query
        content_items = await Content.find({}).to_list()

    print(f"Found {len(content_items)} content items")

    cleaned_count = 0
    examples = []

    # Process each item
    for item in content_items:
        original_title = item.title
        original_title_en = item.title_en if hasattr(item, 'title_en') else None

        # Clean both titles
        cleaned_title = clean_title(original_title)
        cleaned_title_en = clean_title(original_title_en) if original_title_en else None

        # Check if anything changed
        title_changed = cleaned_title != original_title
        title_en_changed = (cleaned_title_en != original_title_en) if original_title_en else False

        if title_changed or title_en_changed:
            # Update the item
            item.title = cleaned_title
            if cleaned_title_en and hasattr(item, 'title_en'):
                item.title_en = cleaned_title_en

            await item.save()

            cleaned_count += 1

            # Save first 10 examples
            if len(examples) < 10:
                example = {
                    "id": str(item.id),
                    "original": original_title,
                    "cleaned": cleaned_title
                }
                if title_en_changed:
                    example["original_en"] = original_title_en
                    example["cleaned_en"] = cleaned_title_en
                examples.append(example)

            # Print progress every 10 items
            if cleaned_count % 10 == 0:
                print(f"Cleaned {cleaned_count} titles...")

    print(f"\n✅ Cleanup Complete!")
    print(f"Total items processed: {len(content_items)}")
    print(f"Titles cleaned: {cleaned_count}")

    if examples:
        print(f"\nFirst {len(examples)} examples:")
        for i, ex in enumerate(examples, 1):
            print(f"\n{i}. {ex['original']}")
            print(f"   → {ex['cleaned']}")
            if 'cleaned_en' in ex:
                print(f"   EN: {ex['original_en']} → {ex['cleaned_en']}")

    return cleaned_count


if __name__ == "__main__":
    print("🧹 Starting Direct Title Cleanup...")
    print("=" * 60)

    try:
        count = asyncio.run(clean_all_titles())
        print("=" * 60)
        print(f"✅ Successfully cleaned {count} titles!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

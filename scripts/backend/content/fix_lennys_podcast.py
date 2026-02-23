"""
Fix Lenny's Podcast: strip CDATA from title and set cover image.

Usage:
    cd backend
    poetry run python ../scripts/backend/content/fix_lennys_podcast.py
"""
import asyncio
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.content import Podcast

RSS_URL = "https://api.substack.com/feed/podcast/10845.rss"
COVER_URL = "https://substackcdn.com/feed/podcast/10845/6f98962f26f1b886bac3a845bb7ee00b.jpg"
CLEAN_TITLE = "Lenny's Podcast: Product | Career | Growth"


def strip_cdata(text: str) -> str:
    """Remove CDATA wrapper from text."""
    if not text:
        return text
    return re.sub(r"<!\[CDATA\[(.*?)]]>", r"\1", text).strip()


async def main():
    try:
        await connect_to_mongo()

        podcast = await Podcast.find_one({"rss_feed": RSS_URL})
        if not podcast:
            print("Podcast not found")
            sys.exit(1)

        print(f"Found: {podcast.title}")
        print(f"Current cover: {podcast.cover}")

        # Fix title
        podcast.title = strip_cdata(podcast.title) if podcast.title else CLEAN_TITLE
        podcast.title_en = podcast.title
        if podcast.description:
            podcast.description = strip_cdata(podcast.description)
            podcast.description_en = podcast.description

        # Set cover
        podcast.cover = COVER_URL
        podcast.updated_at = datetime.utcnow()
        await podcast.save()

        print(f"\nFixed title: {podcast.title}")
        print(f"Set cover: {podcast.cover}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())

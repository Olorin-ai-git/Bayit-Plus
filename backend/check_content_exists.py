#!/usr/bin/env python3
"""
Check if a specific content ID or title exists in the database.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database


async def check_content_by_id(db, content_id: str):
    """Check if content exists by ID."""
    print(f"Checking if content {content_id} exists...")

    # Check by string ID
    content = await db.content.find_one({"_id": content_id})

    if content:
        print(f"✅ Found content: {content.get('title', 'Unknown')}")
        print(f"   ID: {content['_id']}")
        print(f"   Type: {content.get('content_type', 'Unknown')}")
        return True
    else:
        # Try as ObjectId
        from bson import ObjectId
        try:
            obj_id = ObjectId(content_id)
            content = await db.content.find_one({"_id": obj_id})

            if content:
                print(f"✅ Found content (as ObjectId): {content.get('title', 'Unknown')}")
                print(f"   ID: {content['_id']}")
                print(f"   Type: {content.get('content_type', 'Unknown')}")
                return True
            else:
                print(f"❌ Content not found with ID: {content_id}")
                return False
        except Exception as e:
            print(f"❌ Content not found (invalid ObjectId): {e}")
            return False


async def check_content_by_title(db, title: str, limit: int = 10):
    """Check if content exists by title (case-insensitive)."""
    print(f"Searching for content with title matching: '{title}'")

    # Case-insensitive regex search
    contents = await db.content.find(
        {"title": {"$regex": title, "$options": "i"}}
    ).limit(limit).to_list(limit)

    if contents:
        print(f"✅ Found {len(contents)} matching item(s):")
        for idx, content in enumerate(contents, 1):
            print(f"\n{idx}. {content.get('title', 'Unknown')}")
            print(f"   ID: {content['_id']}")
            print(f"   Type: {content.get('content_type', 'Unknown')}")
            print(f"   Published: {content.get('is_published', False)}")
            print(f"   Category: {content.get('category_name', 'Unknown')}")
        return True
    else:
        print(f"❌ No content found matching title: '{title}'")
        return False


async def main(search_term: str, search_by_title: bool = False):
    """Main function."""
    await connect_to_mongo()

    try:
        db = get_database()

        if search_by_title:
            return await check_content_by_title(db, search_term)
        else:
            return await check_content_by_id(db, search_term)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python check_content_exists.py <content_id>")
        print("  python check_content_exists.py --title <title_search>")
        print("\nExamples:")
        print("  python check_content_exists.py 696ada05c19ab15ddcd42d04")
        print('  python check_content_exists.py --title "Matrix"')
        sys.exit(1)

    # Parse arguments
    search_by_title = False
    search_term = sys.argv[1]

    if search_term == "--title" and len(sys.argv) >= 3:
        search_by_title = True
        search_term = " ".join(sys.argv[2:])  # Join all remaining args as title

    try:
        result = asyncio.run(main(search_term, search_by_title))
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

#!/usr/bin/env python3
"""Fix the remaining URLs for movies with special characters in filenames."""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def fix_urls():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Fix mappings
    fixes = [
        {"old": "65_-_MX", "new": "65"},
        {"old": "A_Man_Called_Otto_p_-_MX", "new": "A_Man_Called_Otto"},
    ]

    updated_count = 0

    for fix in fixes:
        old_folder = fix["old"]
        new_folder = fix["new"]

        # Find all docs with the old folder
        cursor = content_collection.find({
            "stream_url": {"$regex": f"movies/{old_folder}/"}
        })

        async for doc in cursor:
            old_url = doc.get("stream_url", "")
            new_url = old_url.replace(f"/movies/{old_folder}/", f"/movies/{new_folder}/")

            print(f"{doc.get('title')}:")
            print(f"  Old: {old_url}")
            print(f"  New: {new_url}")

            result = await content_collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"stream_url": new_url}}
            )

            if result.modified_count > 0:
                updated_count += 1
                print(f"  ✅ Updated")

    print(f"\n✅ Successfully updated {updated_count} documents")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix_urls())

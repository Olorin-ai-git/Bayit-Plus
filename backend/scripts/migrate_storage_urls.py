#!/usr/bin/env python3
"""
Migrate storage URLs from S3 to GCS in MongoDB
Run once after data transfer completes

Usage:
    export MONGODB_URL="your-mongodb-url"
    export MONGODB_DB_NAME="bayit_plus"
    export OLD_STORAGE_DOMAIN="s3.amazonaws.com/your-bucket"  # or CloudFront domain
    export NEW_STORAGE_DOMAIN="storage.googleapis.com/bayit-plus-media"  # or Cloud CDN domain
    python scripts/migrate_storage_urls.py
"""
import asyncio
import os
import sys
from typing import List

from motor.motor_asyncio import AsyncIOMotorClient


async def migrate_urls():
    """Update all S3 URLs to GCS URLs in MongoDB"""

    # Get configuration from environment
    mongodb_url = os.getenv("MONGODB_URL")
    db_name = os.getenv("MONGODB_DB_NAME")
    old_domain = os.getenv("OLD_STORAGE_DOMAIN")
    new_domain = os.getenv("NEW_STORAGE_DOMAIN")

    if not all([mongodb_url, db_name, old_domain, new_domain]):
        print("ERROR: Missing required environment variables:")
        print("  - MONGODB_URL")
        print("  - MONGODB_DB_NAME")
        print("  - OLD_STORAGE_DOMAIN (e.g., 's3.amazonaws.com/your-bucket')")
        print(
            "  - NEW_STORAGE_DOMAIN (e.g., 'storage.googleapis.com/bayit-plus-media')"
        )
        sys.exit(1)

    print(f"Connecting to MongoDB: {mongodb_url}")
    print(f"Database: {db_name}")
    print(f"Replacing '{old_domain}' with '{new_domain}'")
    print()

    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_url)
    db = client[db_name]

    # Collections and fields to update
    updates_config = [
        {"collection": "content", "fields": ["thumbnail", "backdrop", "logo"]},
        {"collection": "live_channels", "fields": ["thumbnail", "logo"]},
        {"collection": "radio_stations", "fields": ["thumbnail", "logo"]},
        {"collection": "podcasts", "fields": ["thumbnail", "logo", "cover"]},
        {"collection": "podcast_episodes", "fields": ["thumbnail"]},
        {"collection": "users", "fields": ["avatar"]},
        {"collection": "widgets", "fields": ["thumbnail"]},
    ]

    total_updated = 0

    for config in updates_config:
        collection_name = config["collection"]
        fields = config["fields"]

        print(f"\nProcessing collection: {collection_name}")
        print("-" * 50)

        collection = db[collection_name]

        for field in fields:
            # Find documents with old domain in field
            query = {field: {"$regex": old_domain}}
            docs = await collection.find(query).to_list(None)

            if not docs:
                print(f"  {field}: No documents to update")
                continue

            print(f"  {field}: Found {len(docs)} documents to update")

            # Update each document
            updated_count = 0
            for doc in docs:
                old_url = doc.get(field)
                if old_url and old_domain in old_url:
                    new_url = old_url.replace(old_domain, new_domain)

                    # Update the document
                    result = await collection.update_one(
                        {"_id": doc["_id"]}, {"$set": {field: new_url}}
                    )

                    if result.modified_count > 0:
                        updated_count += 1

            print(f"  {field}: Updated {updated_count} documents")
            total_updated += updated_count

    print()
    print("=" * 50)
    print(f"Migration complete! Total documents updated: {total_updated}")
    print("=" * 50)

    # Close connection
    client.close()


if __name__ == "__main__":
    print("=" * 50)
    print("S3 to GCS URL Migration Script")
    print("=" * 50)
    print()

    asyncio.run(migrate_urls())

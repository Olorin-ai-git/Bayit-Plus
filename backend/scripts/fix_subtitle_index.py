#!/usr/bin/env python3
"""
Script to drop the problematic text index on subtitle_tracks collection.
The Hebrew language override is not supported by MongoDB text search.

Run with: poetry run python scripts/fix_subtitle_index.py
"""
import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env file if exists
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())

async def fix_subtitle_index():
    """Drop the problematic text index on subtitle_tracks"""
    # Get MongoDB URI from environment
    mongo_uri = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("ERROR: MONGODB_URI environment variable not set")
        print("Please set it before running this script")
        return False

    # Connect to MongoDB
    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_default_database()
    collection = db.subtitle_tracks

    print("Connected to MongoDB")
    print(f"Database: {db.name}")
    print(f"Collection: subtitle_tracks")

    # List existing indexes
    print("\nExisting indexes:")
    async for index in collection.list_indexes():
        print(f"  - {index['name']}: {index.get('key', {})}")
        if index.get('default_language'):
            print(f"    default_language: {index['default_language']}")

    # Drop the text index if it exists
    try:
        # Find the text index name
        text_index_name = None
        async for index in collection.list_indexes():
            if 'text' in str(index.get('key', {})):
                text_index_name = index['name']
                break

        if text_index_name:
            print(f"\nDropping problematic text index: {text_index_name}")
            await collection.drop_index(text_index_name)
            print("Index dropped successfully!")
        else:
            print("\nNo text index found to drop")

    except Exception as e:
        print(f"Error dropping index: {e}")
        return False

    print("\nDone! You can now restart the backend server.")
    print("The new index with default_language='none' will be created automatically.")

    client.close()
    return True


if __name__ == "__main__":
    asyncio.run(fix_subtitle_index())

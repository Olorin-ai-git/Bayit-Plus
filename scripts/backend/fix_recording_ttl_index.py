#!/usr/bin/env python3
"""
Fix the auto_delete_at index conflict on the recordings collection.

The existing index was created without expireAfterSeconds, but the Recording model
defines it as a TTL index (expireAfterSeconds=0). MongoDB rejects creating an index
with the same name but different options, so we drop the stale one and let Beanie
recreate it correctly on next server startup.

Run with: poetry run python scripts/fix_recording_ttl_index.py
"""
import asyncio
import os
import sys
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


async def fix_recording_ttl_index():
    """Drop the stale auto_delete_at index so the TTL version can be created."""
    mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL")
    if not mongo_uri:
        print("ERROR: MONGODB_URI environment variable not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_default_database()
    collection = db.recordings

    print(f"Connected to MongoDB: {db.name}")
    print(f"Collection: recordings\n")

    # List current indexes
    print("Current indexes:")
    target_index = None
    async for index in collection.list_indexes():
        name = index["name"]
        key = index.get("key", {})
        ttl = index.get("expireAfterSeconds")
        ttl_info = f", expireAfterSeconds={ttl}" if ttl is not None else ""
        print(f"  - {name}: {dict(key)}{ttl_info}")

        if name == "auto_delete_at_1" and ttl is None:
            target_index = name

    if not target_index:
        print("\nNo stale auto_delete_at index found (already has TTL or does not exist).")
        print("No action needed.")
        client.close()
        return

    print(f"\nDropping stale index: {target_index} (missing expireAfterSeconds)")
    try:
        await collection.drop_index(target_index)
        print("Index dropped successfully!")
    except Exception as e:
        print(f"Error dropping index: {e}")
        client.close()
        sys.exit(1)

    print("\nDone! Restart the backend server to recreate the TTL index automatically.")
    client.close()


if __name__ == "__main__":
    print("Fix Recording TTL Index (auto_delete_at)")
    print("=" * 50)
    print()
    asyncio.run(fix_recording_ttl_index())

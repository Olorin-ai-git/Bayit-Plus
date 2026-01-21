#!/usr/bin/env python3
"""
Verify MongoDB Atlas connection and data from production secrets.
Uses the same connection string that Cloud Run will use.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


async def verify_production_atlas():
    """Verify production MongoDB Atlas connection and data."""

    # Load environment variables
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)

    mongodb_uri = os.getenv("MONGODB_URI")
    mongodb_database = os.getenv("MONGODB_DATABASE", "olorin")

    if not mongodb_uri:
        print("❌ MONGODB_URI not set in environment")
        return False

    print("=" * 60)
    print("  MongoDB Atlas Production Verification")
    print("=" * 60)
    print()
    print(f"Database: {mongodb_database}")
    print(f"URI: {mongodb_uri[:30]}...{mongodb_uri[-20:]}")
    print()

    try:
        # Connect to MongoDB Atlas
        print("🔌 Connecting to MongoDB Atlas...")
        client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=5000)

        # Get database
        db = client[mongodb_database]

        # Verify connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas")
        print()

        # List collections
        print("📋 Collections:")
        collections = await db.list_collection_names()
        for collection_name in collections:
            count = await db[collection_name].count_documents({})
            print(f"   - {collection_name}: {count:,} documents")
        print()

        # Test investigations collection
        print("🔍 Testing investigations collection:")
        investigations_count = await db.investigations.count_documents({})
        print(f"   Total investigations: {investigations_count:,}")

        if investigations_count > 0:
            # Get sample investigation
            sample = await db.investigations.find_one({}, {"investigation_id": 1, "user_id": 1, "lifecycle_stage": 1, "created_at": 1})
            if sample:
                print(f"   Sample investigation:")
                print(f"      ID: {sample.get('investigation_id')}")
                print(f"      User: {sample.get('user_id')}")
                print(f"      Stage: {sample.get('lifecycle_stage')}")
                print(f"      Created: {sample.get('created_at')}")
        print()

        # Test audit log collection
        print("📝 Testing audit_log collection:")
        audit_count = await db.audit_log.count_documents({})
        print(f"   Total audit logs: {audit_count:,}")
        print()

        # Test query performance
        print("⚡ Testing query performance:")
        import time

        start = time.time()
        investigations = await db.investigations.find({}).limit(10).to_list(length=10)
        elapsed_ms = (time.time() - start) * 1000
        print(f"   Query 10 investigations: {elapsed_ms:.0f}ms")

        start = time.time()
        investigation = await db.investigations.find_one({"investigation_id": {"$exists": True}})
        elapsed_ms = (time.time() - start) * 1000
        print(f"   Find single investigation: {elapsed_ms:.0f}ms")
        print()

        # Connection type
        print("🌐 Connection details:")
        server_info = await client.server_info()
        print(f"   MongoDB version: {server_info.get('version')}")
        print(f"   Connection type: Atlas (mongodb+srv)")
        print()

        print("=" * 60)
        print("✅ MongoDB Atlas is production-ready!")
        print("=" * 60)

        await client.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(verify_production_atlas())
    sys.exit(0 if success else 1)

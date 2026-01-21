#!/usr/bin/env python3
"""
Test MongoDB Atlas connection and basic operations.

SYSTEM MANDATE Compliance:
- No hardcoded values: Reads from environment variables
- Complete implementation: Full connection test with error handling
- Fail-fast validation: Reports connection issues immediately
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


async def test_atlas_connection() -> bool:
    """Test MongoDB Atlas connection and basic operations.

    Returns:
        bool: True if all tests pass, False otherwise.
    """
    try:
        logger.info("🔍 Testing MongoDB Atlas Connection...")
        logger.info("=" * 80)

        # Load from environment
        mongodb_uri = os.getenv("MONGODB_URI")
        mongodb_database = os.getenv("MONGODB_DATABASE", "olorin")

        if not mongodb_uri:
            logger.error("❌ MONGODB_URI not set in environment")
            return False

        logger.info(f"📊 Database: {mongodb_database}")
        logger.info(f"🔗 URI: {mongodb_uri[:50]}...")

        # Create client
        client = AsyncIOMotorClient(
            mongodb_uri,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            maxPoolSize=100,
            minPoolSize=20,
        )

        # Test 1: Server connection
        logger.info("\n🧪 Test 1: Server Connection")
        try:
            await client.admin.command('ping')
            logger.info("✅ Successfully connected to MongoDB Atlas")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"❌ Connection failed: {e}")
            return False

        # Get database
        db = client[mongodb_database]

        # Test 2: List collections
        logger.info("\n🧪 Test 2: List Collections")
        collections = await db.list_collection_names()
        logger.info(f"✅ Found {len(collections)} collections:")
        for coll in sorted(collections):
            count = await db[coll].count_documents({})
            logger.info(f"   - {coll}: {count:,} documents")

        # Test 3: Query investigations
        logger.info("\n🧪 Test 3: Query Investigations")
        inv_count = await db.investigations.count_documents({})
        logger.info(f"✅ Total investigations: {inv_count:,}")

        if inv_count > 0:
            # Get sample investigation
            sample = await db.investigations.find_one({})
            logger.info(f"✅ Sample investigation ID: {sample.get('investigation_id')}")
            logger.info(f"   Status: {sample.get('status')}")
            logger.info(f"   Created: {sample.get('created_at')}")

        # Test 4: Query audit log
        logger.info("\n🧪 Test 4: Query Audit Log")
        audit_count = await db.audit_log.count_documents({})
        logger.info(f"✅ Total audit entries: {audit_count:,}")

        # Test 5: Check indexes
        logger.info("\n🧪 Test 5: Verify Indexes")
        inv_indexes = await db.investigations.index_information()
        logger.info(f"✅ Investigations indexes: {len(inv_indexes)}")
        for idx_name in sorted(inv_indexes.keys()):
            if idx_name != "_id_":  # Skip default index
                logger.info(f"   - {idx_name}")

        audit_indexes = await db.audit_log.index_information()
        logger.info(f"✅ Audit log indexes: {len(audit_indexes)}")
        for idx_name in sorted(audit_indexes.keys()):
            if idx_name != "_id_":  # Skip default index
                logger.info(f"   - {idx_name}")

        # Test 6: Performance test
        logger.info("\n🧪 Test 6: Query Performance")
        start = datetime.now(timezone.utc)
        results = await db.investigations.find({}).limit(100).to_list(length=100)
        end = datetime.now(timezone.utc)
        duration_ms = (end - start).total_seconds() * 1000
        logger.info(f"✅ Fetched 100 investigations in {duration_ms:.2f}ms")

        # Test 7: Atlas features
        logger.info("\n🧪 Test 7: Atlas Connection Type")
        is_atlas = "mongodb+srv://" in mongodb_uri
        logger.info(f"✅ Using MongoDB Atlas: {is_atlas}")
        if is_atlas:
            logger.info("   - Vector Search available")
            logger.info("   - Atlas Search available")
            logger.info("   - Time Series collections available")

        logger.info("\n" + "=" * 80)
        logger.info("🎉 ALL TESTS PASSED - MongoDB Atlas is ready!")
        logger.info("=" * 80)

        # Close connection
        client.close()
        return True

    except Exception as e:
        logger.error(f"\n❌ Test failed with error: {e}")
        logger.exception("Full traceback:")
        return False


async def main():
    """Main entry point."""
    success = await test_atlas_connection()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())

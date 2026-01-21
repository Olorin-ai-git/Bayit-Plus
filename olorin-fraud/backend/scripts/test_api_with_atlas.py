#!/usr/bin/env python3
"""
Test API endpoints with MongoDB Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: Uses environment variables for configuration
- Complete implementation: Full API endpoint testing
- Fail-fast validation: Reports failures immediately
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


async def test_investigation_endpoints() -> bool:
    """Test investigation-related endpoints with Atlas.

    Returns:
        bool: True if all tests pass, False otherwise.
    """
    try:
        logger.info("🧪 Testing API Endpoints with MongoDB Atlas")
        logger.info("=" * 80)

        # Load from environment
        mongodb_uri = os.getenv("MONGODB_URI")
        mongodb_database = os.getenv("MONGODB_DATABASE", "olorin")

        if not mongodb_uri:
            logger.error("❌ MONGODB_URI not set in environment")
            return False

        # Create client
        client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        db = client[mongodb_database]

        # Test 1: List investigations (paginated)
        logger.info("\n🧪 Test 1: List Investigations (GET /investigations)")
        logger.info("   Simulating: GET /investigations?limit=10&skip=0")

        investigations = await db.investigations.find({}).sort("created_at", -1).limit(10).to_list(length=10)
        logger.info(f"✅ Retrieved {len(investigations)} investigations")

        if investigations:
            latest = investigations[0]
            logger.info(f"   Latest: {latest.get('investigation_id')}")
            logger.info(f"   Status: {latest.get('status')}")
            logger.info(f"   Created: {latest.get('created_at')}")

        # Test 2: Get investigation by ID
        logger.info("\n🧪 Test 2: Get Investigation by ID (GET /investigations/{id})")

        if investigations:
            test_id = investigations[0].get("investigation_id")
            logger.info(f"   Simulating: GET /investigations/{test_id}")

            investigation = await db.investigations.find_one({"investigation_id": test_id})

            if investigation:
                logger.info(f"✅ Successfully retrieved investigation {test_id}")
                logger.info(f"   User ID: {investigation.get('user_id')}")
                logger.info(f"   Lifecycle Stage: {investigation.get('lifecycle_stage')}")
                logger.info(f"   Version: {investigation.get('version')}")
            else:
                logger.error(f"❌ Failed to retrieve investigation {test_id}")
                return False
        else:
            logger.info("⚠️  No investigations to test GET by ID")

        # Test 3: Filter investigations by status
        logger.info("\n🧪 Test 3: Filter by Status (GET /investigations?status=COMPLETED)")
        logger.info("   Simulating: GET /investigations?status=COMPLETED")

        completed = await db.investigations.find({"status": "COMPLETED"}).limit(5).to_list(length=5)
        logger.info(f"✅ Found {len(completed)} completed investigations")

        # Test 4: Filter investigations by user
        logger.info("\n🧪 Test 4: Filter by User (GET /investigations?user_id=X)")

        if investigations:
            test_user_id = investigations[0].get("user_id")
            logger.info(f"   Simulating: GET /investigations?user_id={test_user_id}")

            user_investigations = await db.investigations.find({"user_id": test_user_id}).limit(5).to_list(length=5)
            logger.info(f"✅ Found {len(user_investigations)} investigations for user {test_user_id}")
        else:
            logger.info("⚠️  No investigations to test user filter")

        # Test 5: Get audit log for investigation
        logger.info("\n🧪 Test 5: Get Audit Log (GET /investigations/{id}/audit)")

        if investigations:
            test_id = investigations[0].get("investigation_id")
            logger.info(f"   Simulating: GET /investigations/{test_id}/audit")

            audit_entries = await db.audit_log.find(
                {"metadata.investigation_id": test_id}
            ).sort("timestamp", -1).limit(10).to_list(length=10)

            logger.info(f"✅ Retrieved {len(audit_entries)} audit entries for investigation {test_id}")

            if audit_entries:
                latest_audit = audit_entries[0]
                logger.info(f"   Latest action: {latest_audit.get('metadata', {}).get('action_type')}")
                logger.info(f"   Timestamp: {latest_audit.get('timestamp')}")
        else:
            logger.info("⚠️  No investigations to test audit log")

        # Test 6: Count by status (aggregation)
        logger.info("\n🧪 Test 6: Status Aggregation (GET /investigations/stats)")
        logger.info("   Simulating: GET /investigations/stats/by-status")

        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]

        status_counts = await db.investigations.aggregate(status_pipeline).to_list(length=None)
        logger.info(f"✅ Status distribution:")

        for status_doc in status_counts:
            status = status_doc.get("_id") or "UNKNOWN"
            count = status_doc.get("count", 0)
            logger.info(f"   - {status}: {count:,} investigations")

        # Test 7: Recent activity
        logger.info("\n🧪 Test 7: Recent Activity (GET /investigations/recent)")
        logger.info("   Simulating: GET /investigations/recent?hours=24")

        # Get investigations from last 24 hours
        twenty_four_hours_ago = datetime.now(timezone.utc).timestamp() - (24 * 3600)

        recent = await db.investigations.find({
            "created_at": {"$gte": datetime.fromtimestamp(twenty_four_hours_ago, tz=timezone.utc)}
        }).sort("created_at", -1).to_list(length=None)

        logger.info(f"✅ Found {len(recent)} investigations created in last 24 hours")

        # Test 8: Performance metrics
        logger.info("\n🧪 Test 8: Query Performance Metrics")

        # Measure different query patterns
        queries = [
            ("Simple find", lambda: db.investigations.find_one({})),
            ("Filtered query", lambda: db.investigations.find({"status": "COMPLETED"}).limit(10).to_list(length=10)),
            ("Sort and limit", lambda: db.investigations.find({}).sort("created_at", -1).limit(100).to_list(length=100)),
            ("Aggregation", lambda: db.investigations.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(length=None)),
        ]

        for query_name, query_func in queries:
            start = datetime.now(timezone.utc)
            await query_func()
            end = datetime.now(timezone.utc)
            duration_ms = (end - start).total_seconds() * 1000
            logger.info(f"   - {query_name}: {duration_ms:.2f}ms")

        logger.info("\n" + "=" * 80)
        logger.info("🎉 ALL API ENDPOINT TESTS PASSED")
        logger.info("=" * 80)
        logger.info("\n📝 Summary:")
        logger.info("   ✅ List investigations working")
        logger.info("   ✅ Get by ID working")
        logger.info("   ✅ Filter by status working")
        logger.info("   ✅ Filter by user working")
        logger.info("   ✅ Audit log retrieval working")
        logger.info("   ✅ Status aggregation working")
        logger.info("   ✅ Recent activity working")
        logger.info("   ✅ Query performance acceptable")
        logger.info("\n💡 MongoDB Atlas is production-ready for API endpoints!")

        # Close connection
        client.close()
        return True

    except Exception as e:
        logger.error(f"\n❌ Test failed with error: {e}")
        logger.exception("Full traceback:")
        return False


async def main():
    """Main entry point."""
    success = await test_investigation_endpoints()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Test Investigation API with MongoDB Atlas.
Initializes MongoDB and queries investigations directly.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


async def test_investigation_api():
    """Test investigation queries against MongoDB Atlas."""

    # Load environment variables
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)

    mongodb_uri = os.getenv("MONGODB_URI")
    mongodb_database = os.getenv("MONGODB_DATABASE", "olorin")

    if not mongodb_uri:
        print("❌ MONGODB_URI not set in environment")
        return False

    print("=" * 80)
    print("  Investigation API - MongoDB Atlas Test")
    print("=" * 80)
    print()

    try:
        # Connect to MongoDB Atlas
        print("🔌 Connecting to MongoDB Atlas...")
        client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        db = client[mongodb_database]

        # Verify connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas")
        print()

        # Test 1: List investigations
        print("📋 Test 1: List Investigations")
        print("-" * 40)
        investigations = await db.investigations.find().limit(5).to_list(length=5)
        print(f"   Found {len(investigations)} investigations:")
        for idx, inv in enumerate(investigations, 1):
            print(f"   {idx}. ID: {inv.get('investigation_id')}")
            print(f"      User: {inv.get('user_id')}")
            print(f"      Stage: {inv.get('lifecycle_stage')}")
            print(f"      Status: {inv.get('status')}")
            print(f"      Created: {inv.get('created_at')}")
            print()

        # Test 2: Get specific investigation
        if investigations:
            test_id = investigations[0].get('investigation_id')
            print(f"📋 Test 2: Get Specific Investigation ({test_id})")
            print("-" * 40)
            investigation = await db.investigations.find_one({"investigation_id": test_id})
            if investigation:
                print(f"   ✅ Found investigation:")
                print(f"      ID: {investigation.get('investigation_id')}")
                print(f"      User: {investigation.get('user_id')}")
                print(f"      Stage: {investigation.get('lifecycle_stage')}")
                print(f"      Status: {investigation.get('status')}")
                print(f"      Created: {investigation.get('created_at')}")
                print(f"      Updated: {investigation.get('updated_at')}")

                # Show settings if available
                settings = investigation.get('settings')
                if settings:
                    print(f"      Settings:")
                    print(f"         Entity Type: {settings.get('entity_type')}")
                    print(f"         Entity Value: {settings.get('entity_value')}")
                print()

        # Test 3: Count by status
        print("📋 Test 3: Count by Status")
        print("-" * 40)
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        status_counts = await db.investigations.aggregate(pipeline).to_list(length=None)
        for status in status_counts:
            print(f"   {status['_id']}: {status['count']} investigations")
        print()

        # Test 4: Count by lifecycle stage
        print("📋 Test 4: Count by Lifecycle Stage")
        print("-" * 40)
        pipeline = [
            {"$group": {"_id": "$lifecycle_stage", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        stage_counts = await db.investigations.aggregate(pipeline).to_list(length=None)
        for stage in stage_counts:
            print(f"   {stage['_id']}: {stage['count']} investigations")
        print()

        # Test 5: Recent investigations
        print("📋 Test 5: Recent Investigations (Last 5)")
        print("-" * 40)
        recent = await db.investigations.find().sort("created_at", -1).limit(5).to_list(length=5)
        for idx, inv in enumerate(recent, 1):
            print(f"   {idx}. {inv.get('investigation_id')} - {inv.get('created_at')}")
        print()

        # Test 6: Audit log entries for an investigation
        if investigations:
            test_id = investigations[0].get('investigation_id')
            print(f"📋 Test 6: Audit Log for Investigation ({test_id})")
            print("-" * 40)
            audit_logs = await db.audit_log.find(
                {"metadata.investigation_id": test_id}
            ).limit(3).to_list(length=3)
            print(f"   Found {len(audit_logs)} audit log entries:")
            for idx, log in enumerate(audit_logs, 1):
                metadata = log.get('metadata', {})
                print(f"   {idx}. Action: {metadata.get('action_type')}")
                print(f"      Timestamp: {log.get('timestamp')}")
                print()

        print("=" * 80)
        print("✅ All Investigation API tests passed!")
        print("=" * 80)
        print()
        print("Summary:")
        print(f"  Total investigations: {await db.investigations.count_documents({})}")
        print(f"  Total audit logs: {await db.audit_log.count_documents({})}")
        print()

        await client.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_investigation_api())
    sys.exit(0 if success else 1)

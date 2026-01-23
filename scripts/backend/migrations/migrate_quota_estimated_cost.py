#!/usr/bin/env python3
"""
Migration Script: Add estimated_cost_current_month to Existing Quota Records

This script ensures all existing LiveFeatureQuota records have the
estimated_cost_current_month field set to 0.0 (default value).

Context: The field was added to the model but existing database records
may not have it, causing validation errors when fetching usage stats.

Author: Claude Code
Date: 2026-01-23
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.live_feature_quota import LiveFeatureQuota


async def migrate_quota_records():
    """Add missing estimated_cost_current_month field to existing quota records"""
    print("=" * 70)
    print("Migration: Add estimated_cost_current_month to Quota Records")
    print("=" * 70)
    print()

    try:
        # Connect to database
        print("📡 Connecting to MongoDB...")
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
        print()

        # Find all quota records
        print("🔍 Fetching all quota records...")
        quotas = await LiveFeatureQuota.find_all().to_list()
        print(f"✅ Found {len(quotas)} quota records")
        print()

        if not quotas:
            print("ℹ️  No quota records found. Nothing to migrate.")
            return

        # Check and update records
        updated = 0
        already_ok = 0

        print("🔧 Checking and updating records...")
        for quota in quotas:
            # Check if field exists and has a value
            if not hasattr(quota, "estimated_cost_current_month") or quota.estimated_cost_current_month is None:
                quota.estimated_cost_current_month = 0.0
                await quota.save()
                updated += 1
                print(f"  ✅ Updated quota for user {quota.user_id}")
            else:
                already_ok += 1

        print()
        print("=" * 70)
        print("Migration Summary:")
        print(f"  • Total records: {len(quotas)}")
        print(f"  • Updated: {updated}")
        print(f"  • Already OK: {already_ok}")
        print("=" * 70)
        print()

        if updated > 0:
            print("✅ Migration completed successfully!")
        else:
            print("ℹ️  No records needed updating.")

    except Exception as e:
        print()
        print("=" * 70)
        print("❌ Migration failed!")
        print(f"Error: {type(e).__name__}: {e}")
        print("=" * 70)
        import traceback

        print()
        print("Full traceback:")
        print(traceback.format_exc())
        sys.exit(1)
    finally:
        # Close database connection
        print()
        print("📡 Closing database connection...")
        await close_mongo_connection()
        print("✅ Connection closed")


if __name__ == "__main__":
    asyncio.run(migrate_quota_records())

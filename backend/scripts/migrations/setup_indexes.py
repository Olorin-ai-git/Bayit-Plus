#!/usr/bin/env python3
"""
Setup MongoDB indexes for migration tracking.

Creates TTL index for automatic rollback data cleanup (90 days).
Run this once after deploying migration infrastructure.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[2]))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database


async def setup_migration_indexes():
    """Create indexes for migration tracking collections."""
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        db = await get_database()

        print("Setting up migration tracking indexes...")

        # 1. MigrationRecord indexes (created automatically by Beanie)
        print("✓ MigrationRecord indexes (handled by Beanie)")

        # 2. RollbackData TTL index (must be created manually)
        print("Creating TTL index for RollbackData (90-day expiration)...")

        # Check if index already exists
        existing_indexes = await db["_migration_rollback"].list_indexes().to_list(
            length=None
        )
        ttl_index_exists = any(
            idx.get("expireAfterSeconds") is not None for idx in existing_indexes
        )

        if ttl_index_exists:
            print("  ✓ TTL index already exists")
        else:
            # Create TTL index: expire after 90 days (7776000 seconds)
            await db["_migration_rollback"].create_index(
                [("created_at", 1)], expireAfterSeconds=7776000  # 90 days
            )
            print("  ✓ TTL index created (90-day expiration)")

        # 3. Verify indexes
        print("\nVerifying indexes...")
        migrations_indexes = await db["_migrations"].list_indexes().to_list(length=None)
        rollback_indexes = await db["_migration_rollback"].list_indexes().to_list(
            length=None
        )

        print(f"  _migrations collection: {len(migrations_indexes)} indexes")
        print(f"  _migration_rollback collection: {len(rollback_indexes)} indexes")

        print("\n✅ Migration tracking indexes setup complete!")

    except Exception as e:
        print(f"❌ Error setting up indexes: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    print("MongoDB Migration Tracking Index Setup")
    print("=" * 50)
    print()

    asyncio.run(setup_migration_indexes())

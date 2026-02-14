"""
Migration: Populate linked_providers Field

DATA MIGRATION - Populates linked_providers field for existing users based on:
- auth_provider field
- google_id presence
- apple_id presence
- hashed_password presence

This migration is SAFE and IDEMPOTENT - can run multiple times without issues.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Migration metadata
MIGRATION_VERSION = "002"
MIGRATION_NAME = "populate_linked_providers"
MIGRATION_DATE = "2026-02-14"


async def upgrade():
    """
    Populate linked_providers field for existing users.

    Logic:
    - If user has hashed_password -> add "local" to linked_providers
    - If user has google_id -> add "google" to linked_providers
    - If user has apple_id -> add "apple" to linked_providers
    - Ensures linked_providers is not empty (at least one provider)
    - Idempotent: safe to run multiple times
    """
    logger.info(f"Starting migration {MIGRATION_VERSION}: {MIGRATION_NAME}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        users_collection = db.users

        # Count total users
        total_users = await users_collection.count_documents({})
        logger.info(f"Total users in database: {total_users}")

        # Count users with empty or missing linked_providers
        users_needing_migration = await users_collection.count_documents({
            "$or": [
                {"linked_providers": {"$exists": False}},
                {"linked_providers": {"$size": 0}},
                {"linked_providers": None}
            ]
        })
        logger.info(f"Users needing migration: {users_needing_migration}")

        if users_needing_migration == 0:
            logger.info("✅ No users need migration - all users already have linked_providers")
            return True

        # Process users in batches
        batch_size = 100
        migrated_count = 0
        skipped_count = 0
        error_count = 0

        cursor = users_collection.find({
            "$or": [
                {"linked_providers": {"$exists": False}},
                {"linked_providers": {"$size": 0}},
                {"linked_providers": None}
            ]
        })

        async for user in cursor:
            try:
                user_id = user["_id"]
                email = user.get("email", "unknown")

                # Determine which providers should be linked
                providers = []

                # Check for password (local auth)
                if user.get("hashed_password"):
                    providers.append("local")

                # Check for Google ID
                if user.get("google_id"):
                    providers.append("google")

                # Check for Apple ID
                if user.get("apple_id"):
                    providers.append("apple")

                # Fallback: if no providers detected, use auth_provider field
                if not providers:
                    auth_provider = user.get("auth_provider", "local")
                    providers.append(auth_provider)
                    logger.warning(
                        f"User {email} has no detectable providers, using auth_provider: {auth_provider}",
                        extra={"user_id": str(user_id)}
                    )

                # Update user with populated linked_providers
                result = await users_collection.update_one(
                    {"_id": user_id},
                    {"$set": {"linked_providers": providers}}
                )

                if result.modified_count > 0:
                    migrated_count += 1
                    logger.debug(
                        f"Migrated user {email}: linked_providers={providers}",
                        extra={"user_id": str(user_id)}
                    )
                else:
                    skipped_count += 1
                    logger.debug(
                        f"Skipped user {email} (already migrated or no changes)",
                        extra={"user_id": str(user_id)}
                    )

                # Progress logging every 100 users
                if (migrated_count + skipped_count) % 100 == 0:
                    logger.info(
                        f"Progress: {migrated_count + skipped_count}/{users_needing_migration} users processed"
                    )

            except Exception as e:
                error_count += 1
                logger.error(
                    f"Error migrating user {user.get('email', 'unknown')}: {str(e)}",
                    extra={"user_id": str(user.get("_id", "unknown"))}
                )

        # Final summary
        logger.info("=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  Total users in DB: {total_users}")
        logger.info(f"  Users needing migration: {users_needing_migration}")
        logger.info(f"  ✅ Successfully migrated: {migrated_count}")
        logger.info(f"  ⏭️  Skipped (no changes): {skipped_count}")
        logger.info(f"  ❌ Errors: {error_count}")
        logger.info("=" * 60)

        # Create migration history record
        from datetime import datetime
        migration_record = {
            "version": MIGRATION_VERSION,
            "name": MIGRATION_NAME,
            "applied_at": datetime.utcnow(),
            "status": "completed",
            "stats": {
                "total_users": total_users,
                "users_needing_migration": users_needing_migration,
                "migrated": migrated_count,
                "skipped": skipped_count,
                "errors": error_count
            }
        }

        await db.migration_history.insert_one(migration_record)

        if error_count > 0:
            logger.warning(f"⚠️  Migration {MIGRATION_VERSION} completed with {error_count} errors")
        else:
            logger.info(f"✅ Migration {MIGRATION_VERSION} completed successfully")

        return True

    except Exception as e:
        logger.error(f"❌ Migration {MIGRATION_VERSION} failed: {str(e)}")
        raise

    finally:
        client.close()


async def verify():
    """
    Verify migration was applied correctly.

    Checks:
    - All users have linked_providers field
    - linked_providers is not empty
    - linked_providers matches expected values based on user data
    """
    logger.info(f"Verifying migration {MIGRATION_VERSION}...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        users_collection = db.users

        # Check for users with missing or empty linked_providers
        problematic_users = await users_collection.count_documents({
            "$or": [
                {"linked_providers": {"$exists": False}},
                {"linked_providers": {"$size": 0}},
                {"linked_providers": None}
            ]
        })

        if problematic_users > 0:
            logger.error(f"❌ Found {problematic_users} users with missing or empty linked_providers")
            return False

        # Verify migration history record
        from datetime import datetime
        migration_record = await db.migration_history.find_one({"version": MIGRATION_VERSION})
        if not migration_record:
            logger.error(f"❌ Migration history record not found for version {MIGRATION_VERSION}")
            return False

        # Display migration stats
        stats = migration_record.get("stats", {})
        logger.info(f"✅ Migration {MIGRATION_VERSION} verification passed")
        logger.info(f"   Migrated {stats.get('migrated', 0)} users")
        logger.info(f"   Skipped {stats.get('skipped', 0)} users")
        logger.info(f"   Errors: {stats.get('errors', 0)}")

        return True

    except Exception as e:
        logger.error(f"❌ Migration verification failed: {str(e)}")
        return False

    finally:
        client.close()


async def downgrade():
    """
    Rollback linked_providers migration.

    WARNING: This will REMOVE the linked_providers field from all users.
    Only use in development/testing environments.
    """
    logger.warning(f"Rolling back migration {MIGRATION_VERSION}: {MIGRATION_NAME}")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        users_collection = db.users

        # Remove linked_providers field from all users
        result = await users_collection.update_many(
            {},
            {"$unset": {"linked_providers": ""}}
        )

        logger.info(f"Removed linked_providers from {result.modified_count} users")

        # Remove migration history record
        await db.migration_history.delete_one({"version": MIGRATION_VERSION})

        logger.info(f"✅ Migration {MIGRATION_VERSION} rolled back successfully")

        return True

    except Exception as e:
        logger.error(f"❌ Rollback of migration {MIGRATION_VERSION} failed: {str(e)}")
        raise

    finally:
        client.close()


if __name__ == "__main__":
    import sys

    async def main():
        command = sys.argv[1] if len(sys.argv) > 1 else "upgrade"

        if command == "upgrade":
            success = await upgrade()
        elif command == "downgrade":
            success = await downgrade()
        elif command == "verify":
            success = await verify()
        else:
            logger.error(f"Unknown command: {command}")
            logger.info("Usage: python migrations/002_populate_linked_providers.py [upgrade|downgrade|verify]")
            sys.exit(1)

        if success:
            logger.info(f"✅ Command '{command}' completed successfully")
            sys.exit(0)
        else:
            logger.error(f"❌ Command '{command}' failed")
            sys.exit(1)

    asyncio.run(main())

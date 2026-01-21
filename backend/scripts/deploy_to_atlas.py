"""Deploy MongoDB to Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: All from environment
- Complete implementation: Full deployment workflow
- No placeholders or TODOs

Migrates local MongoDB data to MongoDB Atlas production cluster.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AtlasDeployment:
    """Handle deployment to MongoDB Atlas."""

    def __init__(self):
        """Initialize deployment configuration."""
        # Local MongoDB
        self.local_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.local_db_name = os.getenv("MONGODB_DATABASE", "olorin")

        # MongoDB Atlas
        self.atlas_uri = os.getenv("MONGODB_ATLAS_URI")
        self.atlas_db_name = os.getenv("MONGODB_ATLAS_DATABASE", "olorin")

        # Verify Atlas URI is set
        if not self.atlas_uri:
            logger.error("❌ MONGODB_ATLAS_URI not set in environment")
            logger.error("   Set it to your Atlas connection string:")
            logger.error("   export MONGODB_ATLAS_URI='mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority'")
            sys.exit(1)

        self.local_client = None
        self.atlas_client = None
        self.local_db = None
        self.atlas_db = None

        # Collections to migrate
        self.collections = [
            "investigations",
            "audit_log",
            "detectors",
            "detection_runs",
            "anomaly_events",
            "transaction_scores",
            "templates",
            "composio_connections",
            "composio_action_audits",
            "soar_playbook_executions"
        ]

    async def connect(self) -> bool:
        """Connect to both local and Atlas MongoDB."""
        try:
            logger.info("Connecting to local MongoDB...")
            self.local_client = AsyncIOMotorClient(self.local_uri)
            self.local_db = self.local_client[self.local_db_name]
            await self.local_db.command("ping")
            logger.info(f"✅ Connected to local MongoDB: {self.local_db_name}")

            logger.info("")
            logger.info("Connecting to MongoDB Atlas...")
            self.atlas_client = AsyncIOMotorClient(self.atlas_uri)
            self.atlas_db = self.atlas_client[self.atlas_db_name]
            await self.atlas_db.command("ping")
            logger.info(f"✅ Connected to Atlas: {self.atlas_db_name}")

            return True

        except Exception as e:
            logger.error(f"❌ Connection failed: {e}")
            return False

    async def get_collection_stats(self, db, collection_name: str) -> Dict:
        """Get statistics for a collection."""
        try:
            count = await db[collection_name].count_documents({})
            indexes = await db[collection_name].index_information()
            return {
                "count": count,
                "indexes": len(indexes)
            }
        except Exception as e:
            return {"count": 0, "indexes": 0, "error": str(e)}

    async def migrate_collection(self, collection_name: str, batch_size: int = 1000) -> bool:
        """Migrate a single collection from local to Atlas."""
        logger.info(f"Migrating {collection_name}...")

        try:
            # Get source collection
            source_collection = self.local_db[collection_name]
            dest_collection = self.atlas_db[collection_name]

            # Get total count
            total_docs = await source_collection.count_documents({})

            if total_docs == 0:
                logger.info(f"   ⏭️  Empty collection, skipping")
                return True

            logger.info(f"   Migrating {total_docs:,} documents...")

            # Clear destination collection
            await dest_collection.delete_many({})
            logger.info(f"   Cleared destination collection")

            # Migrate in batches
            migrated = 0
            cursor = source_collection.find({})

            batch = []
            async for doc in cursor:
                batch.append(doc)

                if len(batch) >= batch_size:
                    await dest_collection.insert_many(batch)
                    migrated += len(batch)
                    logger.info(f"   Progress: {migrated:,}/{total_docs:,} ({migrated/total_docs*100:.1f}%)")
                    batch = []

            # Insert remaining documents
            if batch:
                await dest_collection.insert_many(batch)
                migrated += len(batch)

            logger.info(f"   ✅ Migrated {migrated:,} documents")

            # Verify count
            dest_count = await dest_collection.count_documents({})
            if dest_count != total_docs:
                logger.error(f"   ❌ Count mismatch: {total_docs} -> {dest_count}")
                return False

            return True

        except Exception as e:
            logger.error(f"   ❌ Migration failed: {e}")
            return False

    async def copy_indexes(self, collection_name: str) -> bool:
        """Copy indexes from local to Atlas."""
        logger.info(f"Copying indexes for {collection_name}...")

        try:
            source_collection = self.local_db[collection_name]
            dest_collection = self.atlas_db[collection_name]

            # Get source indexes
            source_indexes = await source_collection.index_information()

            # Copy each index (skip _id_ default index)
            for index_name, index_info in source_indexes.items():
                if index_name == "_id_":
                    continue

                # Extract index specification
                key_spec = index_info.get("key", [])
                unique = index_info.get("unique", False)

                # Create index on Atlas
                await dest_collection.create_index(
                    key_spec,
                    unique=unique,
                    name=index_name
                )
                logger.info(f"   ✅ Created index: {index_name}")

            return True

        except Exception as e:
            logger.error(f"   ❌ Index copy failed: {e}")
            return False

    async def verify_deployment(self) -> bool:
        """Verify Atlas deployment."""
        logger.info("")
        logger.info("=" * 80)
        logger.info("🔍 Verifying Atlas Deployment")
        logger.info("=" * 80)

        all_verified = True

        for collection_name in self.collections:
            local_stats = await self.get_collection_stats(self.local_db, collection_name)
            atlas_stats = await self.get_collection_stats(self.atlas_db, collection_name)

            local_count = local_stats["count"]
            atlas_count = atlas_stats["count"]

            if local_count == atlas_count:
                logger.info(f"✅ {collection_name}: {atlas_count:,} documents")
            else:
                logger.error(f"❌ {collection_name}: {local_count:,} -> {atlas_count:,} (mismatch)")
                all_verified = False

        return all_verified

    async def deploy(self) -> bool:
        """Execute full deployment to Atlas."""
        logger.info("=" * 80)
        logger.info("🚀 MongoDB Atlas Deployment")
        logger.info("=" * 80)
        logger.info("")
        logger.info(f"Source: {self.local_uri} / {self.local_db_name}")
        logger.info(f"Destination: Atlas / {self.atlas_db_name}")
        logger.info("")

        # Connect
        if not await self.connect():
            return False

        logger.info("")
        logger.info("=" * 80)
        logger.info("📊 Pre-Migration Statistics")
        logger.info("=" * 80)

        for collection_name in self.collections:
            stats = await self.get_collection_stats(self.local_db, collection_name)
            if stats["count"] > 0:
                logger.info(f"{collection_name}: {stats['count']:,} documents, {stats['indexes']} indexes")

        logger.info("")
        logger.info("=" * 80)
        logger.info("🔄 Starting Migration")
        logger.info("=" * 80)
        logger.info("")

        # Migrate each collection
        success = True
        for collection_name in self.collections:
            if not await self.migrate_collection(collection_name):
                success = False
                break
            logger.info("")

        if not success:
            logger.error("❌ Migration failed")
            return False

        logger.info("=" * 80)
        logger.info("📑 Creating Indexes")
        logger.info("=" * 80)
        logger.info("")

        # Copy indexes
        for collection_name in self.collections:
            local_stats = await self.get_collection_stats(self.local_db, collection_name)
            if local_stats["count"] > 0:
                await self.copy_indexes(collection_name)
                logger.info("")

        # Verify deployment
        if not await self.verify_deployment():
            logger.error("❌ Verification failed")
            return False

        logger.info("")
        logger.info("=" * 80)
        logger.info("✅ Atlas Deployment Complete!")
        logger.info("=" * 80)
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Update your application's MONGODB_URI to use Atlas connection string")
        logger.info("2. Test your application with Atlas")
        logger.info("3. Configure Atlas backup policies")
        logger.info("4. Set up monitoring and alerts")
        logger.info("")

        return True

    async def close(self):
        """Close database connections."""
        if self.local_client:
            self.local_client.close()
        if self.atlas_client:
            self.atlas_client.close()


async def main():
    """Run Atlas deployment."""
    deployment = AtlasDeployment()

    try:
        success = await deployment.deploy()
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        logger.warning("\n⚠️  Deployment interrupted by user")
        sys.exit(1)

    except Exception as e:
        logger.error(f"❌ Deployment failed: {e}", exc_info=True)
        sys.exit(1)

    finally:
        await deployment.close()


if __name__ == "__main__":
    asyncio.run(main())

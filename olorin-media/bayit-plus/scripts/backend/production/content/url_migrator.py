#!/usr/bin/env python3
"""
Unified URL Migration Tool.

Consolidates 7+ individual URL migration scripts into a single tool
with MongoDB transactions, rollback capability, and comprehensive error handling.

Replaces:
- fix_all_bucket_urls.py
- update_bucket_urls.py
- migrate_storage_urls.py
- fix_remaining_urls.py
- update_all_old_bucket_urls.py
- fix_atlas_urls.py
- fix_movie_stream_urls.py

Usage:
    # Dry run (default)
    python url_migrator.py bucket_upgrade

    # Execute migration
    python url_migrator.py bucket_upgrade --execute

    # Rollback migration
    python url_migrator.py --rollback MIGRATION_ID
"""
import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pymongo.errors

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3]))

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId
from scripts.utilities import (
    MigrationRegistry,
    RollbackStorage,
    URLTransformer,
    ContentHelpers,
)


class URLMigrator:
    """
    Unified URL migration tool with transactions and rollback.

    All transformation rules from configuration - NO HARDCODED VALUES.
    """

    def __init__(self):
        """Initialize migrator with configuration and utilities."""
        self.transformer = URLTransformer()
        self.registry = MigrationRegistry()
        self.rollback_storage = RollbackStorage()

        # All transformation types from configuration
        self.transformations = {
            'bucket_upgrade': {
                'description': 'Upgrade old bucket URLs to new bucket',
                'old_pattern': settings.OLD_BUCKET_NAME,
                'new_pattern': settings.NEW_BUCKET_NAME,
                'fields': ['stream_url', 'preview_url', 'poster_url', 'backdrop_url'],
                'transformer': 'bucket_upgrade'
            },
            's3_to_gcs': {
                'description': 'Migrate S3 URLs to GCS',
                'old_pattern': settings.S3_PATTERN,
                'new_pattern': settings.GCS_PATTERN,
                'fields': ['stream_url', 'preview_url', 'poster_url', 'backdrop_url'],
                'transformer': 's3_to_gcs'
            },
            'atlas_url_fix': {
                'description': 'Fix Atlas-specific URL issues',
                'old_pattern': '//',  # Double slashes
                'new_pattern': '/',
                'fields': ['stream_url', 'preview_url', 'poster_url', 'backdrop_url'],
                'transformer': 'atlas_url_fix'
            }
        }

    async def migrate(
        self,
        transformation_key: str,
        dry_run: bool = True,
        collection: str = 'content'
    ) -> Optional[str]:
        """
        Execute URL migration with MongoDB transactions.

        Stores original values for rollback capability.

        Args:
            transformation_key: Type of transformation to perform
            dry_run: If True, abort transaction (don't commit)
            collection: Collection name to migrate

        Returns:
            Migration ID if executed, None if dry run

        Raises:
            ValueError: If transformation already executed or invalid key
        """
        if transformation_key not in self.transformations:
            raise ValueError(
                f"Unknown transformation: {transformation_key}. "
                f"Valid options: {', '.join(self.transformations.keys())}"
            )

        db = await get_database()
        transformation = self.transformations[transformation_key]
        migration_id = f"{transformation_key}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        # Check if already executed
        if await self.registry.is_executed(transformation_key):
            existing = await self.registry.get_migration(transformation_key)
            raise ValueError(
                f"Migration {transformation_key} already executed at {existing.executed_at}. "
                f"Use a different transformation key or rollback the existing migration first."
            )

        # Verify indexes exist
        print("Verifying URL field indexes...")
        index_results = await ContentHelpers.ensure_url_indexes(db)
        print(f"  ✓ Indexes verified: {index_results}")

        # Execute with transaction retry logic
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                original_docs = []

                async with await db.client.start_session() as session:
                    async with session.start_transaction():
                        # Execute transformation
                        updated_count = await self._execute_transformation(
                            db, collection, transformation, session, original_docs
                        )

                        if dry_run:
                            print(f"\n🔍 DRY RUN: Would update {updated_count} documents")
                            print(f"   Transformation: {transformation['description']}")
                            print(f"   Pattern: {transformation['old_pattern']} → {transformation['new_pattern']}")
                            print(f"   Fields: {', '.join(transformation['fields'])}")
                            await session.abort_transaction()
                            return None

                        # Store rollback data
                        rollback_count = await self.rollback_storage.store(
                            migration_id, original_docs, session
                        )
                        print(f"  ✓ Stored {rollback_count} rollback records")

                        # Record in registry
                        await self.registry.record_migration(
                            migration_id=migration_id,
                            description=f"URL transformation: {transformation['description']}",
                            script=f"url_migrator.py:{transformation_key}",
                            affected_documents=updated_count,
                            rollback_available=True,
                            session=session,
                            document_ids=[str(doc['_id']) for doc in original_docs]
                        )

                # Success - break retry loop
                print(f"\n✅ Migration {migration_id} completed: {updated_count} documents updated")
                return migration_id

            except pymongo.errors.OperationFailure as e:
                if e.has_error_label("TransientTransactionError"):
                    retry_count += 1
                    if retry_count < max_retries:
                        wait_time = 0.5 * (2 ** retry_count)  # Exponential backoff
                        print(f"⚠️  Transient error, retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                raise

            except Exception as e:
                print(f"❌ Migration failed: {e}")
                import traceback
                traceback.print_exc()
                raise

        raise RuntimeError(f"Migration failed after {max_retries} retries")

    async def _execute_transformation(
        self,
        db,
        collection_name: str,
        transformation: dict,
        session,
        original_docs: list
    ) -> int:
        """
        Execute bulk update with MongoDB aggregation pipeline.

        Stores original values before transformation for rollback.
        """
        collection = db[collection_name]

        # Extract transformation parameters
        old_pattern = transformation['old_pattern']
        new_pattern = transformation['new_pattern']
        fields = transformation['fields']

        # Build query to find matching documents
        query = {"$or": [
            {field: {"$regex": old_pattern, "$exists": True}}
            for field in fields
        ]}

        # Fetch documents BEFORE transformation (for rollback storage)
        print(f"  Fetching documents matching pattern '{old_pattern}'...")
        cursor = collection.find(query, session=session)
        doc_count = 0

        async for doc in cursor:
            original_docs.append({
                'collection': collection_name,
                '_id': doc['_id'],
                'original_values': {field: doc.get(field) for field in fields}
            })
            doc_count += 1

        print(f"  Found {doc_count} documents to update")

        if doc_count == 0:
            return 0

        # Build aggregation pipeline for bulk update
        # Use $replaceAll for string replacement (MongoDB 4.4+)
        set_operations = {}
        for field in fields:
            set_operations[field] = {
                "$cond": {
                    "if": {
                        "$and": [
                            {"$ne": [f"${field}", None]},
                            {"$regexMatch": {"input": f"${field}", "regex": old_pattern}}
                        ]
                    },
                    "then": {
                        "$replaceAll": {
                            "input": f"${field}",
                            "find": old_pattern,
                            "replacement": new_pattern
                        }
                    },
                    "else": f"${field}"
                }
            }

        pipeline = [{"$set": set_operations}]

        # Execute bulk update with aggregation pipeline
        print(f"  Executing bulk update...")
        result = await collection.update_many(query, pipeline, session=session)

        return result.modified_count

    async def rollback(self, migration_id: str) -> None:
        """
        Rollback migration using stored original values.

        Args:
            migration_id: Migration ID to rollback

        Raises:
            ValueError: If no rollback data found or migration not found
        """
        db = await get_database()

        # Get migration record
        migration = await self.registry.get_migration(migration_id)
        if not migration:
            raise ValueError(f"Migration {migration_id} not found")

        if not migration.rollback_available:
            raise ValueError(
                f"Migration {migration_id} does not have rollback data available"
            )

        # Retrieve rollback data
        print(f"Retrieving rollback data for {migration_id}...")
        rollback_data = await self.rollback_storage.retrieve(migration_id)
        print(f"  Found {len(rollback_data)} documents to restore")

        if not rollback_data:
            raise ValueError(f"No rollback data found for migration {migration_id}")

        # Execute with transaction retry logic
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                async with await db.client.start_session() as session:
                    async with session.start_transaction():
                        # Restore each document
                        restored_count = 0
                        for doc in rollback_data:
                            # Validate ObjectId
                            doc_id = ContentHelpers.validate_object_id(doc['document_id'])

                            await db[doc['collection']].update_one(
                                {'_id': doc_id},
                                {'$set': doc['original_values']},
                                session=session
                            )
                            restored_count += 1

                        # Mark as rolled back in registry
                        await self.registry.mark_rolled_back(migration_id, session)

                print(f"✅ Migration {migration_id} rolled back successfully")
                print(f"   Restored {restored_count} documents to original values")
                return

            except pymongo.errors.OperationFailure as e:
                if e.has_error_label("TransientTransactionError"):
                    retry_count += 1
                    if retry_count < max_retries:
                        await asyncio.sleep(0.5 * (2 ** retry_count))
                        continue
                raise

        raise RuntimeError(f"Rollback failed after {max_retries} retries")

    async def list_migrations(self) -> None:
        """List recent migrations with status."""
        migrations = await self.registry.get_recent_migrations(limit=20)

        if not migrations:
            print("No migrations found")
            return

        print("\nRecent Migrations:")
        print("=" * 80)

        for m in migrations:
            status_icon = {
                'completed': '✅',
                'failed': '❌',
                'rolled_back': '↩️'
            }.get(m.status, '❓')

            rollback = '🔄' if m.rollback_available else '❌'

            print(f"{status_icon} {m.migration_id}")
            print(f"   Description: {m.description}")
            print(f"   Executed: {m.executed_at} by {m.executed_by}")
            print(f"   Documents: {m.affected_documents} | Rollback: {rollback}")
            print()


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Unified URL Migration Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (see what would change)
  python url_migrator.py bucket_upgrade

  # Execute migration
  python url_migrator.py bucket_upgrade --execute

  # Rollback migration
  python url_migrator.py --rollback migration_id_123

  # List recent migrations
  python url_migrator.py --list

Transformation types:
  - bucket_upgrade: Old bucket → New bucket (from settings)
  - s3_to_gcs: S3 URLs → GCS URLs (from settings)
  - atlas_url_fix: Fix Atlas-specific URL issues
        """
    )

    parser.add_argument(
        'transformation',
        nargs='?',
        help='Transformation type to execute'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute migration (default is dry-run)'
    )
    parser.add_argument(
        '--rollback',
        metavar='MIGRATION_ID',
        help='Rollback specified migration'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='List recent migrations'
    )
    parser.add_argument(
        '--collection',
        default='content',
        help='Collection to migrate (default: content)'
    )

    args = parser.parse_args()

    try:
        # Connect to MongoDB
        await connect_to_mongo()

        migrator = URLMigrator()

        if args.list:
            await migrator.list_migrations()

        elif args.rollback:
            print(f"Rolling back migration: {args.rollback}")
            await migrator.rollback(args.rollback)

        elif args.transformation:
            dry_run = not args.execute

            if dry_run:
                print("🔍 DRY RUN MODE (use --execute to apply changes)")
            else:
                print("⚠️  EXECUTING MIGRATION (changes will be applied)")

            print(f"Transformation: {args.transformation}")
            print(f"Collection: {args.collection}")
            print()

            migration_id = await migrator.migrate(
                args.transformation,
                dry_run=dry_run,
                collection=args.collection
            )

            if migration_id:
                print(f"\nMigration ID: {migration_id}")
                print(f"To rollback: python url_migrator.py --rollback {migration_id}")

        else:
            parser.print_help()
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        await close_mongo_connection()


if __name__ == '__main__':
    asyncio.run(main())

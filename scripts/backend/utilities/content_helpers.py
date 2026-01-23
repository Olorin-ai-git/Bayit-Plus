"""
Content model helper utilities for migration scripts.

Provides MongoDB index management and ObjectId validation.
CRITICAL: Run ensure_url_indexes() before any URL migrations.
"""
from typing import Optional

import pymongo
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database


class ContentHelpers:
    """
    Helper utilities for content operations in migration scripts.

    Provides index management, ObjectId validation, and query helpers.
    """

    @staticmethod
    async def ensure_url_indexes(db: Optional[AsyncIOMotorDatabase] = None) -> dict:
        """
        Create indexes for URL fields with background=True.

        CRITICAL: Must be run before URL migration scripts to ensure performance.
        Creates indexes in background to prevent blocking production operations.

        Args:
            db: Database instance (optional, will get from connection if not provided)

        Returns:
            Dictionary with index creation results

        Example:
            await ContentHelpers.ensure_url_indexes()
        """
        if db is None:
            db = await get_database()

        results = {}

        # List of URL fields to index
        url_fields = ["stream_url", "preview_url", "poster_url", "backdrop_url"]

        print("Creating URL field indexes (background mode)...")

        for field in url_fields:
            try:
                # Check if index already exists
                existing_indexes = await db.content.list_indexes().to_list(length=None)
                index_exists = any(
                    field in idx.get("key", {}) for idx in existing_indexes
                )

                if index_exists:
                    results[field] = "exists"
                    print(f"  ✓ Index on '{field}' already exists")
                else:
                    # Create index with background=True (non-blocking)
                    await db.content.create_index(
                        [(field, pymongo.ASCENDING)], background=True
                    )
                    results[field] = "created"
                    print(f"  ✓ Created index on '{field}' (background)")

            except Exception as e:
                results[field] = f"error: {str(e)}"
                print(f"  ⚠️  Failed to create index on '{field}': {e}")

        return results

    @staticmethod
    async def verify_indexes(db: Optional[AsyncIOMotorDatabase] = None) -> dict:
        """
        Verify that required indexes exist.

        Args:
            db: Database instance (optional)

        Returns:
            Dictionary with index verification results
        """
        if db is None:
            db = await get_database()

        existing_indexes = await db.content.list_indexes().to_list(length=None)

        # Required URL field indexes
        required_fields = ["stream_url", "preview_url", "poster_url", "backdrop_url"]

        results = {}
        for field in required_fields:
            exists = any(field in idx.get("key", {}) for idx in existing_indexes)
            results[field] = exists

        return results

    @staticmethod
    def validate_object_id(doc_id: str) -> ObjectId:
        """
        Validate and convert document ID to ObjectId.

        Args:
            doc_id: Document ID as string

        Returns:
            Valid ObjectId

        Raises:
            ValueError: If doc_id is not a valid ObjectId
        """
        try:
            return ObjectId(doc_id)
        except (InvalidId, TypeError) as e:
            raise ValueError(f"Invalid ObjectId: {doc_id}") from e

    @staticmethod
    async def get_document_count(
        db: Optional[AsyncIOMotorDatabase] = None, collection: str = "content"
    ) -> int:
        """
        Get total document count for a collection.

        Args:
            db: Database instance (optional)
            collection: Collection name

        Returns:
            Number of documents
        """
        if db is None:
            db = await get_database()

        return await db[collection].count_documents({})

    @staticmethod
    async def get_documents_with_url_pattern(
        pattern: str,
        field: str = "stream_url",
        db: Optional[AsyncIOMotorDatabase] = None,
        limit: Optional[int] = None,
    ) -> list:
        """
        Find documents matching URL pattern.

        Args:
            pattern: Regex pattern to match
            field: URL field to search
            db: Database instance (optional)
            limit: Maximum number of documents to return

        Returns:
            List of matching documents
        """
        if db is None:
            db = await get_database()

        query = {field: {"$regex": pattern}}

        cursor = db.content.find(query)
        if limit:
            cursor = cursor.limit(limit)

        return await cursor.to_list(length=limit)

    @staticmethod
    async def get_collection_stats(
        db: Optional[AsyncIOMotorDatabase] = None, collection: str = "content"
    ) -> dict:
        """
        Get statistics for a collection.

        Args:
            db: Database instance (optional)
            collection: Collection name

        Returns:
            Dictionary with collection statistics
        """
        if db is None:
            db = await get_database()

        stats = await db.command("collStats", collection)

        return {
            "count": stats.get("count", 0),
            "size": stats.get("size", 0),
            "avg_obj_size": stats.get("avgObjSize", 0),
            "storage_size": stats.get("storageSize", 0),
            "indexes": stats.get("nindexes", 0),
            "index_sizes": stats.get("indexSizes", {}),
        }

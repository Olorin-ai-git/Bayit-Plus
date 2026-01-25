"""
Rollback data storage for migration operations.

Stores original document values before modifications to enable
safe rollback of data migrations.
"""
from typing import List, Dict, Any

from motor.motor_asyncio import AsyncIOMotorClientSession

from app.models.migration import RollbackData


class RollbackStorage:
    """
    Storage and retrieval of rollback data for migrations.

    Stores original document values before modifications,
    enabling safe rollback of data migrations.
    """

    async def store(
        self,
        migration_id: str,
        original_docs: List[Dict[str, Any]],
        session: AsyncIOMotorClientSession,
    ) -> int:
        """
        Store original document values for rollback.

        CRITICAL: This must be called within a MongoDB transaction.

        Args:
            migration_id: Unique identifier for the migration
            original_docs: List of original document data, each containing:
                - collection: Collection name
                - _id: Document ObjectId (as string)
                - original_values: Dict of field names to original values
            session: Active MongoDB transaction session

        Returns:
            Number of rollback records created

        Example:
            original_docs = [
                {
                    'collection': 'content',
                    '_id': '507f1f77bcf86cd799439011',
                    'original_values': {
                        'stream_url': 'gs://old-bucket/movie.mp4',
                        'poster_url': 'gs://old-bucket/poster.jpg'
                    }
                },
                # ... more documents
            ]
        """
        if not original_docs:
            return 0

        # Create RollbackData records
        rollback_records = [
            RollbackData(
                migration_id=migration_id,
                collection_name=doc["collection"],
                document_id=str(doc["_id"]),
                original_values=doc["original_values"],
            )
            for doc in original_docs
        ]

        # Bulk insert within transaction (atomic)
        await RollbackData.insert_many(rollback_records, session=session)

        return len(rollback_records)

    async def retrieve(self, migration_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve rollback data for a migration.

        Args:
            migration_id: Unique identifier for the migration

        Returns:
            List of rollback data dictionaries, each containing:
                - collection: Collection name
                - document_id: Document ObjectId (as string)
                - original_values: Dict of field names to original values

        Raises:
            ValueError: If no rollback data found for migration
        """
        records = await RollbackData.find(
            RollbackData.migration_id == migration_id
        ).to_list()

        if not records:
            raise ValueError(
                f"No rollback data found for migration {migration_id}. "
                "Migration may not have stored rollback data, or it may have expired."
            )

        # Convert to dict format for easy processing
        return [
            {
                "collection": record.collection_name,
                "document_id": record.document_id,
                "original_values": record.original_values,
            }
            for record in records
        ]

    async def count(self, migration_id: str) -> int:
        """
        Count rollback records for a migration.

        Args:
            migration_id: Unique identifier for the migration

        Returns:
            Number of rollback records available
        """
        return await RollbackData.find(
            RollbackData.migration_id == migration_id
        ).count()

    async def exists(self, migration_id: str) -> bool:
        """
        Check if rollback data exists for a migration.

        Args:
            migration_id: Unique identifier for the migration

        Returns:
            True if rollback data exists, False otherwise
        """
        count = await self.count(migration_id)
        return count > 0

    async def delete(
        self, migration_id: str, session: Optional[AsyncIOMotorClientSession] = None
    ) -> int:
        """
        Delete rollback data for a migration.

        Use this to manually clean up rollback data before TTL expiration.
        Useful after successful rollback confirmation.

        Args:
            migration_id: Unique identifier for the migration
            session: Optional MongoDB transaction session

        Returns:
            Number of rollback records deleted
        """
        records = await RollbackData.find(
            RollbackData.migration_id == migration_id, session=session
        ).to_list()

        if not records:
            return 0

        # Delete all records for this migration
        for record in records:
            await record.delete(session=session)

        return len(records)

    async def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics for rollback data.

        Returns:
            Dictionary with statistics:
                - total_migrations: Number of migrations with rollback data
                - total_records: Total number of rollback records
                - oldest_record: Oldest rollback record timestamp
                - newest_record: Newest rollback record timestamp
        """
        # Get all rollback data
        all_records = await RollbackData.find_all().to_list()

        if not all_records:
            return {
                "total_migrations": 0,
                "total_records": 0,
                "oldest_record": None,
                "newest_record": None,
            }

        # Get unique migration IDs
        migration_ids = set(record.migration_id for record in all_records)

        # Get oldest and newest
        sorted_records = sorted(all_records, key=lambda r: r.created_at)

        return {
            "total_migrations": len(migration_ids),
            "total_records": len(all_records),
            "oldest_record": sorted_records[0].created_at,
            "newest_record": sorted_records[-1].created_at,
        }


# Optional import for type hints
try:
    from typing import Optional
except ImportError:
    pass

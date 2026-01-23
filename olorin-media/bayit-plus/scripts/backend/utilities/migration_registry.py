"""
MongoDB-backed migration registry.

Provides ACID-compliant migration tracking with atomic operations.
Prevents duplicate execution and maintains full audit trail.
"""
import hashlib
import os
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorClientSession

from app.core.database import get_database
from scripts.migrations.models import MigrationRecord


class MigrationRegistry:
    """
    MongoDB-backed migration tracking registry.

    Ensures migrations are executed exactly once and provides
    rollback coordination with atomic operations.
    """

    async def is_executed(self, migration_id: str) -> bool:
        """
        Check if migration has already been executed.

        Uses atomic query to prevent race conditions.

        Args:
            migration_id: Unique identifier for the migration

        Returns:
            True if migration was already executed, False otherwise
        """
        existing = await MigrationRecord.find_one(
            MigrationRecord.migration_id == migration_id
        )
        return existing is not None

    async def get_migration(self, migration_id: str) -> Optional[MigrationRecord]:
        """
        Retrieve migration record by ID.

        Args:
            migration_id: Unique identifier for the migration

        Returns:
            MigrationRecord if found, None otherwise
        """
        return await MigrationRecord.find_one(
            MigrationRecord.migration_id == migration_id
        )

    async def record_migration(
        self,
        migration_id: str,
        description: str,
        script: str,
        affected_documents: int,
        rollback_available: bool,
        session: AsyncIOMotorClientSession,
        document_ids: List[str],
        backup_reference: Optional[str] = None,
    ) -> MigrationRecord:
        """
        Record successful migration with atomic insert.

        CRITICAL: This must be called within a MongoDB transaction.

        Args:
            migration_id: Unique identifier for the migration
            description: Human-readable description
            script: Script name that performed the migration
            affected_documents: Number of documents modified
            rollback_available: Whether rollback data was stored
            session: Active MongoDB transaction session
            document_ids: List of affected document ObjectIds (as strings)
            backup_reference: Optional reference to pre-migration backup

        Returns:
            Created MigrationRecord

        Raises:
            ValueError: If migration_id already exists (duplicate execution)
        """
        # Check for duplicate within transaction
        existing = await MigrationRecord.find_one(
            MigrationRecord.migration_id == migration_id, session=session
        )
        if existing:
            raise ValueError(
                f"Migration {migration_id} already executed at {existing.executed_at}"
            )

        # Generate checksum of affected document IDs
        checksum = self._generate_checksum(document_ids)

        # Get MongoDB version
        mongodb_version = await self._get_mongodb_version()

        # Get environment
        environment = os.getenv("APP_ENV", "development")

        # Get executor
        executed_by = os.getenv("USER", "unknown")

        # Create migration record
        record = MigrationRecord(
            migration_id=migration_id,
            description=description,
            script=script,
            executed_by=executed_by,
            affected_documents=affected_documents,
            document_ids=document_ids,
            rollback_available=rollback_available,
            mongodb_version=mongodb_version,
            environment=environment,
            checksum=checksum,
            backup_reference=backup_reference,
        )

        # Insert within transaction (atomic)
        await record.insert(session=session)

        return record

    async def mark_rolled_back(
        self, migration_id: str, session: AsyncIOMotorClientSession
    ) -> None:
        """
        Mark migration as rolled back.

        CRITICAL: This must be called within a MongoDB transaction.

        Args:
            migration_id: Unique identifier for the migration
            session: Active MongoDB transaction session

        Raises:
            ValueError: If migration not found
        """
        migration = await MigrationRecord.find_one(
            MigrationRecord.migration_id == migration_id, session=session
        )

        if not migration:
            raise ValueError(f"Migration {migration_id} not found")

        # Update status atomically within transaction
        migration.status = "rolled_back"
        await migration.save(session=session)

    async def mark_failed(
        self,
        migration_id: str,
        error_message: str,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> None:
        """
        Mark migration as failed with error message.

        Can be called outside transaction for failure logging.

        Args:
            migration_id: Unique identifier for the migration
            error_message: Error message describing the failure
            session: Optional MongoDB transaction session
        """
        migration = await MigrationRecord.find_one(
            MigrationRecord.migration_id == migration_id, session=session
        )

        if migration:
            migration.status = "failed"
            migration.error_message = error_message
            await migration.save(session=session)

    async def get_recent_migrations(self, limit: int = 10) -> List[MigrationRecord]:
        """
        Get most recent migrations.

        Args:
            limit: Maximum number of migrations to return

        Returns:
            List of recent MigrationRecords, sorted by execution time (descending)
        """
        return (
            await MigrationRecord.find_all()
            .sort([("executed_at", -1)])
            .limit(limit)
            .to_list()
        )

    async def get_migrations_by_status(self, status: str) -> List[MigrationRecord]:
        """
        Get migrations by status.

        Args:
            status: Status to filter by (completed, failed, rolled_back)

        Returns:
            List of MigrationRecords matching status
        """
        return await MigrationRecord.find(MigrationRecord.status == status).to_list()

    async def get_rollback_candidates(self) -> List[MigrationRecord]:
        """
        Get migrations that can be rolled back.

        Returns:
            List of MigrationRecords with rollback_available=True and status=completed
        """
        return await MigrationRecord.find(
            MigrationRecord.rollback_available == True,
            MigrationRecord.status == "completed",
        ).to_list()

    def _generate_checksum(self, document_ids: List[str]) -> str:
        """
        Generate SHA256 checksum of document IDs.

        Args:
            document_ids: List of document ObjectIds (as strings)

        Returns:
            SHA256 hex digest
        """
        # Sort for consistent checksum regardless of order
        sorted_ids = sorted(document_ids)
        combined = "".join(sorted_ids)
        return hashlib.sha256(combined.encode()).hexdigest()

    async def _get_mongodb_version(self) -> str:
        """
        Get MongoDB server version.

        Returns:
            MongoDB version string (e.g., "7.0.5")
        """
        try:
            db = await get_database()
            server_info = await db.client.server_info()
            return server_info.get("version", "unknown")
        except Exception:
            return "unknown"

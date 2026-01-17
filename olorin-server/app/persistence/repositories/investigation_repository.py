"""Investigation Repository for MongoDB Atlas.

This repository provides data access methods for investigations using the
repository pattern. It serves as a template for all other MongoDB repositories.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Configuration-driven: Database connection from environment
- No mocks: Real database operations only
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.investigation_mongodb import Investigation, InvestigationStatus
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationRepository:
    """Repository for investigation data access using MongoDB Atlas.

    This class implements the repository pattern for investigations,
    providing CRUD operations and query methods. It uses optimistic
    locking via the version field to prevent concurrent update conflicts.

    Example usage:
        ```python
        repo = InvestigationRepository()
        investigation = Investigation(
            investigation_id="inv-001",
            user_id="user-123",
            tenant_id="tenant-001"
        )
        created = await repo.create(investigation)
        ```
    """

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection.

        Args:
            db: MongoDB database instance (optional, uses global if not provided)
        """
        self.db = db if db is not None else get_mongodb()
        self.collection = self.db.investigations

    async def create(self, investigation: Investigation) -> Investigation:
        """Create new investigation with optimistic locking.

        Args:
            investigation: Investigation to create

        Returns:
            Investigation: Created investigation with MongoDB _id

        Raises:
            ValueError: If investigation_id already exists
            Exception: If database operation fails
        """
        try:
            doc = investigation.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()
            doc["updated_at"] = datetime.utcnow()
            doc["version"] = 1

            result = await self.collection.insert_one(doc)
            investigation.id = result.inserted_id

            logger.info(
                f"Created investigation: {investigation.investigation_id}",
                extra={
                    "investigation_id": investigation.investigation_id,
                    "user_id": investigation.user_id,
                    "tenant_id": investigation.tenant_id,
                },
            )

            return investigation

        except DuplicateKeyError:
            logger.error(
                f"Investigation {investigation.investigation_id} already exists"
            )
            raise ValueError(
                f"Investigation {investigation.investigation_id} already exists"
            )
        except Exception as e:
            logger.error(f"Failed to create investigation: {e}")
            raise

    async def find_by_id(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> Optional[Investigation]:
        """Find investigation by ID with optional tenant filtering.

        Args:
            investigation_id: Investigation identifier
            tenant_id: Optional tenant ID for multi-tenant filtering

        Returns:
            Investigation if found, None otherwise
        """
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)

        if doc:
            return Investigation.from_mongodb_dict(doc)
        return None

    async def find_by_user(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[Investigation]:
        """Find investigations by user with pagination.

        Args:
            user_id: User identifier
            tenant_id: Optional tenant ID for filtering
            limit: Maximum number of results (default: 100)
            skip: Number of results to skip (default: 0)

        Returns:
            List of investigations sorted by created_at descending
        """
        query = {"user_id": user_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [Investigation.from_mongodb_dict(doc) for doc in docs]

    async def find_by_status(
        self,
        status: InvestigationStatus,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[Investigation]:
        """Find investigations by status.

        Args:
            status: Investigation status to filter by
            tenant_id: Optional tenant ID for filtering
            limit: Maximum number of results (default: 1000)

        Returns:
            List of investigations with matching status
        """
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("updated_at", -1).limit(limit)

        docs = await cursor.to_list(length=limit)
        return [Investigation.from_mongodb_dict(doc) for doc in docs]

    async def update_with_version(
        self,
        investigation_id: str,
        current_version: int,
        updates: dict,
        tenant_id: Optional[str] = None,
    ) -> Optional[Investigation]:
        """Update investigation with optimistic locking.

        This method implements optimistic locking by requiring the current
        version number. The update will only succeed if the version matches,
        preventing concurrent modification conflicts.

        Args:
            investigation_id: Investigation identifier
            current_version: Expected current version
            updates: Dictionary of fields to update
            tenant_id: Optional tenant ID for multi-tenant filtering

        Returns:
            Updated investigation if successful, None if version conflict

        Raises:
            ValueError: If version conflict occurs
        """
        query = {
            "investigation_id": investigation_id,
            "version": current_version,
        }
        if tenant_id:
            query["tenant_id"] = tenant_id

        updates["updated_at"] = datetime.utcnow()
        updates["version"] = current_version + 1

        doc = await self.collection.find_one_and_update(
            query,
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )

        if doc is None:
            logger.warning(
                f"Version conflict for investigation {investigation_id} "
                f"(expected version: {current_version})"
            )
            raise ValueError(
                f"Version conflict for investigation {investigation_id}. "
                "The investigation may have been modified by another process."
            )

        logger.info(
            f"Updated investigation: {investigation_id}",
            extra={
                "investigation_id": investigation_id,
                "from_version": current_version,
                "to_version": current_version + 1,
            },
        )

        return Investigation.from_mongodb_dict(doc)

    async def update_progress(
        self,
        investigation_id: str,
        current_phase: str,
        progress_percentage: float,
        tenant_id: Optional[str] = None,
    ) -> Optional[Investigation]:
        """Update investigation progress without version check.

        This is a convenience method for updating progress that doesn't
        require optimistic locking since progress updates are typically
        additive and non-conflicting.

        Args:
            investigation_id: Investigation identifier
            current_phase: New execution phase
            progress_percentage: New progress percentage (0-100)
            tenant_id: Optional tenant ID for filtering

        Returns:
            Updated investigation
        """
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$set": {
                    "progress.current_phase": current_phase,
                    "progress.progress_percentage": max(0.0, min(100.0, progress_percentage)),
                    "updated_at": datetime.utcnow(),
                },
                "$inc": {"version": 1},
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            return Investigation.from_mongodb_dict(doc)
        return None

    async def delete(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> bool:
        """Delete investigation by ID.

        Args:
            investigation_id: Investigation identifier
            tenant_id: Optional tenant ID for filtering

        Returns:
            True if deleted, False if not found
        """
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        result = await self.collection.delete_one(query)

        if result.deleted_count > 0:
            logger.info(
                f"Deleted investigation: {investigation_id}",
                extra={"investigation_id": investigation_id},
            )
            return True

        logger.warning(f"Investigation not found for deletion: {investigation_id}")
        return False

    async def count_by_user(
        self, user_id: str, tenant_id: Optional[str] = None
    ) -> int:
        """Count investigations for a user.

        Args:
            user_id: User identifier
            tenant_id: Optional tenant ID for filtering

        Returns:
            Number of investigations
        """
        query = {"user_id": user_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        return await self.collection.count_documents(query)

    async def count_by_status(
        self, status: InvestigationStatus, tenant_id: Optional[str] = None
    ) -> int:
        """Count investigations by status.

        Args:
            status: Investigation status
            tenant_id: Optional tenant ID for filtering

        Returns:
            Number of investigations with matching status
        """
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        return await self.collection.count_documents(query)

    async def update_last_accessed(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> None:
        """Update last accessed timestamp.

        Args:
            investigation_id: Investigation identifier
            tenant_id: Optional tenant ID for filtering
        """
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        await self.collection.update_one(
            query,
            {
                "$set": {"last_accessed": datetime.utcnow()},
                "$inc": {"version": 1},
            },
        )

    async def list_all(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[Investigation]:
        """List all investigations with pagination.

        Args:
            tenant_id: Optional tenant ID for filtering
            limit: Maximum number of results
            skip: Number of results to skip

        Returns:
            List of investigations sorted by updated_at descending
        """
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("updated_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [Investigation.from_mongodb_dict(doc) for doc in docs]

"""ComposioActionAudit Repository for MongoDB Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Audit trail: Complete action execution history
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.composio_action_audit_mongodb import ActionStatus, ComposioActionAudit
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ComposioActionAuditRepository:
    """Repository for Composio action audit data access using MongoDB Atlas."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.composio_action_audits

    async def create(self, audit: ComposioActionAudit) -> ComposioActionAudit:
        """Create new action audit entry."""
        try:
            doc = audit.to_mongodb_dict()

            result = await self.collection.insert_one(doc)
            audit.id = result.inserted_id

            logger.info(
                f"Created action audit: {audit.audit_id}",
                extra={
                    "audit_id": audit.audit_id,
                    "action_name": audit.action_name,
                    "status": audit.status.value,
                },
            )
            return audit

        except DuplicateKeyError:
            logger.error(f"Action audit {audit.audit_id} already exists")
            raise ValueError(f"Action audit {audit.audit_id} already exists")

    async def find_by_id(
        self, audit_id: str, tenant_id: Optional[str] = None
    ) -> Optional[ComposioActionAudit]:
        """Find action audit by ID with optional tenant filtering."""
        query = {"audit_id": audit_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return ComposioActionAudit.from_mongodb_dict(doc) if doc else None

    async def find_by_action(
        self,
        action_id: str,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[ComposioActionAudit]:
        """Find audit entries by action ID."""
        query = {"action_id": action_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def find_by_execution(
        self, execution_id: str, limit: int = 1000
    ) -> List[ComposioActionAudit]:
        """Find audit entries by SOAR execution ID."""
        cursor = (
            self.collection.find({"execution_id": execution_id})
            .sort("executed_at", 1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def find_by_toolkit(
        self,
        toolkit_name: str,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[ComposioActionAudit]:
        """Find audit entries by toolkit."""
        query = {"toolkit_name": toolkit_name}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def find_by_connection(
        self,
        connection_id: str,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[ComposioActionAudit]:
        """Find audit entries by connection ID."""
        query = {"connection_id": connection_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def find_by_status(
        self,
        status: ActionStatus,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[ComposioActionAudit]:
        """Find audit entries by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def find_failed_actions(
        self,
        tenant_id: Optional[str] = None,
        min_retry_count: int = 0,
        limit: int = 100,
    ) -> List[ComposioActionAudit]:
        """Find failed actions with optional retry count filter."""
        query = {"status": ActionStatus.FAILED.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if min_retry_count > 0:
            query["retry_count"] = {"$gte": min_retry_count}

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def find_in_time_range(
        self,
        start_time: datetime,
        end_time: datetime,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[ComposioActionAudit]:
        """Find audit entries within time range."""
        query = {"executed_at": {"$gte": start_time, "$lt": end_time}}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

    async def increment_retry(
        self, audit_id: str, tenant_id: Optional[str] = None
    ) -> Optional[ComposioActionAudit]:
        """Increment retry count and mark as retrying."""
        query = {"audit_id": audit_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$inc": {"retry_count": 1},
                "$set": {"status": ActionStatus.RETRYING.value},
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.info(f"Incremented retry count for audit: {audit_id}")
            return ComposioActionAudit.from_mongodb_dict(doc)
        return None

    async def update_status(
        self,
        audit_id: str,
        status: ActionStatus,
        error_message: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> Optional[ComposioActionAudit]:
        """Update action status and error message."""
        query = {"audit_id": audit_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        updates = {"status": status.value}
        if error_message is not None:
            updates["error_message"] = error_message

        doc = await self.collection.find_one_and_update(
            query, {"$set": updates}, return_document=ReturnDocument.AFTER
        )

        if doc:
            logger.info(f"Updated audit status: {audit_id} -> {status.value}")
            return ComposioActionAudit.from_mongodb_dict(doc)
        return None

    async def count_by_status(
        self, status: ActionStatus, tenant_id: Optional[str] = None
    ) -> int:
        """Count audit entries by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def count_by_action_name(
        self, action_name: str, tenant_id: Optional[str] = None
    ) -> int:
        """Count audit entries by action name."""
        query = {"action_name": action_name}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def get_statistics(
        self, tenant_id: Optional[str] = None
    ) -> dict:
        """Get action execution statistics."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "action_name": "$action_name",
                        "status": "$status",
                    },
                    "count": {"$sum": 1},
                    "avg_retry_count": {"$avg": "$retry_count"},
                }
            },
            {"$sort": {"count": -1}},
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return {
            "by_action_and_status": results,
            "total_executions": sum(r["count"] for r in results),
        }

    async def list_all(
        self, tenant_id: Optional[str] = None, limit: int = 100, skip: int = 0
    ) -> List[ComposioActionAudit]:
        """List all audit entries with pagination."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("executed_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioActionAudit.from_mongodb_dict(doc) for doc in docs]

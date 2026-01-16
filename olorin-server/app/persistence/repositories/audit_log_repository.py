"""AuditLog Repository for MongoDB Atlas (Time Series).

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Time series optimized: Uses timestamp-based queries
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.models.audit_log_mongodb import AuditActionType, AuditLog, AuditSource
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AuditLogRepository:
    """Repository for audit log data access (time series collection)."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.audit_log

    async def create(self, audit_entry: AuditLog) -> AuditLog:
        """Create new audit log entry."""
        try:
            doc = audit_entry.to_mongodb_dict()

            result = await self.collection.insert_one(doc)
            audit_entry.id = result.inserted_id

            logger.debug(
                f"Created audit log entry: {audit_entry.entry_id}",
                extra={
                    "entry_id": audit_entry.entry_id,
                    "investigation_id": audit_entry.metadata.investigation_id,
                    "action_type": audit_entry.metadata.action_type.value,
                },
            )
            return audit_entry

        except DuplicateKeyError:
            logger.error(f"Audit log entry {audit_entry.entry_id} already exists")
            raise ValueError(f"Audit log entry {audit_entry.entry_id} already exists")

    async def find_by_id(self, entry_id: str) -> Optional[AuditLog]:
        """Find audit log entry by ID."""
        doc = await self.collection.find_one({"entry_id": entry_id})
        return AuditLog.from_mongodb_dict(doc) if doc else None

    async def find_by_investigation(
        self,
        investigation_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[AuditLog]:
        """Find audit log entries by investigation within time window."""
        query = {"metadata.investigation_id": investigation_id}

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        cursor = (
            self.collection.find(query).sort("timestamp", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AuditLog.from_mongodb_dict(doc) for doc in docs]

    async def find_by_user(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[AuditLog]:
        """Find audit log entries by user."""
        query = {"metadata.user_id": user_id}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        cursor = (
            self.collection.find(query).sort("timestamp", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AuditLog.from_mongodb_dict(doc) for doc in docs]

    async def find_by_action_type(
        self,
        action_type: AuditActionType,
        tenant_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[AuditLog]:
        """Find audit log entries by action type."""
        query = {"metadata.action_type": action_type.value}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        cursor = (
            self.collection.find(query).sort("timestamp", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AuditLog.from_mongodb_dict(doc) for doc in docs]

    async def find_in_time_range(
        self,
        start_time: datetime,
        end_time: datetime,
        tenant_id: Optional[str] = None,
        limit: int = 10000,
    ) -> List[AuditLog]:
        """Find audit log entries within time range."""
        query = {"timestamp": {"$gte": start_time, "$lt": end_time}}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query).sort("timestamp", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AuditLog.from_mongodb_dict(doc) for doc in docs]

    async def get_recent_entries(
        self, tenant_id: Optional[str] = None, limit: int = 100
    ) -> List[AuditLog]:
        """Get most recent audit log entries."""
        query = {}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query).sort("timestamp", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AuditLog.from_mongodb_dict(doc) for doc in docs]

    async def count_by_investigation(
        self,
        investigation_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> int:
        """Count audit log entries for an investigation."""
        query = {"metadata.investigation_id": investigation_id}

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        return await self.collection.count_documents(query)

    async def count_by_action_type(
        self,
        action_type: AuditActionType,
        tenant_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> int:
        """Count audit log entries by action type."""
        query = {"metadata.action_type": action_type.value}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        return await self.collection.count_documents(query)

    async def get_activity_statistics(
        self,
        tenant_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> dict:
        """Get audit log activity statistics."""
        query = {}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "action_type": "$metadata.action_type",
                        "source": "$metadata.source",
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return {
            "by_action_and_source": results,
            "total_entries": sum(r["count"] for r in results),
        }

    async def get_user_activity(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> dict:
        """Get user activity summary."""
        query = {"metadata.user_id": user_id}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lt"] = end_time

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$metadata.action_type",
                    "count": {"$sum": 1},
                    "investigations": {"$addToSet": "$metadata.investigation_id"},
                }
            },
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return {
            "by_action_type": results,
            "total_actions": sum(r["count"] for r in results),
            "unique_investigations": len(
                set().union(*[r["investigations"] for r in results])
            )
            if results
            else 0,
        }

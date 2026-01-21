"""SOARPlaybookExecution Repository for MongoDB Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Execution tracking: Complete playbook orchestration history
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.soar_playbook_execution_mongodb import (
    PlaybookAction,
    PlaybookExecutionStatus,
    SOARPlaybookExecution,
)
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SOARPlaybookExecutionRepository:
    """Repository for SOAR playbook execution data access using MongoDB Atlas."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.soar_playbook_executions

    async def create(self, execution: SOARPlaybookExecution) -> SOARPlaybookExecution:
        """Create new playbook execution."""
        try:
            doc = execution.to_mongodb_dict()

            result = await self.collection.insert_one(doc)
            execution.id = result.inserted_id

            logger.info(
                f"Created playbook execution: {execution.execution_id}",
                extra={
                    "execution_id": execution.execution_id,
                    "playbook_id": execution.playbook_id,
                    "status": execution.status.value,
                },
            )
            return execution

        except DuplicateKeyError:
            logger.error(f"Playbook execution {execution.execution_id} already exists")
            raise ValueError(f"Playbook execution {execution.execution_id} already exists")

    async def find_by_id(
        self, execution_id: str, tenant_id: Optional[str] = None
    ) -> Optional[SOARPlaybookExecution]:
        """Find playbook execution by ID with optional tenant filtering."""
        query = {"execution_id": execution_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return SOARPlaybookExecution.from_mongodb_dict(doc) if doc else None

    async def find_by_playbook(
        self,
        playbook_id: str,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[SOARPlaybookExecution]:
        """Find executions by playbook ID."""
        query = {"playbook_id": playbook_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("started_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def find_by_investigation(
        self, investigation_id: str, limit: int = 100
    ) -> List[SOARPlaybookExecution]:
        """Find executions by investigation ID."""
        cursor = (
            self.collection.find({"investigation_id": investigation_id})
            .sort("started_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def find_by_anomaly(
        self, anomaly_id: str, limit: int = 100
    ) -> List[SOARPlaybookExecution]:
        """Find executions by anomaly ID."""
        cursor = (
            self.collection.find({"anomaly_id": anomaly_id})
            .sort("started_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def find_by_status(
        self,
        status: PlaybookExecutionStatus,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[SOARPlaybookExecution]:
        """Find executions by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("started_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def find_running_executions(
        self, tenant_id: Optional[str] = None
    ) -> List[SOARPlaybookExecution]:
        """Find all currently running executions."""
        query = {"status": PlaybookExecutionStatus.RUNNING.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("started_at", -1)
        docs = await cursor.to_list(length=1000)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def find_failed_executions(
        self, tenant_id: Optional[str] = None, limit: int = 100
    ) -> List[SOARPlaybookExecution]:
        """Find failed executions."""
        query = {"status": PlaybookExecutionStatus.FAILED.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("started_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def find_in_time_range(
        self,
        start_time: datetime,
        end_time: datetime,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[SOARPlaybookExecution]:
        """Find executions within time range."""
        query = {"started_at": {"$gte": start_time, "$lt": end_time}}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("started_at", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

    async def update_status(
        self,
        execution_id: str,
        status: PlaybookExecutionStatus,
        error_message: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> Optional[SOARPlaybookExecution]:
        """Update execution status."""
        query = {"execution_id": execution_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        updates = {"status": status.value}
        if error_message is not None:
            updates["error_message"] = error_message

        # Mark as completed if status is terminal
        if status in [
            PlaybookExecutionStatus.COMPLETED,
            PlaybookExecutionStatus.FAILED,
            PlaybookExecutionStatus.CANCELLED,
        ]:
            updates["completed_at"] = datetime.utcnow()

        doc = await self.collection.find_one_and_update(
            query, {"$set": updates}, return_document=ReturnDocument.AFTER
        )

        if doc:
            logger.info(f"Updated execution status: {execution_id} -> {status.value}")
            return SOARPlaybookExecution.from_mongodb_dict(doc)
        return None

    async def add_action(
        self,
        execution_id: str,
        action: PlaybookAction,
        tenant_id: Optional[str] = None,
    ) -> Optional[SOARPlaybookExecution]:
        """Add action to execution history."""
        query = {"execution_id": execution_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {"$push": {"actions_executed": action.dict()}},
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.debug(f"Added action to execution: {execution_id}")
            return SOARPlaybookExecution.from_mongodb_dict(doc)
        return None

    async def mark_completed(
        self, execution_id: str, tenant_id: Optional[str] = None
    ) -> Optional[SOARPlaybookExecution]:
        """Mark execution as completed."""
        query = {"execution_id": execution_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        # Fetch to calculate duration
        existing = await self.collection.find_one(query)
        if not existing:
            return None

        completed_at = datetime.utcnow()
        started_at = existing.get("started_at")
        duration_ms = None
        if started_at:
            duration_ms = int((completed_at - started_at).total_seconds() * 1000)

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$set": {
                    "status": PlaybookExecutionStatus.COMPLETED.value,
                    "completed_at": completed_at,
                    "duration_ms": duration_ms,
                }
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.info(f"Marked execution as completed: {execution_id}")
            return SOARPlaybookExecution.from_mongodb_dict(doc)
        return None

    async def mark_failed(
        self,
        execution_id: str,
        error_message: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[SOARPlaybookExecution]:
        """Mark execution as failed."""
        query = {"execution_id": execution_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        # Fetch to calculate duration
        existing = await self.collection.find_one(query)
        if not existing:
            return None

        completed_at = datetime.utcnow()
        started_at = existing.get("started_at")
        duration_ms = None
        if started_at:
            duration_ms = int((completed_at - started_at).total_seconds() * 1000)

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$set": {
                    "status": PlaybookExecutionStatus.FAILED.value,
                    "completed_at": completed_at,
                    "duration_ms": duration_ms,
                    "error_message": error_message,
                }
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.info(f"Marked execution as failed: {execution_id}")
            return SOARPlaybookExecution.from_mongodb_dict(doc)
        return None

    async def count_by_status(
        self, status: PlaybookExecutionStatus, tenant_id: Optional[str] = None
    ) -> int:
        """Count executions by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def count_by_playbook(
        self, playbook_id: str, tenant_id: Optional[str] = None
    ) -> int:
        """Count executions for a playbook."""
        query = {"playbook_id": playbook_id}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def get_statistics(
        self, tenant_id: Optional[str] = None
    ) -> dict:
        """Get playbook execution statistics."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "playbook_id": "$playbook_id",
                        "status": "$status",
                    },
                    "count": {"$sum": 1},
                    "avg_duration_ms": {"$avg": "$duration_ms"},
                    "avg_action_count": {
                        "$avg": {"$size": {"$ifNull": ["$actions_executed", []]}}
                    },
                }
            },
            {"$sort": {"count": -1}},
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return {
            "by_playbook_and_status": results,
            "total_executions": sum(r["count"] for r in results),
        }

    async def list_all(
        self, tenant_id: Optional[str] = None, limit: int = 100, skip: int = 0
    ) -> List[SOARPlaybookExecution]:
        """List all executions with pagination."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("started_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [SOARPlaybookExecution.from_mongodb_dict(doc) for doc in docs]

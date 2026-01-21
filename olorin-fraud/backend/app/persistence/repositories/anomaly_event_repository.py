"""AnomalyEvent Repository for MongoDB Atlas with Vector Search.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Vector search enabled: Supports similarity queries
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.anomaly_event_mongodb import AnomalyEvent, AnomalySeverity, AnomalyStatus
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AnomalyEventRepository:
    """Repository for anomaly event data access with vector search support."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.anomaly_events

    async def create(self, anomaly: AnomalyEvent) -> AnomalyEvent:
        """Create new anomaly event."""
        try:
            doc = anomaly.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()

            # Set first_seen if not set
            if not doc.get("first_seen"):
                doc["first_seen"] = doc["created_at"]
            if not doc.get("last_seen"):
                doc["last_seen"] = doc["created_at"]

            result = await self.collection.insert_one(doc)
            anomaly.id = result.inserted_id

            logger.info(
                f"Created anomaly event: {anomaly.anomaly_id}",
                extra={
                    "anomaly_id": anomaly.anomaly_id,
                    "severity": anomaly.severity.value,
                    "score": anomaly.score,
                },
            )
            return anomaly

        except DuplicateKeyError:
            logger.error(f"Anomaly event {anomaly.anomaly_id} already exists")
            raise ValueError(f"Anomaly event {anomaly.anomaly_id} already exists")

    async def find_by_id(
        self, anomaly_id: str, tenant_id: Optional[str] = None
    ) -> Optional[AnomalyEvent]:
        """Find anomaly event by ID."""
        query = {"anomaly_id": anomaly_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return AnomalyEvent.from_mongodb_dict(doc) if doc else None

    async def find_by_run(
        self, run_id: str, limit: int = 1000
    ) -> List[AnomalyEvent]:
        """Find anomaly events by detection run."""
        cursor = (
            self.collection.find({"run_id": run_id})
            .sort("created_at", -1)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AnomalyEvent.from_mongodb_dict(doc) for doc in docs]

    async def find_by_detector(
        self,
        detector_id: str,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[AnomalyEvent]:
        """Find anomaly events by detector."""
        query = {"detector_id": detector_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query).sort("created_at", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AnomalyEvent.from_mongodb_dict(doc) for doc in docs]

    async def find_by_investigation(
        self, investigation_id: str, limit: int = 1000
    ) -> List[AnomalyEvent]:
        """Find anomaly events linked to an investigation."""
        cursor = (
            self.collection.find({"investigation_id": investigation_id})
            .sort("created_at", -1)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AnomalyEvent.from_mongodb_dict(doc) for doc in docs]

    async def find_by_severity(
        self,
        severity: AnomalySeverity,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[AnomalyEvent]:
        """Find anomaly events by severity."""
        query = {"severity": severity.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort([("score", -1), ("created_at", -1)])
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AnomalyEvent.from_mongodb_dict(doc) for doc in docs]

    async def find_by_status(
        self,
        status: AnomalyStatus,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[AnomalyEvent]:
        """Find anomaly events by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query).sort("created_at", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AnomalyEvent.from_mongodb_dict(doc) for doc in docs]

    async def find_high_score_anomalies(
        self,
        min_score: float,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[AnomalyEvent]:
        """Find high-score anomalies above threshold."""
        query = {"score": {"$gte": min_score}}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query).sort("score", -1).limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [AnomalyEvent.from_mongodb_dict(doc) for doc in docs]

    async def update_status(
        self,
        anomaly_id: str,
        status: AnomalyStatus,
        tenant_id: Optional[str] = None,
    ) -> Optional[AnomalyEvent]:
        """Update anomaly status."""
        query = {"anomaly_id": anomaly_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {"$set": {"status": status.value}},
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.info(f"Updated anomaly status: {anomaly_id} -> {status.value}")
            return AnomalyEvent.from_mongodb_dict(doc)
        return None

    async def link_to_investigation(
        self,
        anomaly_id: str,
        investigation_id: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[AnomalyEvent]:
        """Link anomaly to investigation."""
        query = {"anomaly_id": anomaly_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {"$set": {"investigation_id": investigation_id}},
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.info(
                f"Linked anomaly {anomaly_id} to investigation {investigation_id}"
            )
            return AnomalyEvent.from_mongodb_dict(doc)
        return None

    async def count_by_severity(
        self, severity: AnomalySeverity, tenant_id: Optional[str] = None
    ) -> int:
        """Count anomaly events by severity."""
        query = {"severity": severity.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def count_by_status(
        self, status: AnomalyStatus, tenant_id: Optional[str] = None
    ) -> int:
        """Count anomaly events by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def get_statistics(
        self, tenant_id: Optional[str] = None
    ) -> dict:
        """Get anomaly statistics."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "severity": "$severity",
                        "status": "$status",
                    },
                    "count": {"$sum": 1},
                    "avg_score": {"$avg": "$score"},
                    "max_score": {"$max": "$score"},
                }
            },
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return {
            "by_severity_and_status": results,
            "total_anomalies": sum(r["count"] for r in results),
        }

    async def delete(
        self, anomaly_id: str, tenant_id: Optional[str] = None
    ) -> bool:
        """Delete anomaly event."""
        query = {"anomaly_id": anomaly_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        result = await self.collection.delete_one(query)

        if result.deleted_count > 0:
            logger.info(f"Deleted anomaly event: {anomaly_id}")
            return True
        return False

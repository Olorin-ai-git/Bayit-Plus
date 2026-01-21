"""DetectionRun Repository for MongoDB Atlas (Time Series).

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Time series optimized: Uses time-based queries
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.models.detection_run_mongodb import DetectionRun, DetectionRunStatus
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DetectionRunRepository:
    """Repository for detection run data access (time series collection)."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.detection_runs

    async def create(self, detection_run: DetectionRun) -> DetectionRun:
        """Create new detection run in time series collection."""
        try:
            doc = detection_run.to_mongodb_dict()

            result = await self.collection.insert_one(doc)
            detection_run.id = result.inserted_id

            logger.info(
                f"Created detection run: {detection_run.run_id}",
                extra={
                    "run_id": detection_run.run_id,
                    "detector_id": detection_run.metadata.detector_id,
                    "status": detection_run.metadata.status.value,
                },
            )
            return detection_run

        except DuplicateKeyError:
            logger.error(f"Detection run {detection_run.run_id} already exists")
            raise ValueError(f"Detection run {detection_run.run_id} already exists")

    async def find_by_id(self, run_id: str) -> Optional[DetectionRun]:
        """Find detection run by ID."""
        doc = await self.collection.find_one({"run_id": run_id})
        return DetectionRun.from_mongodb_dict(doc) if doc else None

    async def find_by_detector(
        self,
        detector_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[DetectionRun]:
        """Find detection runs by detector within time window."""
        query = {"metadata.detector_id": detector_id}

        if start_time or end_time:
            query["started_at"] = {}
            if start_time:
                query["started_at"]["$gte"] = start_time
            if end_time:
                query["started_at"]["$lt"] = end_time

        cursor = self.collection.find(query).sort("started_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [DetectionRun.from_mongodb_dict(doc) for doc in docs]

    async def find_by_status(
        self,
        status: DetectionRunStatus,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[DetectionRun]:
        """Find detection runs by status."""
        query = {"metadata.status": status.value}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("started_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [DetectionRun.from_mongodb_dict(doc) for doc in docs]

    async def find_in_time_range(
        self,
        start_time: datetime,
        end_time: datetime,
        detector_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[DetectionRun]:
        """Find detection runs within time range."""
        query = {"started_at": {"$gte": start_time, "$lt": end_time}}

        if detector_id:
            query["metadata.detector_id"] = detector_id
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("started_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [DetectionRun.from_mongodb_dict(doc) for doc in docs]

    async def count_by_status(
        self, status: DetectionRunStatus, tenant_id: Optional[str] = None
    ) -> int:
        """Count detection runs by status."""
        query = {"metadata.status": status.value}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def count_by_detector(
        self,
        detector_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> int:
        """Count detection runs for a detector."""
        query = {"metadata.detector_id": detector_id}

        if start_time or end_time:
            query["started_at"] = {}
            if start_time:
                query["started_at"]["$gte"] = start_time
            if end_time:
                query["started_at"]["$lt"] = end_time

        return await self.collection.count_documents(query)

    async def get_recent_runs(
        self, tenant_id: Optional[str] = None, limit: int = 50
    ) -> List[DetectionRun]:
        """Get most recent detection runs."""
        query = {}
        if tenant_id:
            query["metadata.tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("started_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [DetectionRun.from_mongodb_dict(doc) for doc in docs]

    async def get_statistics(
        self,
        detector_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> dict:
        """Get detection run statistics for a detector."""
        pipeline = [
            {
                "$match": {
                    "metadata.detector_id": detector_id,
                    "started_at": {"$gte": start_time, "$lt": end_time},
                }
            },
            {
                "$group": {
                    "_id": "$metadata.status",
                    "count": {"$sum": 1},
                    "avg_duration_ms": {"$avg": "$duration_ms"},
                    "total_anomalies": {"$sum": "$info.anomalies_detected"},
                }
            },
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=10)

        return {
            "by_status": {r["_id"]: r for r in results},
            "total_runs": sum(r["count"] for r in results),
        }

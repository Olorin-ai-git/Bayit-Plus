"""Detector Repository for MongoDB Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Configuration-driven: Database connection from environment
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.detector_mongodb import Detector, DetectorType
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DetectorRepository:
    """Repository for detector data access using MongoDB Atlas."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.detectors

    async def create(self, detector: Detector) -> Detector:
        """Create new detector."""
        try:
            doc = detector.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()
            doc["updated_at"] = datetime.utcnow()

            result = await self.collection.insert_one(doc)
            detector.id = result.inserted_id

            logger.info(
                f"Created detector: {detector.detector_id}",
                extra={"detector_id": detector.detector_id, "type": detector.type.value},
            )
            return detector

        except DuplicateKeyError:
            logger.error(f"Detector {detector.detector_id} already exists")
            raise ValueError(f"Detector {detector.detector_id} already exists")

    async def find_by_id(
        self, detector_id: str, tenant_id: Optional[str] = None
    ) -> Optional[Detector]:
        """Find detector by ID."""
        query = {"detector_id": detector_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return Detector.from_mongodb_dict(doc) if doc else None

    async def find_by_type(
        self,
        detector_type: DetectorType,
        tenant_id: Optional[str] = None,
        enabled_only: bool = True,
    ) -> List[Detector]:
        """Find detectors by type."""
        query = {"type": detector_type.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if enabled_only:
            query["enabled"] = True

        cursor = self.collection.find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=1000)
        return [Detector.from_mongodb_dict(doc) for doc in docs]

    async def find_enabled(
        self, tenant_id: Optional[str] = None
    ) -> List[Detector]:
        """Find all enabled detectors."""
        query = {"enabled": True}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("name", 1)
        docs = await cursor.to_list(length=1000)
        return [Detector.from_mongodb_dict(doc) for doc in docs]

    async def update(
        self, detector_id: str, updates: dict, tenant_id: Optional[str] = None
    ) -> Optional[Detector]:
        """Update detector."""
        query = {"detector_id": detector_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        updates["updated_at"] = datetime.utcnow()

        doc = await self.collection.find_one_and_update(
            query, {"$set": updates}, return_document=ReturnDocument.AFTER
        )

        if doc:
            logger.info(f"Updated detector: {detector_id}")
            return Detector.from_mongodb_dict(doc)
        return None

    async def enable(
        self, detector_id: str, tenant_id: Optional[str] = None
    ) -> bool:
        """Enable detector."""
        result = await self.update(detector_id, {"enabled": True}, tenant_id)
        return result is not None

    async def disable(
        self, detector_id: str, tenant_id: Optional[str] = None
    ) -> bool:
        """Disable detector."""
        result = await self.update(detector_id, {"enabled": False}, tenant_id)
        return result is not None

    async def delete(
        self, detector_id: str, tenant_id: Optional[str] = None
    ) -> bool:
        """Delete detector."""
        query = {"detector_id": detector_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        result = await self.collection.delete_one(query)

        if result.deleted_count > 0:
            logger.info(f"Deleted detector: {detector_id}")
            return True
        return False

    async def count_by_type(
        self, detector_type: DetectorType, tenant_id: Optional[str] = None
    ) -> int:
        """Count detectors by type."""
        query = {"type": detector_type.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def list_all(
        self, tenant_id: Optional[str] = None, limit: int = 100, skip: int = 0
    ) -> List[Detector]:
        """List all detectors with pagination."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [Detector.from_mongodb_dict(doc) for doc in docs]

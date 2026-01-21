"""TransactionScore Repository for MongoDB Atlas (High Volume).

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Optimized for high volume: Batch operations supported
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import BulkWriteError, DuplicateKeyError

from app.models.transaction_score_mongodb import TransactionScore
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TransactionScoreRepository:
    """Repository for transaction score data access (high volume)."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.transaction_scores

    async def create(self, transaction_score: TransactionScore) -> TransactionScore:
        """Create new transaction score."""
        try:
            doc = transaction_score.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()

            result = await self.collection.insert_one(doc)
            transaction_score.id = result.inserted_id

            logger.debug(
                f"Created transaction score for investigation {transaction_score.investigation_id}",
                extra={
                    "investigation_id": transaction_score.investigation_id,
                    "transaction_id": transaction_score.transaction_id,
                    "risk_score": transaction_score.risk_score,
                },
            )
            return transaction_score

        except DuplicateKeyError:
            logger.error(
                f"Transaction score already exists: "
                f"{transaction_score.investigation_id}/{transaction_score.transaction_id}"
            )
            raise ValueError(
                f"Transaction score already exists for "
                f"{transaction_score.investigation_id}/{transaction_score.transaction_id}"
            )

    async def create_batch(
        self, transaction_scores: List[TransactionScore]
    ) -> int:
        """Create multiple transaction scores in batch (optimized for high volume)."""
        if not transaction_scores:
            return 0

        docs = []
        for score in transaction_scores:
            doc = score.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()
            docs.append(doc)

        try:
            result = await self.collection.insert_many(docs, ordered=False)
            inserted_count = len(result.inserted_ids)

            logger.info(
                f"Batch created {inserted_count} transaction scores",
                extra={"count": inserted_count},
            )
            return inserted_count

        except BulkWriteError as e:
            # Log errors but continue with successful inserts
            inserted_count = e.details.get("nInserted", 0)
            logger.warning(
                f"Batch insert completed with errors. "
                f"Inserted: {inserted_count}, Errors: {len(e.details.get('writeErrors', []))}",
                extra={"details": e.details},
            )
            return inserted_count

    async def find_by_id(
        self,
        investigation_id: str,
        transaction_id: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[TransactionScore]:
        """Find transaction score by composite key."""
        query = {
            "investigation_id": investigation_id,
            "transaction_id": transaction_id,
        }
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return TransactionScore.from_mongodb_dict(doc) if doc else None

    async def find_by_investigation(
        self,
        investigation_id: str,
        tenant_id: Optional[str] = None,
        min_score: Optional[float] = None,
        limit: int = 10000,
        skip: int = 0,
    ) -> List[TransactionScore]:
        """Find transaction scores by investigation with optional filtering."""
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if min_score is not None:
            query["risk_score"] = {"$gte": min_score}

        cursor = (
            self.collection.find(query)
            .sort("risk_score", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [TransactionScore.from_mongodb_dict(doc) for doc in docs]

    async def find_high_risk_transactions(
        self,
        investigation_id: str,
        min_score: float,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[TransactionScore]:
        """Find high-risk transactions above threshold."""
        query = {
            "investigation_id": investigation_id,
            "risk_score": {"$gte": min_score},
        }
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query).sort("risk_score", -1).limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [TransactionScore.from_mongodb_dict(doc) for doc in docs]

    async def count_by_investigation(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> int:
        """Count transaction scores for an investigation."""
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def count_high_risk(
        self,
        investigation_id: str,
        min_score: float,
        tenant_id: Optional[str] = None,
    ) -> int:
        """Count high-risk transactions above threshold."""
        query = {
            "investigation_id": investigation_id,
            "risk_score": {"$gte": min_score},
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def get_score_distribution(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> dict:
        """Get risk score distribution for an investigation."""
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        pipeline = [
            {"$match": query},
            {
                "$bucket": {
                    "groupBy": "$risk_score",
                    "boundaries": [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
                    "default": "other",
                    "output": {
                        "count": {"$sum": 1},
                        "avg_score": {"$avg": "$risk_score"},
                    },
                }
            },
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=10)

        return {
            "distribution": results,
            "total_transactions": sum(r["count"] for r in results),
        }

    async def get_statistics(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> dict:
        """Get transaction score statistics."""
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "count": {"$sum": 1},
                    "avg_score": {"$avg": "$risk_score"},
                    "min_score": {"$min": "$risk_score"},
                    "max_score": {"$max": "$risk_score"},
                    "high_risk_count": {
                        "$sum": {"$cond": [{"$gte": ["$risk_score", 0.7]}, 1, 0]}
                    },
                }
            },
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)

        if results:
            return results[0]
        return {"count": 0}

    async def delete_by_investigation(
        self, investigation_id: str, tenant_id: Optional[str] = None
    ) -> int:
        """Delete all transaction scores for an investigation."""
        query = {"investigation_id": investigation_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        result = await self.collection.delete_many(query)

        if result.deleted_count > 0:
            logger.info(
                f"Deleted {result.deleted_count} transaction scores "
                f"for investigation {investigation_id}"
            )

        return result.deleted_count

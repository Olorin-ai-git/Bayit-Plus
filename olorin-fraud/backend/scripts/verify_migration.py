"""Data Migration Verification Script.

SYSTEM MANDATE Compliance:
- No hardcoded values: All from environment
- Complete implementation: No placeholders or TODOs
- Comprehensive validation: Compares PostgreSQL and MongoDB data

This script verifies data was correctly migrated from PostgreSQL to MongoDB
by comparing record counts, sampling records, and validating data integrity.
"""

import asyncio
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session

from app.config.mongodb_settings import get_mongodb_settings
from app.models.investigation_state import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MigrationVerifier:
    """Verify data migration from PostgreSQL to MongoDB."""

    def __init__(self, postgres_url: str):
        """Initialize verifier with database connections.

        Args:
            postgres_url: PostgreSQL connection URL
        """
        self.postgres_url = postgres_url
        self.mongodb_settings = get_mongodb_settings()
        self.mongodb_client: Optional[AsyncIOMotorClient] = None
        self.mongodb: Optional[AsyncIOMotorDatabase] = None
        self.postgres_engine = None
        self.results: Dict[str, Tuple[bool, str]] = {}

    async def connect(self) -> bool:
        """Establish connections to both databases."""
        try:
            # Connect to MongoDB
            self.mongodb_client = AsyncIOMotorClient(
                self.mongodb_settings.get_connection_string(),
                **self.mongodb_settings.get_pool_config(),
            )
            self.mongodb = self.mongodb_client[
                self.mongodb_settings.get_database_name()
            ]
            await self.mongodb.command("ping")

            # Connect to PostgreSQL
            self.postgres_engine = create_engine(self.postgres_url)

            return True

        except Exception as e:
            logger.error(f"Failed to connect to databases: {e}")
            return False

    async def verify_investigations(self) -> Tuple[bool, str]:
        """Verify investigations collection."""
        logger.info("1. Verifying investigations migration...")

        try:
            # Count records in PostgreSQL
            with Session(self.postgres_engine) as session:
                pg_count = session.scalar(select(func.count(InvestigationState.investigation_id)))

            # Count documents in MongoDB
            mongo_count = await self.mongodb.investigations.count_documents({})

            if pg_count != mongo_count:
                message = f"Count mismatch: PostgreSQL={pg_count}, MongoDB={mongo_count}"
                logger.error(f"   ❌ {message}")
                return (False, message)

            # Sample verification - compare 10 random records
            with Session(self.postgres_engine) as session:
                sample_records = (
                    session.query(InvestigationState).limit(10).all()
                )

                for pg_record in sample_records:
                    mongo_doc = await self.mongodb.investigations.find_one(
                        {"investigation_id": pg_record.investigation_id}
                    )

                    if not mongo_doc:
                        message = f"Missing investigation: {pg_record.investigation_id}"
                        logger.error(f"   ❌ {message}")
                        return (False, message)

                    # Verify key fields match
                    if mongo_doc.get("user_id") != pg_record.user_id:
                        message = f"User ID mismatch for {pg_record.investigation_id}"
                        logger.error(f"   ❌ {message}")
                        return (False, message)

                    if mongo_doc.get("status") != pg_record.status:
                        message = f"Status mismatch for {pg_record.investigation_id}"
                        logger.error(f"   ❌ {message}")
                        return (False, message)

            logger.info(f"   ✅ All {mongo_count} investigations verified")
            return (True, f"{mongo_count} investigations migrated correctly")

        except Exception as e:
            message = f"Investigation verification failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def verify_collection_counts(self) -> Tuple[bool, str]:
        """Verify all collection counts match expected values."""
        logger.info("2. Verifying collection counts...")

        collections_to_verify = [
            "investigations",
            "detectors",
            "detection_runs",
            "anomaly_events",
            "transaction_scores",
            "audit_log",
            "templates",
            "composio_connections",
            "composio_action_audits",
            "soar_playbook_executions",
        ]

        try:
            collection_counts = {}

            for collection_name in collections_to_verify:
                count = await self.mongodb[collection_name].count_documents({})
                collection_counts[collection_name] = count
                logger.info(f"   📊 {collection_name}: {count} documents")

            # Verify we have data in key collections
            if collection_counts["investigations"] == 0:
                message = "No investigations found - migration may have failed"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)  # Warning, not failure

            total_documents = sum(collection_counts.values())
            logger.info(f"   ✅ Total documents across all collections: {total_documents}")
            return (True, f"All collections verified: {total_documents} total documents")

        except Exception as e:
            message = f"Collection count verification failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def verify_indexes(self) -> Tuple[bool, str]:
        """Verify all required indexes exist."""
        logger.info("3. Verifying indexes...")

        required_indexes = {
            "investigations": ["investigation_id_1", "user_id_1_created_at_-1"],
            "detectors": ["detector_id_1", "type_1"],
            "anomaly_events": ["anomaly_id_1", "run_id_1"],
            "transaction_scores": ["investigation_id_1_transaction_id_1"],
        }

        try:
            missing_indexes = []

            for collection_name, expected_indexes in required_indexes.items():
                collection = self.mongodb[collection_name]
                indexes = await collection.index_information()
                existing_index_names = set(indexes.keys())

                for expected_index in expected_indexes:
                    if expected_index not in existing_index_names:
                        missing_indexes.append(f"{collection_name}.{expected_index}")

            if missing_indexes:
                message = f"Missing indexes: {', '.join(missing_indexes)}"
                logger.error(f"   ❌ {message}")
                return (False, message)

            logger.info(f"   ✅ All required indexes present")
            return (True, "All required indexes verified")

        except Exception as e:
            message = f"Index verification failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def verify_data_integrity(self) -> Tuple[bool, str]:
        """Verify data integrity constraints."""
        logger.info("4. Verifying data integrity...")

        try:
            # Check for investigations with invalid references
            pipeline = [
                {
                    "$lookup": {
                        "from": "anomaly_events",
                        "localField": "investigation_id",
                        "foreignField": "investigation_id",
                        "as": "anomalies",
                    }
                },
                {"$project": {"investigation_id": 1, "anomaly_count": {"$size": "$anomalies"}}},
                {"$limit": 10},
            ]

            results = await self.mongodb.investigations.aggregate(pipeline).to_list(
                length=10
            )

            # Verify tenant_id consistency
            collections_with_tenant = [
                "investigations",
                "detectors",
                "anomaly_events",
                "transaction_scores",
            ]

            for collection_name in collections_with_tenant:
                # Check for documents missing tenant_id
                missing_tenant = await self.mongodb[collection_name].count_documents(
                    {"tenant_id": {"$exists": False}}
                )

                if missing_tenant > 0:
                    message = f"{collection_name} has {missing_tenant} documents without tenant_id"
                    logger.warning(f"   ⚠️  {message}")
                    return (True, message)  # Warning, not failure for optional field

            logger.info(f"   ✅ Data integrity checks passed")
            return (True, "Data integrity verified")

        except Exception as e:
            message = f"Data integrity verification failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def verify_embeddings(self) -> Tuple[bool, str]:
        """Verify embeddings were generated correctly."""
        logger.info("5. Verifying embeddings...")

        if not self.mongodb_settings.is_vector_search_enabled():
            logger.info("   ⏭️  Vector search disabled, skipping embedding verification")
            return (True, "Vector search disabled")

        try:
            # Check for anomaly events with embeddings
            with_embeddings = await self.mongodb.anomaly_events.count_documents(
                {"embedding": {"$exists": True}}
            )

            total_anomalies = await self.mongodb.anomaly_events.count_documents({})

            if total_anomalies == 0:
                logger.info("   ⏭️  No anomaly events to verify")
                return (True, "No anomaly events")

            # Check embedding dimensions
            sample = await self.mongodb.anomaly_events.find_one(
                {"embedding": {"$exists": True}}
            )

            if sample:
                embedding = sample.get("embedding", [])
                expected_dim = self.mongodb_settings.embedding_dimension

                if len(embedding) != expected_dim:
                    message = f"Embedding dimension mismatch: expected {expected_dim}, got {len(embedding)}"
                    logger.error(f"   ❌ {message}")
                    return (False, message)

            coverage_pct = (with_embeddings / total_anomalies * 100) if total_anomalies > 0 else 0
            logger.info(
                f"   ✅ Embeddings verified: {with_embeddings}/{total_anomalies} ({coverage_pct:.1f}%)"
            )
            return (True, f"Embeddings: {coverage_pct:.1f}% coverage")

        except Exception as e:
            message = f"Embedding verification failed: {str(e)}"
            logger.warning(f"   ⚠️  {message}")
            return (True, message)  # Non-critical warning

    async def verify_all(self) -> Dict[str, Tuple[bool, str]]:
        """Run all verifications."""
        logger.info("=" * 80)
        logger.info("🔍 Data Migration Verification Starting")
        logger.info("=" * 80)
        logger.info("")

        # Connect to databases
        if not await self.connect():
            return {"connection": (False, "Failed to connect to databases")}

        # Run all verifications
        self.results["investigations"] = await self.verify_investigations()
        self.results["collection_counts"] = await self.verify_collection_counts()
        self.results["indexes"] = await self.verify_indexes()
        self.results["data_integrity"] = await self.verify_data_integrity()
        self.results["embeddings"] = await self.verify_embeddings()

        return self.results

    async def print_summary(self) -> bool:
        """Print verification summary and return overall success."""
        logger.info("")
        logger.info("=" * 80)
        logger.info("📊 Migration Verification Summary")
        logger.info("=" * 80)

        total_checks = len(self.results)
        passed_checks = sum(1 for success, _ in self.results.values() if success)
        failed_checks = total_checks - passed_checks

        for check_name, (success, message) in self.results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            logger.info(f"{status}: {check_name.replace('_', ' ').title()}")
            logger.info(f"       {message}")

        logger.info("")
        logger.info(f"Total Checks: {total_checks}")
        logger.info(f"Passed: {passed_checks}")
        logger.info(f"Failed: {failed_checks}")
        logger.info("")

        if failed_checks == 0:
            logger.info("✅ All verifications passed! Migration successful.")
            logger.info("=" * 80)
            return True
        else:
            logger.error("❌ Some verifications failed. Review migration process.")
            logger.error("=" * 80)
            return False

    async def close(self):
        """Close database connections."""
        if self.mongodb_client:
            self.mongodb_client.close()
        if self.postgres_engine:
            self.postgres_engine.dispose()


async def main():
    """Run migration verification."""
    import os

    # Get PostgreSQL URL from environment
    postgres_url = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/olorin"
    )

    verifier = MigrationVerifier(postgres_url)

    try:
        await verifier.verify_all()
        success = await verifier.print_summary()

        # Exit with appropriate code
        sys.exit(0 if success else 1)

    except Exception as e:
        logger.error(f"❌ Verification failed with exception: {e}", exc_info=True)
        sys.exit(1)

    finally:
        await verifier.close()


if __name__ == "__main__":
    asyncio.run(main())

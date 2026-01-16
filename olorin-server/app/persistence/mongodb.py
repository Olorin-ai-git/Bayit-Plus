"""MongoDB Atlas connection management module.

This module provides connection pooling, database initialization, and
connection lifecycle management for MongoDB Atlas.

Configuration is driven by environment variables:
- MONGODB_URI: MongoDB Atlas connection string
- MONGODB_DATABASE: Database name
- MONGODB_MAX_POOL_SIZE: Maximum connection pool size (default: 100)
- MONGODB_MIN_POOL_SIZE: Minimum connection pool size (default: 20)
"""

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure

from app.service.config import get_settings_for_env
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

_mongo_client: Optional[AsyncIOMotorClient] = None
_mongo_db: Optional[AsyncIOMotorDatabase] = None


def init_mongodb() -> None:
    """Initialize MongoDB connection with configuration-driven settings.

    Reads configuration from environment variables and creates a Motor
    async client with connection pooling enabled.

    Raises:
        ValueError: If required configuration is missing
        ConnectionFailure: If connection to MongoDB Atlas fails
    """
    global _mongo_client, _mongo_db

    if _mongo_client is not None:
        logger.info("MongoDB already initialized, skipping")
        return

    settings = get_settings_for_env()

    # Get MongoDB configuration from environment
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        raise ValueError(
            "MONGODB_URI environment variable is required. "
            "Format: mongodb+srv://user:password@cluster.mongodb.net/database"
        )

    database_name = os.getenv("MONGODB_DATABASE", "olorin")
    max_pool_size = int(os.getenv("MONGODB_MAX_POOL_SIZE", "100"))
    min_pool_size = int(os.getenv("MONGODB_MIN_POOL_SIZE", "20"))
    max_idle_time_ms = int(os.getenv("MONGODB_MAX_IDLE_TIME_MS", "45000"))

    logger.info(
        f"Initializing MongoDB connection to database: {database_name}",
        extra={
            "max_pool_size": max_pool_size,
            "min_pool_size": min_pool_size,
            "max_idle_time_ms": max_idle_time_ms,
        },
    )

    try:
        _mongo_client = AsyncIOMotorClient(
            mongodb_uri,
            maxPoolSize=max_pool_size,
            minPoolSize=min_pool_size,
            maxIdleTimeMS=max_idle_time_ms,
            retryWrites=True,
            retryReads=True,
            w="majority",
            readPreference="secondaryPreferred",
        )

        _mongo_db = _mongo_client[database_name]

        logger.info(
            f"MongoDB initialized successfully: {database_name}",
            extra={"client_id": id(_mongo_client)},
        )

    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB Atlas: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error initializing MongoDB: {e}")
        raise


def get_mongodb() -> AsyncIOMotorDatabase:
    """Get the MongoDB database instance.

    Returns:
        AsyncIOMotorDatabase: The initialized MongoDB database

    Raises:
        RuntimeError: If MongoDB has not been initialized
    """
    if _mongo_db is None:
        raise RuntimeError(
            "MongoDB has not been initialized. Call init_mongodb() first."
        )
    return _mongo_db


async def verify_mongodb_connection() -> bool:
    """Verify MongoDB connection by pinging the server.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        db = get_mongodb()
        await db.command("ping")
        logger.info("MongoDB connection verified successfully")
        return True
    except Exception as e:
        logger.error(f"MongoDB connection verification failed: {e}")
        return False


async def close_mongodb() -> None:
    """Close MongoDB connections and cleanup resources.

    This should be called during application shutdown to ensure
    all connections are properly closed.
    """
    global _mongo_client, _mongo_db

    if _mongo_client:
        logger.info("Closing MongoDB connections")
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        logger.info("MongoDB connections closed successfully")
    else:
        logger.info("MongoDB not initialized, nothing to close")


async def ensure_mongodb_collections() -> None:
    """Ensure all required MongoDB collections exist with proper indexes.

    This function creates collections and indexes based on the schema design
    from the migration plan. It is idempotent and safe to call multiple times.

    Collections created:
    - investigations
    - detectors
    - detection_runs (time series)
    - anomaly_events
    - transaction_scores
    - audit_log (time series)
    - templates
    - composio_connections
    - composio_action_audits
    - soar_playbook_executions

    Raises:
        RuntimeError: If MongoDB is not initialized
    """
    db = get_mongodb()

    logger.info("Ensuring MongoDB collections and indexes exist")

    # Create standard collections
    standard_collections = [
        "investigations",
        "detectors",
        "anomaly_events",
        "transaction_scores",
        "templates",
        "composio_connections",
        "composio_action_audits",
        "soar_playbook_executions",
    ]

    existing_collections = await db.list_collection_names()

    for collection_name in standard_collections:
        if collection_name not in existing_collections:
            await db.create_collection(collection_name)
            logger.info(f"Created collection: {collection_name}")
        else:
            logger.debug(f"Collection already exists: {collection_name}")

    # Create time series collections
    time_series_configs = {
        "detection_runs": {
            "timeField": "started_at",
            "metaField": "metadata",
            "granularity": "minutes",
        },
        "audit_log": {
            "timeField": "timestamp",
            "metaField": "metadata",
            "granularity": "seconds",
        },
    }

    for collection_name, config in time_series_configs.items():
        if collection_name not in existing_collections:
            await db.create_collection(collection_name, timeseries=config)
            logger.info(f"Created time series collection: {collection_name}")
        else:
            logger.debug(f"Time series collection already exists: {collection_name}")

    # Create indexes
    await _create_indexes(db)

    logger.info("MongoDB collections and indexes verified successfully")


async def _create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes for all collections.

    This is an internal helper function that creates indexes based on
    the schema design. Indexes are created in the background to avoid
    blocking operations.

    Args:
        db: MongoDB database instance
    """
    from pymongo import ASCENDING, DESCENDING

    # Investigations indexes
    await db.investigations.create_index(
        [("investigation_id", ASCENDING)], unique=True, background=True
    )
    await db.investigations.create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)], background=True
    )
    await db.investigations.create_index(
        [("tenant_id", ASCENDING), ("status", ASCENDING)], background=True
    )
    await db.investigations.create_index(
        [("status", ASCENDING), ("updated_at", DESCENDING)], background=True
    )

    # Detectors indexes
    await db.detectors.create_index(
        [("detector_id", ASCENDING)], unique=True, background=True
    )
    await db.detectors.create_index(
        [("type", ASCENDING), ("enabled", ASCENDING)], background=True
    )
    await db.detectors.create_index(
        [("tenant_id", ASCENDING), ("enabled", ASCENDING)], background=True
    )

    # Detection runs indexes (time series - automatic on timeField + metaField)
    await db.detection_runs.create_index(
        [("run_id", ASCENDING)], unique=True, background=True
    )

    # Anomaly events indexes
    await db.anomaly_events.create_index(
        [("anomaly_id", ASCENDING)], unique=True, background=True
    )
    await db.anomaly_events.create_index(
        [("run_id", ASCENDING), ("created_at", DESCENDING)], background=True
    )
    await db.anomaly_events.create_index(
        [("detector_id", ASCENDING), ("score", DESCENDING)], background=True
    )
    await db.anomaly_events.create_index(
        [("tenant_id", ASCENDING), ("status", ASCENDING), ("severity", DESCENDING)],
        background=True,
    )
    await db.anomaly_events.create_index([("investigation_id", ASCENDING)], background=True)

    # Transaction scores indexes
    await db.transaction_scores.create_index(
        [("investigation_id", ASCENDING), ("transaction_id", ASCENDING)],
        unique=True,
        background=True,
    )
    await db.transaction_scores.create_index(
        [("investigation_id", ASCENDING), ("risk_score", DESCENDING)], background=True
    )
    await db.transaction_scores.create_index(
        [("tenant_id", ASCENDING), ("created_at", DESCENDING)], background=True
    )

    # Audit log indexes (time series - automatic on timeField + metaField)
    await db.audit_log.create_index([("entry_id", ASCENDING)], unique=True, background=True)

    # Templates indexes
    await db.templates.create_index(
        [("template_id", ASCENDING)], unique=True, background=True
    )
    await db.templates.create_index(
        [("user_id", ASCENDING), ("name", ASCENDING)], unique=True, background=True
    )
    await db.templates.create_index(
        [("tenant_id", ASCENDING), ("usage_count", DESCENDING)], background=True
    )

    # Composio connections indexes
    await db.composio_connections.create_index(
        [("connection_id", ASCENDING)], unique=True, background=True
    )
    await db.composio_connections.create_index(
        [("tenant_id", ASCENDING), ("toolkit_name", ASCENDING), ("status", ASCENDING)],
        background=True,
    )

    # SOAR playbook executions indexes
    await db.soar_playbook_executions.create_index(
        [("execution_id", ASCENDING)], unique=True, background=True
    )
    await db.soar_playbook_executions.create_index(
        [("tenant_id", ASCENDING), ("status", ASCENDING), ("started_at", DESCENDING)],
        background=True,
    )
    await db.soar_playbook_executions.create_index(
        [("investigation_id", ASCENDING), ("started_at", DESCENDING)], background=True
    )

    logger.info("All MongoDB indexes created successfully")

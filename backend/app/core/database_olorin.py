"""
Olorin.ai Platform Database Connection

Separate database connection for Olorin platform data (Phase 2 separation).
Maintains access to Bayit+ Content model for metadata operations.
"""

import logging
import os
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content_embedding import ContentEmbedding, RecapSession
from app.models.cultural_reference import CulturalReference
# Olorin.ai Platform models
from app.models.integration_partner import (DubbingSession, IntegrationPartner,
                                            UsageRecord, WebhookDelivery)

logger = logging.getLogger(__name__)


class OlorinDatabase:
    """Olorin platform database connection manager."""

    client: Optional[AsyncIOMotorClient] = None
    bayit_client: Optional[AsyncIOMotorClient] = None  # For Content access


olorin_db = OlorinDatabase()


async def connect_to_olorin_mongo() -> None:
    """
    Create Olorin database connection.

    Connects to separate Olorin database if configured, otherwise uses main database.
    Also maintains reference to Bayit+ database for Content metadata access.
    """
    # Check if separate database is enabled
    if not settings.olorin.database.use_separate_database:
        logger.info("Olorin separate database disabled - using main database")
        return

    # Determine MongoDB URL
    mongodb_url = settings.olorin.database.mongodb_url or settings.MONGODB_URI

    # Create Olorin database client with connection pool configuration
    # Pool sizes read from env to respect M0 free-tier connection limits
    olorin_pool_max = int(os.getenv("MONGODB_MAX_POOL_SIZE", "3"))
    olorin_pool_min = int(os.getenv("MONGODB_MIN_POOL_SIZE", "0"))
    olorin_db.client = AsyncIOMotorClient(
        mongodb_url,
        maxPoolSize=olorin_pool_max,
        minPoolSize=olorin_pool_min,
        maxIdleTimeMS=30000,
        waitQueueTimeoutMS=5000,
        connectTimeoutMS=10000,
        serverSelectionTimeoutMS=10000,
    )

    # Initialize Beanie with Olorin models only
    await init_beanie(
        database=olorin_db.client[settings.olorin.database.mongodb_db_name],
        document_models=[
            IntegrationPartner,
            UsageRecord,
            DubbingSession,
            WebhookDelivery,
            ContentEmbedding,
            RecapSession,
            CulturalReference,
        ],
    )

    logger.info(
        f"Connected to Olorin MongoDB: {settings.olorin.database.mongodb_db_name}"
    )

    # Maintain reference to Bayit+ database for Content access
    # Use main MONGODB_URI for Bayit+ database connection
    if mongodb_url != settings.MONGODB_URI:
        olorin_db.bayit_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            maxPoolSize=olorin_pool_max,
            minPoolSize=olorin_pool_min,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=5000,
            connectTimeoutMS=10000,
            serverSelectionTimeoutMS=10000,
        )
        logger.info("Established Bayit+ database reference for Content metadata access")
    else:
        # Same connection, just reference it
        olorin_db.bayit_client = olorin_db.client
        logger.info("Using same connection for Bayit+ Content access")


async def close_olorin_mongo_connection() -> None:
    """Close Olorin database connection."""
    if not settings.olorin.database.use_separate_database:
        return

    if olorin_db.client:
        olorin_db.client.close()
        logger.info("Closed Olorin MongoDB connection")

    # Close Bayit+ client if it's a separate connection
    if olorin_db.bayit_client and olorin_db.bayit_client != olorin_db.client:
        olorin_db.bayit_client.close()
        logger.info("Closed Bayit+ MongoDB reference connection")


def get_olorin_database():
    """Get Olorin database instance."""
    if not settings.olorin.database.use_separate_database:
        # Fallback to main database
        from app.core.database import get_database

        return get_database()

    if not olorin_db.client:
        raise RuntimeError(
            "Olorin database not initialized. Call connect_to_olorin_mongo() first."
        )

    return olorin_db.client[settings.olorin.database.mongodb_db_name]


def get_bayit_database():
    """Get Bayit+ database instance for Content access."""
    if not settings.olorin.database.use_separate_database:
        # Fallback to main database
        from app.core.database import get_database

        return get_database()

    if not olorin_db.bayit_client:
        raise RuntimeError(
            "Bayit+ database reference not initialized. "
            "Call connect_to_olorin_mongo() first."
        )

    return olorin_db.bayit_client[settings.MONGODB_DB_NAME]

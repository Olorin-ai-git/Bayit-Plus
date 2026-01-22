"""
MongoDB Database Connection using Beanie ODM
Follows Olorin ecosystem database patterns

INTEGRATES WITH:
- olorin-shared: MongoDB connection patterns
- MongoDB Atlas: cluster0.ydrvaft.mongodb.net
- Beanie ODM for async operations
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Global database client
db_client: AsyncIOMotorClient | None = None

async def init_database():
    """
    Initialize MongoDB connection and Beanie ODM
    Uses olorin-shared MongoDB connection patterns
    """
    global db_client

    settings = get_settings()

    logger.info("Connecting to MongoDB Atlas...")
    logger.info(f"Database: {settings.mongodb_db_name}")

    try:
        # Create Motor client
        db_client = AsyncIOMotorClient(
            settings.mongodb_uri,
            maxPoolSize=settings.mongodb_max_pool_size,
            minPoolSize=settings.mongodb_min_pool_size,
            serverSelectionTimeoutMS=30000,
        )

        # Test connection
        await db_client.admin.command("ping")
        logger.info("✅ Connected to MongoDB Atlas")

        # Initialize Beanie with document models
        from app.models import (
            CV,
            CVAnalysis,
            Profile,
            ContactRequest,
            AnalyticsEvent,
            User,
        )

        await init_beanie(
            database=db_client[settings.mongodb_db_name],
            document_models=[
                CV,
                CVAnalysis,
                Profile,
                ContactRequest,
                AnalyticsEvent,
                User,
            ],
        )

        logger.info("✅ Beanie ODM initialized")

    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def close_database():
    """Close MongoDB connection"""
    global db_client

    if db_client:
        db_client.close()
        logger.info("✅ MongoDB connection closed")

def get_database():
    """Get database instance"""
    if db_client is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")

    settings = get_settings()
    return db_client[settings.mongodb_db_name]

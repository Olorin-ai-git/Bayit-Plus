"""
Centralized MongoDB Atlas connection for all Olorin.ai platforms.

SYSTEM MANDATE Compliance:
- Configuration-driven: All values from environment
- Complete implementation: Full connection management
- No placeholders or TODOs
- Shared MongoDB Atlas cluster, separate databases per platform
"""

import logging
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConfigurationError, ConnectionFailure

logger = logging.getLogger(__name__)


class MongoDBConnection:
    """
    Centralized MongoDB Atlas connection manager.

    All Olorin platforms use the same MongoDB Atlas cluster but different databases:
    - bayit-plus: bayit_plus
    - station-ai: israeli_radio
    - olorin-fraud: olorin
    """

    # Shared MongoDB Atlas cluster
    CLUSTER_HOST = "cluster0.ydrvaft.mongodb.net"

    def __init__(self):
        """Initialize MongoDB connection manager."""
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None

        # Load configuration from environment
        self.mongodb_uri = os.getenv("MONGODB_URI")
        self.mongodb_db_name = os.getenv("MONGODB_DB_NAME")

        # Validate required configuration
        if not self.mongodb_uri:
            raise ConfigurationError(
                "MONGODB_URI environment variable is required. "
                "Format: mongodb+srv://username:password@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority"
            )

        if not self.mongodb_db_name:
            raise ConfigurationError(
                "MONGODB_DB_NAME environment variable is required. "
                "Use: bayit_plus, israeli_radio, or olorin depending on platform"
            )

        # Connection pool configuration from environment (with defaults)
        self.max_pool_size = int(os.getenv("MONGODB_MAX_POOL_SIZE", "100"))
        self.min_pool_size = int(os.getenv("MONGODB_MIN_POOL_SIZE", "20"))
        self.max_idle_time_ms = int(os.getenv("MONGODB_MAX_IDLE_TIME_MS", "45000"))
        self.connect_timeout_ms = int(os.getenv("MONGODB_CONNECT_TIMEOUT_MS", "30000"))
        self.server_selection_timeout_ms = int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "30000"))

    async def connect(self) -> AsyncIOMotorClient:
        """
        Establish connection to MongoDB Atlas.

        Returns:
            AsyncIOMotorClient instance

        Raises:
            ConnectionFailure: If connection fails
        """
        if self.client is not None:
            logger.info("MongoDB client already connected")
            return self.client

        try:
            logger.info(f"Connecting to MongoDB Atlas cluster: {self.CLUSTER_HOST}")
            logger.info(f"Database: {self.mongodb_db_name}")

            # Create Motor client with connection pooling
            self.client = AsyncIOMotorClient(
                self.mongodb_uri,
                maxPoolSize=self.max_pool_size,
                minPoolSize=self.min_pool_size,
                maxIdleTimeMS=self.max_idle_time_ms,
                connectTimeoutMS=self.connect_timeout_ms,
                serverSelectionTimeoutMS=self.server_selection_timeout_ms,
            )

            # Get database
            self.database = self.client[self.mongodb_db_name]

            # Verify connection with ping
            await self.database.command("ping")

            logger.info(f"✅ Connected to MongoDB Atlas: {self.mongodb_db_name}")
            logger.info(f"   Max pool size: {self.max_pool_size}")
            logger.info(f"   Min pool size: {self.min_pool_size}")

            return self.client

        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error connecting to MongoDB: {e}")
            raise

    async def close(self) -> None:
        """Close MongoDB connection and cleanup resources."""
        if self.client:
            self.client.close()
            self.client = None
            self.database = None
            logger.info("Closed MongoDB Atlas connection")

    def get_client(self) -> AsyncIOMotorClient:
        """
        Get MongoDB client instance.

        Returns:
            AsyncIOMotorClient instance

        Raises:
            RuntimeError: If not connected
        """
        if self.client is None:
            raise RuntimeError(
                "MongoDB client not connected. Call connect() first or use init_mongodb() startup handler"
            )
        return self.client

    def get_database(self) -> AsyncIOMotorDatabase:
        """
        Get MongoDB database instance.

        Returns:
            AsyncIOMotorDatabase instance

        Raises:
            RuntimeError: If not connected
        """
        if self.database is None:
            raise RuntimeError(
                "MongoDB database not connected. Call connect() first or use init_mongodb() startup handler"
            )
        return self.database


# Global singleton instance
_mongodb_connection: Optional[MongoDBConnection] = None


async def init_mongodb() -> MongoDBConnection:
    """
    Initialize MongoDB connection (startup handler).

    Usage in FastAPI:
        @app.on_event("startup")
        async def startup():
            await init_mongodb()

    Returns:
        MongoDBConnection instance
    """
    global _mongodb_connection

    if _mongodb_connection is None:
        _mongodb_connection = MongoDBConnection()

    await _mongodb_connection.connect()
    return _mongodb_connection


async def close_mongodb_connection() -> None:
    """
    Close MongoDB connection (shutdown handler).

    Usage in FastAPI:
        @app.on_event("shutdown")
        async def shutdown():
            await close_mongodb_connection()
    """
    global _mongodb_connection

    if _mongodb_connection is not None:
        await _mongodb_connection.close()
        _mongodb_connection = None


def get_mongodb_client() -> AsyncIOMotorClient:
    """
    Get MongoDB client instance.

    Returns:
        AsyncIOMotorClient instance

    Raises:
        RuntimeError: If MongoDB not initialized
    """
    if _mongodb_connection is None:
        raise RuntimeError(
            "MongoDB not initialized. Call init_mongodb() during application startup"
        )
    return _mongodb_connection.get_client()


def get_mongodb_database() -> AsyncIOMotorDatabase:
    """
    Get MongoDB database instance.

    Returns:
        AsyncIOMotorDatabase instance

    Raises:
        RuntimeError: If MongoDB not initialized
    """
    if _mongodb_connection is None:
        raise RuntimeError(
            "MongoDB not initialized. Call init_mongodb() during application startup"
        )
    return _mongodb_connection.get_database()

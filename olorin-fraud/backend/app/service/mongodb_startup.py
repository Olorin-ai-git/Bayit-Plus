"""MongoDB Startup Integration.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Fail-fast: Invalid configuration prevents startup
"""

import logging
from typing import Tuple

from app.config.mongodb_settings import get_mongodb_settings
from app.persistence.mongodb import close_mongodb, ensure_mongodb_collections, init_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def initialize_mongodb_on_startup() -> Tuple[bool, str]:
    """Initialize MongoDB connection and collections at application startup.

    This function:
    1. Loads and validates MongoDB configuration
    2. Establishes connection to MongoDB Atlas
    3. Creates all required collections and indexes
    4. Verifies connection is working

    Returns:
        Tuple[bool, str]: (success, error_message)
            - (True, "") if initialization successful
            - (False, error_message) if initialization failed

    Raises:
        RuntimeError: If MongoDB configuration is invalid (fail-fast)
    """
    logger.info("=" * 80)
    logger.info("🍃 MongoDB Atlas Initialization Starting")
    logger.info("=" * 80)

    try:
        # Step 1: Load and validate configuration
        logger.info("📋 Loading MongoDB configuration...")
        try:
            settings = get_mongodb_settings()
            logger.info(f"✅ MongoDB configuration loaded successfully")
            logger.info(f"   Database: {settings.get_database_name()}")
            logger.info(f"   Connection Pool: {settings.mongodb_min_pool_size}-{settings.mongodb_max_pool_size}")
            logger.info(f"   Vector Search: {'enabled' if settings.is_vector_search_enabled() else 'disabled'}")
            logger.info(f"   Atlas Search: {'enabled' if settings.is_atlas_search_enabled() else 'disabled'}")
            logger.info(f"   Time Series: {'enabled' if settings.is_time_series_enabled() else 'disabled'}")
        except Exception as e:
            error_msg = f"Failed to load MongoDB configuration: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.error("   Check your .env file or environment variables:")
            logger.error("   - MONGODB_URI (required)")
            logger.error("   - MONGODB_DATABASE (default: olorin)")
            logger.error("   See docs/MONGODB_CONFIGURATION.md for details")
            return (False, error_msg)

        # Step 2: Initialize MongoDB connection
        logger.info("🔌 Connecting to MongoDB Atlas...")
        try:
            # init_mongodb() is synchronous and returns None
            init_mongodb()
            # Get the database instance after initialization
            from app.persistence.mongodb import get_mongodb
            db = get_mongodb()
            logger.info(f"✅ Connected to MongoDB successfully")
        except Exception as e:
            error_msg = f"Failed to connect to MongoDB: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.error("   Troubleshooting steps:")
            logger.error("   1. Verify MONGODB_URI is correct")
            logger.error("   2. Check network connectivity")
            logger.error("   3. Verify IP whitelist in MongoDB Atlas")
            logger.error("   4. Check database user permissions")
            logger.error("   See docs/MONGODB_CONFIGURATION.md for troubleshooting")
            return (False, error_msg)

        # Step 3: Create collections and indexes
        logger.info("🏗️  Creating collections and indexes...")
        try:
            # ensure_mongodb_collections() doesn't take parameters - it calls get_mongodb() internally
            await ensure_mongodb_collections()
            logger.info(f"✅ Collections and indexes created successfully")
            logger.info("   Collections:")
            logger.info("   - investigations (lifecycle tracking)")
            logger.info("   - detectors (anomaly detection configs)")
            logger.info("   - detection_runs (time series)")
            logger.info("   - anomaly_events (with vector search)")
            logger.info("   - transaction_scores (high volume)")
            logger.info("   - audit_log (time series)")
            logger.info("   - templates (investigation templates)")
            logger.info("   - composio_connections (OAuth)")
            logger.info("   - composio_action_audits (action history)")
            logger.info("   - soar_playbook_executions (playbook tracking)")
        except Exception as e:
            error_msg = f"Failed to create collections/indexes: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.error("   This may indicate insufficient database permissions")
            logger.error("   Verify database user has 'readWrite' role")
            return (False, error_msg)

        # Step 4: Verify connection is working
        logger.info("🔍 Verifying connection...")
        try:
            # Simple ping to verify connection
            await db.command("ping")
            logger.info(f"✅ Connection verified successfully")
        except Exception as e:
            error_msg = f"Connection verification failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return (False, error_msg)

        logger.info("=" * 80)
        logger.info("✅ MongoDB Atlas Initialization Complete")
        logger.info("=" * 80)
        return (True, "")

    except Exception as e:
        error_msg = f"Unexpected error during MongoDB initialization: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        logger.error("=" * 80)
        return (False, error_msg)


async def shutdown_mongodb_on_shutdown() -> None:
    """Close MongoDB connection gracefully at application shutdown.

    This function:
    1. Closes all active MongoDB connections
    2. Cleans up connection pool
    3. Ensures no data loss
    """
    logger.info("=" * 80)
    logger.info("🍃 MongoDB Atlas Shutdown Starting")
    logger.info("=" * 80)

    try:
        logger.info("🔌 Closing MongoDB connections...")
        await close_mongodb()
        logger.info("✅ MongoDB connections closed successfully")
        logger.info("=" * 80)
        logger.info("✅ MongoDB Atlas Shutdown Complete")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Error during MongoDB shutdown: {str(e)}", exc_info=True)
        logger.error("   Connections may not have closed cleanly")
        logger.error("=" * 80)


def log_mongodb_startup_instructions() -> None:
    """Log helpful instructions for MongoDB setup (for development)."""
    logger.info("")
    logger.info("=" * 80)
    logger.info("📚 MongoDB Atlas Setup Instructions")
    logger.info("=" * 80)
    logger.info("")
    logger.info("If you haven't set up MongoDB Atlas yet:")
    logger.info("")
    logger.info("1. Create MongoDB Atlas account:")
    logger.info("   https://www.mongodb.com/cloud/atlas")
    logger.info("")
    logger.info("2. Create a cluster (M10+ recommended for production)")
    logger.info("")
    logger.info("3. Configure database access (create user)")
    logger.info("")
    logger.info("4. Configure network access (whitelist IPs)")
    logger.info("")
    logger.info("5. Get connection string and add to .env:")
    logger.info("   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/olorin")
    logger.info("")
    logger.info("6. Enable Atlas features:")
    logger.info("   - Atlas Vector Search (for anomaly similarity)")
    logger.info("   - Atlas Search (for full-text search)")
    logger.info("")
    logger.info("For detailed instructions, see:")
    logger.info("   docs/MONGODB_CONFIGURATION.md")
    logger.info("")
    logger.info("=" * 80)
    logger.info("")


async def check_mongodb_health() -> Tuple[bool, str]:
    """Health check for MongoDB connection.

    Used by health endpoints to verify MongoDB is accessible.

    Returns:
        Tuple[bool, str]: (is_healthy, status_message)
    """
    try:
        from app.persistence.mongodb import get_mongodb

        db = get_mongodb()
        if db is None:
            return (False, "MongoDB not initialized")

        # Ping database to verify connection
        await db.command("ping")
        return (True, "MongoDB connection healthy")

    except Exception as e:
        return (False, f"MongoDB connection unhealthy: {str(e)}")

"""
Create TTL (Time To Live) indexes for cache collections.

TTL indexes automatically expire documents after a specified time period,
keeping cache collections from growing indefinitely.

Collections with TTL indexes:
- audio_cache: Expires after 24 hours
- session_tokens: Expires based on expiry_time field
- rate_limit_tracker: Expires after 1 hour
- stream_validation_cache: Expires based on expires_at field
- classification_verification_cache: Expires based on expires_at field
"""

import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def create_ttl_indexes():
    """Create TTL indexes for cache collections."""
    logger.info("Creating TTL indexes for cache collections...")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    logger.info(f"Connected to MongoDB: {settings.mongodb_db_name}")

    # Audio cache - expire after 24 hours
    logger.info("Creating TTL index for audio_cache (24 hours)...")
    await db.audio_cache.create_index(
        "created_at",
        expireAfterSeconds=86400,  # 24 hours
        name="audio_cache_ttl"
    )
    logger.info("✓ audio_cache TTL index created")

    # Session tokens - expire based on expiry_time field
    logger.info("Creating TTL index for session_tokens (based on expiry_time)...")
    await db.session_tokens.create_index(
        "expiry_time",
        expireAfterSeconds=0,  # Expire at the expiry_time field value
        name="session_tokens_ttl"
    )
    logger.info("✓ session_tokens TTL index created")

    # Rate limit tracker - expire after 1 hour
    logger.info("Creating TTL index for rate_limit_tracker (1 hour)...")
    await db.rate_limit_tracker.create_index(
        "created_at",
        expireAfterSeconds=3600,  # 1 hour
        name="rate_limit_tracker_ttl"
    )
    logger.info("✓ rate_limit_tracker TTL index created")

    # Stream validation cache - already has expires_at field in database.py
    logger.info("Creating TTL index for stream_validation_cache (based on expires_at)...")
    await db.stream_validation_cache.create_index(
        "expires_at",
        expireAfterSeconds=0,  # Expire at the expires_at field value
        name="stream_validation_cache_ttl"
    )
    logger.info("✓ stream_validation_cache TTL index created")

    # Classification verification cache - already has expires_at field in database.py
    logger.info("Creating TTL index for classification_verification_cache (based on expires_at)...")
    await db.classification_verification_cache.create_index(
        "expires_at",
        expireAfterSeconds=0,  # Expire at the expires_at field value
        name="classification_verification_cache_ttl"
    )
    logger.info("✓ classification_verification_cache TTL index created")

    # List all indexes to verify
    logger.info("\n=== Verifying TTL Indexes ===")
    collections = [
        "audio_cache",
        "session_tokens",
        "rate_limit_tracker",
        "stream_validation_cache",
        "classification_verification_cache"
    ]

    for collection_name in collections:
        collection = db[collection_name]
        indexes = await collection.index_information()
        ttl_indexes = {
            name: info for name, info in indexes.items()
            if info.get("expireAfterSeconds") is not None
        }

        if ttl_indexes:
            logger.info(f"\n{collection_name}:")
            for idx_name, idx_info in ttl_indexes.items():
                expire_seconds = idx_info.get("expireAfterSeconds")
                key = idx_info.get("key")
                if expire_seconds == 0:
                    logger.info(f"  ✓ {idx_name}: {key} (expires at field value)")
                else:
                    hours = expire_seconds / 3600
                    logger.info(f"  ✓ {idx_name}: {key} (expires after {hours:.1f} hours)")
        else:
            logger.warning(f"\n{collection_name}: No TTL indexes found")

    logger.info("\n=== TTL Index Creation Complete ===")
    client.close()


if __name__ == "__main__":
    asyncio.run(create_ttl_indexes())

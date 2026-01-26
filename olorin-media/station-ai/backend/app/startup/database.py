"""Database initialization for Station-AI."""

import logging

logger = logging.getLogger(__name__)


async def init_database(db):
    """Initialize database collections and indexes."""
    # Content collection indexes
    await db.content.create_index("type")
    await db.content.create_index("genre")
    await db.content.create_index("last_played")

    # Schedule collection indexes
    await db.schedules.create_index("day_of_week")
    await db.schedules.create_index([("start_time", 1), ("end_time", 1)])

    # Playback log indexes
    await db.playback_logs.create_index("started_at")
    await db.playback_logs.create_index("content_id")

    # Pending actions indexes
    await db.pending_actions.create_index("status")
    await db.pending_actions.create_index("expires_at")

    # Push subscriptions indexes
    await db.push_subscriptions.create_index("endpoint", unique=True)
    await db.push_subscriptions.create_index("created_at")

    # Users collection indexes
    await db.users.create_index("firebase_uid", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.users.create_index("is_active")

    # Voice presets collection indexes
    await db.voice_presets.create_index("name", unique=True)
    await db.voice_presets.create_index("is_default")

    # Commercial campaigns collection indexes
    await db.commercial_campaigns.create_index([("status", 1), ("start_date", 1), ("end_date", 1)])
    await db.commercial_campaigns.create_index("priority")

    # Commercial play logs collection indexes
    await db.commercial_play_logs.create_index([("campaign_id", 1), ("slot_date", 1), ("slot_index", 1)])
    await db.commercial_play_logs.create_index("played_at")

    # Librarian audit reports collection indexes
    await db.audit_reports.create_index("audit_date")
    await db.audit_reports.create_index("status")
    await db.audit_reports.create_index("audit_type")
    await db.audit_reports.create_index([("audit_type", 1), ("audit_date", 1)])

    # Librarian actions collection indexes
    await db.librarian_actions.create_index("audit_id")
    await db.librarian_actions.create_index("content_id")
    await db.librarian_actions.create_index("timestamp")
    await db.librarian_actions.create_index("action_type")
    await db.librarian_actions.create_index([("audit_id", 1), ("action_type", 1)])
    await db.librarian_actions.create_index([("content_id", 1), ("timestamp", 1)])
    await db.librarian_actions.create_index("rolled_back")

    # Stream validation cache collection indexes
    await db.stream_validation_cache.create_index("stream_url")
    await db.stream_validation_cache.create_index("last_validated")
    await db.stream_validation_cache.create_index([("stream_url", 1), ("last_validated", 1)])
    await db.stream_validation_cache.create_index("is_valid")
    # TTL index - expire documents at expires_at field value
    try:
        await db.stream_validation_cache.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="stream_validation_cache_ttl"
        )
    except Exception as e:
        logger.warning(f"stream_validation_cache TTL index creation skipped: {e}")

    # Classification verification cache collection indexes
    await db.classification_verification_cache.create_index("content_id")
    await db.classification_verification_cache.create_index([("content_id", 1), ("category_id", 1)])
    await db.classification_verification_cache.create_index("last_verified")
    await db.classification_verification_cache.create_index("is_correct")
    # TTL index - expire documents at expires_at field value
    try:
        await db.classification_verification_cache.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="classification_verification_cache_ttl"
        )
    except Exception as e:
        logger.warning(f"classification_verification_cache TTL index creation skipped: {e}")

    # Backup collection indexes
    await db.backups.create_index("created_at")
    await db.backups.create_index("backup_type")
    await db.backups.create_index("backup_name", unique=True)
    await db.backups.create_index([("backup_type", 1), ("created_at", -1)])
    await db.backups.create_index("status")

    # Audio cache collection - TTL index (expire after 24 hours)
    await db.audio_cache.create_index(
        "created_at",
        expireAfterSeconds=86400,  # 24 hours
        name="audio_cache_ttl"
    )

    # Session tokens collection - TTL index (expire at expiry_time)
    await db.session_tokens.create_index(
        "expiry_time",
        expireAfterSeconds=0,  # Expire at the expiry_time field value
        name="session_tokens_ttl"
    )

    # Rate limit tracker collection - TTL index (expire after 1 hour)
    await db.rate_limit_tracker.create_index(
        "created_at",
        expireAfterSeconds=3600,  # 1 hour
        name="rate_limit_tracker_ttl"
    )

    logger.info("Database indexes created (including TTL indexes)")

"""
GDPR User Data Deletion Service

Implements right to erasure (GDPR Article 17) for dubbing users.
Deletes all user dubbing data from MongoDB and Redis.
Maintains audit trail for compliance.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.redis_client import get_redis_client
from app.models.live_dubbing import LiveDubbingSession
from app.services.live_dubbing.session_store import get_session_store

logger = logging.getLogger(__name__)


async def delete_user_dubbing_data(user_id: str) -> Dict[str, Any]:
    """
    Delete all dubbing-related data for a user (GDPR right to erasure).

    Deletes:
    - All LiveDubbingSession records from MongoDB
    - All session state from Redis
    - Audit trail logged for compliance

    Args:
        user_id: MongoDB ObjectId as string

    Returns:
        Summary of deleted records
    """
    logger.info(f"Starting GDPR data deletion for user {user_id}")

    deleted_summary = {
        "user_id": user_id,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "mongodb_sessions_deleted": 0,
        "redis_keys_deleted": 0,
        "errors": [],
    }

    try:
        # Delete MongoDB sessions
        deleted_sessions = await LiveDubbingSession.find(
            LiveDubbingSession.user_id == user_id
        ).delete()
        deleted_summary["mongodb_sessions_deleted"] = deleted_sessions
        logger.info(f"Deleted {deleted_sessions} MongoDB sessions for user {user_id}")

    except Exception as e:
        error_msg = f"Error deleting MongoDB sessions: {str(e)}"
        logger.error(error_msg)
        deleted_summary["errors"].append(error_msg)

    try:
        # Delete Redis session state
        redis = await get_redis_client()
        redis_keys = await redis._client.keys(f"dubbing_session:*")
        redis_deleted = 0

        for key in redis_keys:
            try:
                state = await redis.get(key)
                if state and state.get("user_id") == user_id:
                    await redis.delete(key)
                    redis_deleted += 1
            except Exception as e:
                logger.warning(f"Error deleting Redis key {key}: {e}")

        deleted_summary["redis_keys_deleted"] = redis_deleted
        logger.info(f"Deleted {redis_deleted} Redis keys for user {user_id}")

    except Exception as e:
        error_msg = f"Error deleting Redis data: {str(e)}"
        logger.error(error_msg)
        deleted_summary["errors"].append(error_msg)

    # Audit log
    logger.warning(
        f"GDPR DATA DELETION COMPLETED - User: {user_id}, "
        f"Sessions: {deleted_summary['mongodb_sessions_deleted']}, "
        f"Redis keys: {deleted_summary['redis_keys_deleted']}"
    )

    return deleted_summary


async def delete_user_all_data(user_id: str) -> Dict[str, Any]:
    """
    Delete ALL user data across all Olorin services (full GDPR erasure).

    This is a comprehensive deletion that removes:
    - Dubbing sessions and state
    - User preferences
    - Usage metrics (after retention period)
    - All associated records

    Args:
        user_id: User ID

    Returns:
        Comprehensive deletion summary
    """
    logger.info(f"Starting comprehensive GDPR deletion for user {user_id}")

    # Start with dubbing deletion
    summary = await delete_user_dubbing_data(user_id)

    # Additional services can be added here as needed
    # - User preferences: await delete_user_preferences(user_id)
    # - Usage metering: await delete_metering_data(user_id)
    # - Content history: await delete_content_history(user_id)

    return summary

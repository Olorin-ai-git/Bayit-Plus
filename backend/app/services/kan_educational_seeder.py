"""
Kan Educational Channel Seeder

Seeds the LiveChannel document for Kan Educational TV (כאן חינוכית)
as a YouTube-based on-demand channel with synchronized TV-like experience.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.core.config import settings
from app.models.content import LiveChannel
from app.services.kan_channel_import_service import kan_channel_import_service
from app.services.youtube_epg_sync_service import youtube_epg_sync_service

logger = logging.getLogger(__name__)


async def seed_kan_educational_channel() -> Dict[str, Any]:
    """
    Seed the Kan Educational TV LiveChannel document.

    Returns:
        Dictionary with channel ID and status.
    """
    # Check if channel already exists
    existing = await LiveChannel.find_one(
        {"youtube_channel_id": settings.KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID}
    )

    if existing:
        logger.info(f"Kan Educational channel already exists: {existing.id}")
        return {
            "status": "exists",
            "channel_id": str(existing.id),
            "message": "Kan Educational channel already exists",
        }

    # Create the LiveChannel document
    channel = LiveChannel(
        name="כאן חינוכית",
        name_en="Kan Educational",
        name_es="Kan Educativo",
        description="ערוץ חינוכי ישראלי עם תוכניות מתמטיקה, מדעים וחינוך",
        description_en="Israeli educational channel - math, science, and learning",
        description_es="Canal educativo israelí - matemáticas, ciencia y aprendizaje",
        category="educational",
        culture_id="israeli",
        # Initial stream URL (will be updated by EPG sync)
        stream_url="https://www.youtube.com/embed/P-uaYiR4Pe0",
        stream_type="youtube-playlist",
        # YouTube channel configuration
        youtube_channel_id=settings.KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID,
        epg_sync_interval_minutes=settings.KAN_EDUCATIONAL_EPG_SYNC_INTERVAL_MINUTES,
        # Attribution (required for YouTube TOS compliance)
        attribution_text="תוכן בשידור באדיבות כאן - תאגיד השידור הישראלי",
        attribution_text_en="Streaming content provided by Kan - Israeli Public Broadcasting Corp.",
        # AI Enhancement
        is_ai_enhanced=True,
        ai_features=["vocabulary", "context", "quiz", "translation"],
        # Widget support
        supports_pip_widget=True,
        # Live features not supported for YouTube
        supports_live_subtitles=False,
        supports_live_dubbing=False,
        # Visibility
        is_active=True,
        order=100,  # After regular live channels
        requires_subscription="basic",
        # Timestamps
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    await channel.insert()
    logger.info(f"Created Kan Educational channel: {channel.id}")

    return {
        "status": "created",
        "channel_id": str(channel.id),
        "message": "Kan Educational channel created successfully",
    }


async def seed_and_import_kan_educational(
    max_videos: int = 500,
    force_reimport: bool = False,
) -> Dict[str, Any]:
    """
    Full setup: Seed channel, import content, and sync EPG.

    Args:
        max_videos: Maximum videos to import from YouTube
        force_reimport: Re-import even if content exists

    Returns:
        Combined results from all operations.
    """
    results: Dict[str, Any] = {"steps": []}

    # Step 1: Seed the channel
    try:
        seed_result = await seed_kan_educational_channel()
        results["steps"].append({"step": "seed_channel", "result": seed_result})
        results["channel_id"] = seed_result.get("channel_id")
    except Exception as e:
        logger.error(f"Failed to seed Kan Educational channel: {e}")
        results["steps"].append({"step": "seed_channel", "error": str(e)})
        return results

    # Step 2: Import YouTube content
    try:
        import_result = await kan_channel_import_service.import_channel_content(
            max_videos=max_videos,
            force_reimport=force_reimport,
        )
        results["steps"].append({"step": "import_content", "result": import_result})
        results["imported"] = import_result.get("imported", 0)
    except Exception as e:
        logger.error(f"Failed to import Kan content: {e}")
        results["steps"].append({"step": "import_content", "error": str(e)})

    # Step 3: Sync EPG schedule
    if results.get("channel_id"):
        try:
            epg_result = await youtube_epg_sync_service.sync_channel_epg(
                results["channel_id"]
            )
            results["steps"].append({"step": "sync_epg", "result": epg_result})
        except Exception as e:
            logger.error(f"Failed to sync EPG: {e}")
            results["steps"].append({"step": "sync_epg", "error": str(e)})

    results["success"] = all(
        "error" not in step for step in results["steps"]
    )

    return results


async def get_or_create_kan_educational_channel() -> Optional[LiveChannel]:
    """
    Get the Kan Educational channel, creating it if it doesn't exist.

    Returns:
        LiveChannel document or None if creation fails.
    """
    # Try to find existing channel
    channel = await LiveChannel.find_one(
        {"youtube_channel_id": settings.KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID}
    )

    if channel:
        return channel

    # Create if not exists
    result = await seed_kan_educational_channel()
    if result.get("channel_id"):
        return await LiveChannel.get(result["channel_id"])

    return None

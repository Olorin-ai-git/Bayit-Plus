"""
Subtitle Preferences API Routes
Manage user's preferred subtitle language for each content item.
"""

import logging
from datetime import datetime, timezone

from app.core.security import get_current_active_user
from app.models.subtitle_preferences import SubtitlePreference
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/preferences/{content_id}")
async def get_subtitle_preference(
    content_id: str, current_user: User = Depends(get_current_active_user)
):
    """
    Get user's preferred subtitle language for a specific content item.

    Returns the language code (e.g., "en", "he") or null if no preference set.
    Priority: User preference > Hebrew > English
    """
    try:
        # Look up user's preference for this content
        preference = await SubtitlePreference.find_one(
            SubtitlePreference.user_id == str(current_user.id),
            SubtitlePreference.content_id == content_id,
        )

        if preference:
            return {
                "content_id": content_id,
                "preferred_language": preference.preferred_language,
                "last_used_at": preference.last_used_at,
            }

        # No preference set - return defaults in priority order
        return {
            "content_id": content_id,
            "preferred_language": None,  # Will use fallback: he > en
            "fallback_order": ["he", "en"],
        }

    except Exception as e:
        logger.error(f"Error fetching subtitle preference: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to fetch subtitle preference"
        )


@router.post("/preferences/{content_id}")
async def set_subtitle_preference(
    content_id: str,
    language: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Set user's preferred subtitle language for a specific content item.

    Args:
        content_id: Content ID
        language: ISO 639-1 language code (e.g., "en", "he", "es")
    """
    try:
        # Validate language code (basic validation)
        if not language or len(language) < 2:
            raise HTTPException(status_code=400, detail="Invalid language code")

        # Check if preference already exists
        existing = await SubtitlePreference.find_one(
            SubtitlePreference.user_id == str(current_user.id),
            SubtitlePreference.content_id == content_id,
        )

        if existing:
            # Update existing preference
            existing.preferred_language = language
            existing.updated_at = datetime.now(timezone.utc)
            existing.last_used_at = datetime.now(timezone.utc)
            await existing.save()

            logger.info(
                f"Updated subtitle preference for user {current_user.id}, content {content_id}: {language}"
            )

            return {
                "status": "updated",
                "content_id": content_id,
                "preferred_language": language,
            }
        else:
            # Create new preference
            preference = SubtitlePreference(
                user_id=str(current_user.id),
                content_id=content_id,
                preferred_language=language,
            )
            await preference.insert()

            logger.info(
                f"Created subtitle preference for user {current_user.id}, content {content_id}: {language}"
            )

            return {
                "status": "created",
                "content_id": content_id,
                "preferred_language": language,
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting subtitle preference: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to set subtitle preference")


@router.delete("/preferences/{content_id}")
async def delete_subtitle_preference(
    content_id: str, current_user: User = Depends(get_current_active_user)
):
    """
    Delete user's subtitle preference for a specific content item.
    After deletion, system will use default fallback (Hebrew > English).
    """
    try:
        preference = await SubtitlePreference.find_one(
            SubtitlePreference.user_id == str(current_user.id),
            SubtitlePreference.content_id == content_id,
        )

        if not preference:
            raise HTTPException(status_code=404, detail="Preference not found")

        await preference.delete()

        logger.info(
            f"Deleted subtitle preference for user {current_user.id}, content {content_id}"
        )

        return {
            "status": "deleted",
            "content_id": content_id,
            "message": "Preference deleted. Will use default fallback (Hebrew > English)",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting subtitle preference: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to delete subtitle preference"
        )


@router.get("/preferences")
async def get_all_preferences(current_user: User = Depends(get_current_active_user)):
    """
    Get all subtitle preferences for the current user.
    Useful for syncing preferences across devices.
    """
    try:
        preferences = await SubtitlePreference.find(
            SubtitlePreference.user_id == str(current_user.id)
        ).to_list()

        return {
            "preferences": [
                {
                    "content_id": pref.content_id,
                    "preferred_language": pref.preferred_language,
                    "last_used_at": pref.last_used_at,
                }
                for pref in preferences
            ],
            "total": len(preferences),
        }

    except Exception as e:
        logger.error(f"Error fetching all preferences: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch preferences")

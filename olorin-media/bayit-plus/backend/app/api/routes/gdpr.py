"""
GDPR Compliance Endpoints

Implements GDPR rights for users:
- Right to erasure (Article 17)
- Data access requests
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.models.user import User
from app.services.gdpr.user_data_deletion import delete_user_all_data

router = APIRouter(prefix="/api/v1/gdpr", tags=["gdpr"])
logger = logging.getLogger(__name__)


@router.delete("/users/me/data")
async def delete_my_data(current_user: User = Depends(get_current_user)):
    """
    Delete all personal data for current user (GDPR right to erasure).

    This endpoint permanently deletes:
    - All dubbing sessions
    - Session state and preferences
    - Usage metrics (after retention period)

    Returns:
        Deletion summary and confirmation
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        logger.info(f"Processing GDPR deletion request for user {current_user.id}")

        result = await delete_user_all_data(str(current_user.id))

        # Log for audit trail
        logger.warning(
            f"GDPR deletion confirmed - User: {current_user.id}, " f"Result: {result}"
        )

        return {
            "status": "success",
            "message": "Your data has been scheduled for deletion",
            "summary": result,
            "completionTime": "24 hours",
        }

    except Exception as e:
        logger.error(f"Error processing GDPR deletion: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to process data deletion request"
        )


@router.get("/users/me/data-summary")
async def get_data_summary(current_user: User = Depends(get_current_user)):
    """
    Get summary of user data stored in the system.

    Returns what data is stored about the user (for data access requests).
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from app.models.live_dubbing import LiveDubbingSession

        # Count dubbing sessions
        session_count = await LiveDubbingSession.find(
            LiveDubbingSession.user_id == str(current_user.id)
        ).count()

        return {
            "status": "success",
            "user_id": str(current_user.id),
            "data_stored": {
                "dubbing_sessions": session_count,
                "categories": [
                    "Dubbing sessions and transcripts",
                    "Session state and preferences",
                    "Usage metrics and analytics",
                ],
            },
            "last_activity": current_user.last_login,
            "deletion_request_available": True,
        }

    except Exception as e:
        logger.error(f"Error retrieving data summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve data summary")

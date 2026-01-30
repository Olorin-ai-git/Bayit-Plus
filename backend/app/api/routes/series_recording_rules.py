"""
Series Recording Rules API Routes
Endpoints for managing series recording rules
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.models.user import User

from .series_rule_models import (
    CreateSeriesRuleRequest,
    SeriesRuleResponse,
    UpdateSeriesRuleRequest,
    rule_to_response,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Ensure user has premium access."""
    if not current_user.can_access_premium_features():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for series recording rules",
        )
    return current_user


@router.post("/rules", response_model=SeriesRuleResponse)
async def create_series_rule(
    request: CreateSeriesRuleRequest,
    current_user: User = Depends(_get_premium_user),
):
    """Create a new series recording rule."""
    try:
        from app.services.series_recording_rule_service import (
            series_recording_rule_service,
        )

        rule = await series_recording_rule_service.create_rule(
            user_id=str(current_user.id),
            rule_name=request.rule_name,
            match_title=request.match_title,
            match_type=request.match_type,
            scope=request.scope,
            channel_ids=request.channel_ids,
            subtitle_enabled=request.subtitle_enabled,
            subtitle_target_language=request.subtitle_target_language,
            dubbing_enabled=request.dubbing_enabled,
            dubbing_target_language=request.dubbing_target_language,
            max_recordings=request.max_recordings,
        )
        return rule_to_response(rule)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to create series rule",
            extra={"user_id": str(current_user.id), "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create series rule",
        )


@router.get("/rules", response_model=list[SeriesRuleResponse])
async def list_series_rules(
    current_user: User = Depends(get_current_active_user),
):
    """List user's series recording rules."""
    try:
        from app.services.series_recording_rule_service import (
            series_recording_rule_service,
        )

        rules = await series_recording_rule_service.list_rules(str(current_user.id))
        return [rule_to_response(r) for r in rules]

    except Exception as e:
        logger.error(
            "Failed to list series rules",
            extra={"user_id": str(current_user.id), "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list series rules",
        )


@router.put("/rules/{rule_id}", response_model=SeriesRuleResponse)
async def update_series_rule(
    rule_id: str,
    request: UpdateSeriesRuleRequest,
    current_user: User = Depends(_get_premium_user),
):
    """Update a series recording rule."""
    try:
        from app.services.series_recording_rule_service import (
            series_recording_rule_service,
        )

        updates = request.model_dump(exclude_none=True)
        rule = await series_recording_rule_service.update_rule(
            rule_id=rule_id, user_id=str(current_user.id), updates=updates
        )
        return rule_to_response(rule)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to update series rule",
            extra={"rule_id": rule_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update series rule",
        )


@router.delete("/rules/{rule_id}")
async def delete_series_rule(
    rule_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a series recording rule and cancel pending schedules."""
    try:
        from app.services.series_recording_rule_service import (
            series_recording_rule_service,
        )

        await series_recording_rule_service.delete_rule(
            rule_id=rule_id, user_id=str(current_user.id)
        )
        return {"message": "Series rule deleted successfully"}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to delete series rule",
            extra={"rule_id": rule_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete series rule",
        )

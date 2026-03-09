"""Onboarding feature discovery tour API routes."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.user import User
from app.services.onboarding_tour_service import onboarding_tour_service

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response models

class UpdateTourStateRequest(BaseModel):
    platform: str
    current_card_index: Optional[int] = None
    card_viewed: Optional[str] = None
    demo_tapped: Optional[str] = None
    language: Optional[str] = None


class CompleteTourRequest(BaseModel):
    platform: str
    tour_version: int
    preferences: Optional[dict] = None


class SkipTourRequest(BaseModel):
    platform: str
    last_card_viewed: Optional[str] = None


class TourAnalyticsEvent(BaseModel):
    event_type: str
    platform: str
    feature_key: Optional[str] = None
    card_index: Optional[int] = None
    time_on_card_ms: Optional[int] = None
    session_duration_ms: Optional[int] = None


# Endpoints

@router.get("/tour/state")
async def get_tour_state(
    current_user: User = Depends(get_current_user),
):
    """Get the user's onboarding tour state."""
    state = await onboarding_tour_service.get_state(current_user)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tour state exists for this user",
        )
    return state


@router.put("/tour/state")
async def update_tour_state(
    request: UpdateTourStateRequest,
    current_user: User = Depends(get_current_user),
):
    """Update the user's onboarding tour progress."""
    valid_platforms = {"ios", "tvos", "android", "android_tv"}
    if request.platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid platform. Must be one of: {valid_platforms}",
        )
    return await onboarding_tour_service.update_state(
        user=current_user,
        platform=request.platform,
        current_card_index=request.current_card_index,
        card_viewed=request.card_viewed,
        demo_tapped=request.demo_tapped,
        language=request.language,
    )


@router.post("/tour/complete")
async def complete_tour(
    request: CompleteTourRequest,
    current_user: User = Depends(get_current_user),
):
    """Mark the tour as completed and save preferences."""
    return await onboarding_tour_service.complete_tour(
        user=current_user,
        platform=request.platform,
        tour_version=request.tour_version,
        preferences=request.preferences,
    )


@router.post("/tour/skip")
async def skip_tour(
    request: SkipTourRequest,
    current_user: User = Depends(get_current_user),
):
    """Skip the onboarding tour."""
    return await onboarding_tour_service.skip_tour(
        user=current_user,
        platform=request.platform,
        last_card_viewed=request.last_card_viewed,
    )


@router.get("/tour/cards")
async def get_feature_cards(
    platform: str,
    since_version: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """Get available feature cards for the current user."""
    valid_platforms = {"ios", "tvos", "android", "android_tv"}
    if platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid platform. Must be one of: {valid_platforms}",
        )
    return onboarding_tour_service.get_available_cards(
        platform=platform,
        since_version=since_version,
    )


@router.post("/tour/analytics", status_code=status.HTTP_202_ACCEPTED)
async def track_tour_event(
    event: TourAnalyticsEvent,
    current_user: User = Depends(get_current_user),
):
    """Track an onboarding tour analytics event."""
    await onboarding_tour_service.track_event(
        user=current_user,
        event_data=event.model_dump(),
    )

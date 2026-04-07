"""
Demo Portal Lead Tracking Routes

Endpoints for demo.olorin.ai that record visitor registrations and
tour-stop completions for sales follow-up.

Routes:
  POST /api/v1/demo/track-user      — upsert demo visitor on first sign-in
  POST /api/v1/demo/track-progress  — append tour-stop completion event
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.routes.demo_proxy_schemas import (TrackProgressRequest,
                                               TrackStatusResponse,
                                               TrackUserRequest)
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.services import demo_usage_service

logger = get_logger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post(
    "/track-user",
    response_model=TrackStatusResponse,
    summary="Record demo visitor on first sign-in (Firebase-authed)",
)
async def track_demo_user(
    request: TrackUserRequest,
    user: User = Depends(get_current_user),
) -> TrackStatusResponse:
    """
    Upsert demo visitor metadata onto the authenticated user document.

    - Sets UTM attribution fields and last_demo_visit on every call.
    - Sets first_demo_visit only when it has not been recorded yet
      (using $setOnInsert equivalent via conditional $set).
    """
    now = datetime.now(timezone.utc)

    set_fields: dict = {
        "demo_utm_source": request.utm_source,
        "demo_utm_medium": request.utm_medium,
        "demo_utm_campaign": request.utm_campaign,
        "demo_provider": request.provider,
        "last_demo_visit": now,
        "updated_at": now,
    }

    # Only write first_demo_visit if it is not already present.
    # $setOnInsert only fires on insert; we simulate the conditional
    # by using get() on the live doc instead.
    if not getattr(user, "first_demo_visit", None):
        set_fields["first_demo_visit"] = now

    await user.update({"$set": set_fields})

    logger.info(
        "Demo visitor tracked",
        extra={
            "user_id": str(user.id),
            "utm_source": request.utm_source,
            "utm_campaign": request.utm_campaign,
        },
    )

    return TrackStatusResponse(status="ok")


@router.post(
    "/track-progress",
    response_model=TrackStatusResponse,
    summary="Append tour-stop completion event (Firebase-authed)",
)
async def track_demo_progress(
    request: TrackProgressRequest,
    user: User = Depends(get_current_user),
) -> TrackStatusResponse:
    """
    Append a completed tour-stop record to the user's demo_progress array.

    Each entry: { stop_id, time_spent_seconds, completed_at }.
    """
    now = datetime.now(timezone.utc)

    progress_entry = {
        "stop_id": request.stop_id,
        "time_spent_seconds": request.time_spent_seconds,
        "completed_at": now,
    }

    await user.update({
        "$push": {"demo_progress": progress_entry},
        "$set": {"updated_at": now},
    })

    logger.info(
        "Demo tour stop completed",
        extra={
            "user_id": str(user.id),
            "stop_id": request.stop_id,
            "time_spent_seconds": request.time_spent_seconds,
        },
    )

    return TrackStatusResponse(status="ok")


@router.get(
    "/usage",
    summary="Get remaining AI feature uses for the current demo user",
)
async def get_demo_usage(
    user: User = Depends(get_current_user),
) -> dict:
    """Return per-feature usage counts and remaining allowance."""
    return await demo_usage_service.get_usage(str(user.id))

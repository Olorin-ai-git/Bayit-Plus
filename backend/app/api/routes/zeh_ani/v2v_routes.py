"""Zeh Ani V2V Voice Transform REST API endpoints."""

import base64

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.biometric_consent import BiometricConsentType
from app.models.child_avatar import ChildAvatar
from app.models.user import User
from app.models.v2v_session import V2VSession
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)
from app.services.zeh_ani.v2v_transform_service import v2v_transform_service

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/v2v", tags=["zeh-ani"])


class V2VTransformRequest(BaseModel):
    """Request for one-shot V2V transform (REST fallback)."""

    avatar_id: str
    profile_id: str
    audio_base64: str = Field(..., description="Base64-encoded audio data")
    target_phrase_he: str = Field(..., min_length=1)


@router.post("/transform")
async def transform_voice(
    request: V2VTransformRequest,
    user: User = Depends(get_current_user),
):
    """One-shot V2V transform via REST (fallback for non-WebSocket)."""
    avatar = await ChildAvatar.find_one(
        {"user_id": str(user.id), "profile_id": request.profile_id}
)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id),
        profile_id=request.profile_id,
        consent_type=BiometricConsentType.VOICE_V2V,
    )
    if not has_consent:
        raise HTTPException(
            status_code=403,
            detail="V2V voice consent required",
        )

    try:
        audio_data = base64.b64decode(request.audio_base64)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid base64 audio data",
        )

    session = await v2v_transform_service.get_or_create_session(
        user_id=str(user.id),
        profile_id=request.profile_id,
        avatar_id=str(avatar.id),
    )

    result = await v2v_transform_service.transform_voice(
        avatar=avatar,
        audio_data=audio_data,
        target_phrase_he=request.target_phrase_he,
        session=session,
    )

    return result


@router.get("/sessions/{profile_id}")
async def get_v2v_sessions(
    profile_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
):
    """Get V2V session history with improvement metrics."""
    sessions = (
        await V2VSession.find(
            {"user_id": str(user.id), "profile_id": profile_id}
)
        .sort(-V2VSession.created_at)
        .skip(offset)
        .limit(limit)
        .to_list()
    )

    total = await V2VSession.find(
        {"user_id": str(user.id), "profile_id": profile_id}
).count()

    return {
        "sessions": [
            {
                "id": str(s.id),
                "avatar_id": s.avatar_id,
                "total_transforms": s.total_transforms,
                "average_latency_ms": round(s.average_latency_ms),
                "score_improvement": round(s.score_improvement, 3),
                "credits_charged": s.credits_charged,
                "status": s.status.value,
                "created_at": s.created_at.isoformat(),
            }
            for s in sessions
        ],
        "total": total,
    }

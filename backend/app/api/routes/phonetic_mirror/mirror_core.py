"""Phonetic Mirror REST API endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from app.core.config import settings
from app.core.security import get_current_user
from app.models.phonetic_mirror_attempt import (
    MirrorSource,
    PhoneticMirrorAttempt,
)
from app.models.user import User
from app.services.phonetic_mirror.mirror_service import phonetic_mirror_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/phonetic-mirror/attempt")
async def submit_attempt(
    audio: UploadFile = File(...),
    target_phrase_he: str = Form(...),
    target_transliteration: str = Form(""),
    avatar_id: str = Form(...),
    profile_id: str = Form(...),
    source: str = Form("standalone"),
    user: User = Depends(get_current_user),
):
    """Submit audio recording for pronunciation scoring."""
    user_id = str(user.id)

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_count = await PhoneticMirrorAttempt.find(
        PhoneticMirrorAttempt.user_id == user_id,
        PhoneticMirrorAttempt.profile_id == profile_id,
        PhoneticMirrorAttempt.created_at >= today_start,
    ).count()

    if today_count >= settings.PERFECTED_VOICE_MAX_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail="Daily phonetic mirror limit reached",
        )

    audio_data = await audio.read()
    max_bytes = settings.PERFECTED_VOICE_MAX_AUDIO_SECONDS * 32000
    if len(audio_data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail="Audio recording exceeds maximum duration",
        )

    mirror_source = MirrorSource.STANDALONE
    if source == "mission_scene":
        mirror_source = MirrorSource.MISSION_SCENE
    elif source == "talk_back":
        mirror_source = MirrorSource.TALK_BACK

    result = await phonetic_mirror_service.process_mirror_attempt(
        user_id=user_id,
        profile_id=profile_id,
        avatar_id=avatar_id,
        audio_data=audio_data,
        target_phrase_he=target_phrase_he,
        target_transliteration=target_transliteration,
        source=mirror_source,
    )

    logger.info(
        "Phonetic mirror attempt submitted",
        extra={
            "user_id": user_id,
            "profile_id": profile_id,
            "score": result.pronunciation_score,
        },
    )

    return result


@router.get("/phonetic-mirror/phrases")
async def get_practice_phrases(
    profile_id: str,
    count: int = 5,
    difficulty: str = "medium",
    user: User = Depends(get_current_user),
):
    """Get practice phrases for the child's proficiency level."""
    return await phonetic_mirror_service.get_practice_phrases(
        user_id=str(user.id),
        profile_id=profile_id,
        count=min(count, 20),
        difficulty=difficulty,
    )


@router.get("/phonetic-mirror/history")
async def get_attempt_history(
    profile_id: str,
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    """Get phonetic mirror attempt history with average score."""
    return await phonetic_mirror_service.get_attempt_history(
        user_id=str(user.id),
        profile_id=profile_id,
        limit=min(limit, 100),
        offset=offset,
    )

"""Grandparent Bridge REST API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.models.grandparent_bridge import (
    NewsClip,
    NewsClipResponse,
    ShareLandingResponse,
)
from app.models.user import User
from app.services.grandparent_bridge.news_clip_service import (
    news_clip_service,
)
from app.services.grandparent_bridge.share_service import share_service
from app.services.grandparent_bridge.voice_note_service import (
    voice_note_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/grandparent-bridge",
    tags=["grandparent-bridge"],
)


class GenerateClipRequest(BaseModel):
    profile_id: str
    avatar_id: str
    session_summary: dict


class ShareClipRequest(BaseModel):
    recipient_name: str = ""
    recipient_phone_hash: str = ""
    language: str = "he"


class VerifyPinRequest(BaseModel):
    pin: str


def _clip_response(clip: NewsClip) -> dict:
    """Convert a NewsClip to API response dict."""
    return {
        "id": str(clip.id),
        "avatar_id": clip.avatar_id,
        "script_text": clip.script_text,
        "script_text_he": clip.script_text_he,
        "vocabulary_featured": clip.vocabulary_featured,
        "video_gcs_path": clip.video_gcs_path,
        "thumbnail_gcs_path": clip.thumbnail_gcs_path,
        "share_url": clip.share_url,
        "whatsapp_sent": clip.whatsapp_sent,
        "status": clip.status.value,
        "credits_charged": clip.credits_charged,
        "created_at": clip.created_at.isoformat(),
    }


@router.post("/generate-clip")
async def generate_clip(
    request: GenerateClipRequest,
    user: User = Depends(get_current_user),
):
    """Generate a news clip from a learning session."""
    try:
        clip = await news_clip_service.generate_news_clip(
            user_id=str(user.id),
            profile_id=request.profile_id,
            avatar_id=request.avatar_id,
            session_summary=request.session_summary,
        )
        return _clip_response(clip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/clips")
async def list_clips(
    profile_id: str,
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
):
    """List news clips for a profile."""
    clips = await news_clip_service.list_clips(
        user_id=str(user.id),
        profile_id=profile_id,
        limit=min(limit, 100),
        offset=offset,
    )
    return [_clip_response(c) for c in clips]


@router.post("/{clip_id}/share")
async def share_clip(
    clip_id: str,
    request: ShareClipRequest,
    user: User = Depends(get_current_user),
):
    """Share a clip and generate WhatsApp link."""
    clip = await NewsClip.get(clip_id)
    if not clip or clip.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Clip not found")

    if request.recipient_name:
        clip.recipient_name = request.recipient_name
    if request.recipient_phone_hash:
        clip.recipient_phone_hash = request.recipient_phone_hash

    whatsapp_link = share_service.generate_whatsapp_link(
        share_url=clip.share_url or "",
        child_name=request.recipient_name,
        language=request.language,
    )

    clip.whatsapp_sent = True
    await clip.save()

    return {
        "clip_id": str(clip.id),
        "share_url": clip.share_url,
        "whatsapp_link": whatsapp_link,
    }


@router.post("/{clip_id}/voice-note")
async def upload_voice_note(
    clip_id: str,
    audio: UploadFile = File(...),
    share_token: str = Form(...),
):
    """Upload a grandparent voice note (authenticated via share token)."""
    clip = await NewsClip.get(clip_id)
    if not clip or clip.share_token != share_token:
        raise HTTPException(status_code=403, detail="Invalid share token")

    audio_data = await audio.read()
    try:
        voice_note = await voice_note_service.process_voice_note(
            audio_data=audio_data,
            news_clip_id=clip_id,
            user_id=clip.user_id,
            profile_id=clip.profile_id,
        )
        return {
            "voice_note_id": str(voice_note.id),
            "duration": voice_note.duration,
            "transcript": voice_note.transcript,
            "detected_language": voice_note.detected_language,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/share/{share_token}")
async def get_share_landing(share_token: str):
    """Public share landing page (no auth required)."""
    try:
        return await share_service.create_share_landing(share_token)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/share/{share_token}/verify-pin")
async def verify_pin(
    share_token: str,
    request: VerifyPinRequest,
):
    """Verify family PIN for share access (no auth required)."""
    try:
        is_valid = await share_service.verify_share_pin(
            share_token=share_token, pin=request.pin,
        )
        return {"verified": is_valid}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

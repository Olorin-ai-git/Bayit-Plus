"""
Admin REST API endpoints for voice management
Configuration, library, analytics, quotas, billing, and settings
"""

import base64
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.routes.admin.auth import has_permission, log_audit
from app.models.admin import AuditAction, Permission
from app.models.live_feature_quota import LiveFeatureQuota
from app.models.user import User
from app.services.live_feature_quota_service import LiveFeatureQuotaService
from app.services.voice_management_service import VoiceManagementService

router = APIRouter(
    prefix="/admin/voice-management", tags=["Admin - Voice Management"]
)
logger = logging.getLogger(__name__)


# ============ REQUEST/RESPONSE MODELS ============


class VoiceConfigUpdate(BaseModel):
    """Update voice configuration"""

    config_key: str
    config_value: str
    config_type: str = "setting"
    language: Optional[str] = None
    platform: Optional[str] = None
    description: Optional[str] = None


class VoiceTestRequest(BaseModel):
    """Test voice with sample text"""

    voice_id: str
    text: str = "Hello, this is a voice test."
    language: str = "en"


class VoiceAssignRequest(BaseModel):
    """Assign voice to role"""

    voice_id: str
    role: str  # default, assistant, support
    language: Optional[str] = None


class QuotaDefaultsUpdate(BaseModel):
    """Update tier-based quota defaults"""

    tier: str  # basic, premium, family
    subtitle_minutes_per_hour: Optional[int] = None
    subtitle_minutes_per_day: Optional[int] = None
    subtitle_minutes_per_month: Optional[int] = None
    dubbing_minutes_per_hour: Optional[int] = None
    dubbing_minutes_per_day: Optional[int] = None
    dubbing_minutes_per_month: Optional[int] = None


class UserQuotaUpdate(BaseModel):
    """Override individual user quota"""

    subtitle_minutes_per_hour: Optional[int] = None
    subtitle_minutes_per_day: Optional[int] = None
    subtitle_minutes_per_month: Optional[int] = None
    dubbing_minutes_per_hour: Optional[int] = None
    dubbing_minutes_per_day: Optional[int] = None
    dubbing_minutes_per_month: Optional[int] = None
    notes: Optional[str] = None


class CostRatesUpdate(BaseModel):
    """Update cost rates for billing calculations"""

    stt_cost_per_second: Optional[float] = None
    translation_cost_per_1k_chars: Optional[float] = None
    tts_cost_per_second: Optional[float] = None


# ============ CONFIGURATION ENDPOINTS ============


@router.get("/config")
async def get_voice_config(
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get merged voice configuration (settings + DB overrides)"""
    try:
        config = await VoiceManagementService.get_merged_configuration()
        return {"success": True, "config": config}
    except Exception as e:
        logger.error(f"Error fetching voice config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/config")
async def update_voice_config(
    update: VoiceConfigUpdate,
    current_user: User = Depends(has_permission(Permission.VOICE_CONFIG)),
):
    """Update voice configuration (creates DB override)"""
    try:
        config = await VoiceManagementService.update_configuration(
            config_key=update.config_key,
            config_value=update.config_value,
            admin_id=str(current_user.id),
            config_type=update.config_type,
            language=update.language,
            platform=update.platform,
            description=update.description,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.SYSTEM_CONFIG_CHANGED,
            resource_type="voice_config",
            resource_id=str(config.id),
            details={
                "config_key": update.config_key,
                "config_value": update.config_value,
            },
        )

        return {"success": True, "config": config}
    except Exception as e:
        logger.error(f"Error updating voice config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config/test")
async def test_voice(
    request: VoiceTestRequest,
    current_user: User = Depends(has_permission(Permission.VOICE_TEST)),
):
    """Generate test audio for a voice"""
    try:
        audio_bytes = await VoiceManagementService.test_voice(
            voice_id=request.voice_id,
            text=request.text,
            language=request.language,
        )

        # Return base64 encoded audio
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "success": True,
            "audio_base64": audio_b64,
            "voice_id": request.voice_id,
            "text": request.text,
        }
    except Exception as e:
        logger.error(f"Error testing voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ VOICE LIBRARY ENDPOINTS ============


@router.get("/voices/available")
async def get_available_voices(
    language: Optional[str] = None,
    force_refresh: bool = False,
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get available voices from ElevenLabs"""
    try:
        voices = await VoiceManagementService.fetch_elevenlabs_voices(
            force_refresh
        )

        # Filter by language if specified
        if language:
            voices = [
                v
                for v in voices
                if language in v.get("labels", {}).get("language", "")
            ]

        return {"success": True, "voices": voices, "count": len(voices)}
    except Exception as e:
        logger.error(f"Error fetching voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices/{voice_id}/preview")
async def preview_voice(
    voice_id: str,
    text: str = "This is a preview of this voice.",
    language: str = "en",
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Generate preview audio for a voice"""
    try:
        audio_bytes = await VoiceManagementService.test_voice(
            voice_id, text, language
        )
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "success": True,
            "audio_base64": audio_b64,
            "voice_id": voice_id,
        }
    except Exception as e:
        logger.error(f"Error previewing voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voices/assign")
async def assign_voice_to_role(
    request: VoiceAssignRequest,
    current_user: User = Depends(has_permission(Permission.VOICE_CONFIG)),
):
    """Assign a voice to a role (default, assistant, support)"""
    try:
        config_key = f"{request.role}_voice_id"

        await VoiceManagementService.update_configuration(
            config_key=config_key,
            config_value=request.voice_id,
            admin_id=str(current_user.id),
            config_type="voice_id",
            language=request.language,
            description=f"Voice assignment for {request.role} role",
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.SYSTEM_CONFIG_CHANGED,
            resource_type="voice_assignment",
            resource_id=request.role,
            details={"voice_id": request.voice_id, "role": request.role},
        )

        return {
            "success": True,
            "role": request.role,
            "voice_id": request.voice_id,
        }
    except Exception as e:
        logger.error(f"Error assigning voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ ANALYTICS ENDPOINTS (Part 1) ============


@router.get("/analytics/realtime-sessions")
async def get_realtime_sessions(
    limit: int = 50,
    status: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get active/recent voice usage sessions"""
    try:
        sessions = await VoiceManagementService.get_realtime_sessions(
            limit, status
        )
        return {"success": True, "sessions": sessions, "count": len(sessions)}
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

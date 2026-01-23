"""
Voice Settings and Provider Management Endpoints
API keys status, health checks, provider configuration
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.admin.auth import has_permission
from app.core.config import settings
from app.models.admin import Permission
from app.models.user import User
from app.models.voice_config import VoiceProviderHealth
from app.services.voice_management_service import VoiceManagementService

router = APIRouter(
    prefix="/admin/voice-management/settings",
    tags=["Admin - Voice Settings"],
)
logger = logging.getLogger(__name__)


@router.get("/api-keys")
async def get_api_keys_status(
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """
    Get API keys configuration status (masked values)
    Never exposes actual API keys
    """
    try:
        def mask_key(key: str) -> str:
            if not key:
                return "NOT_CONFIGURED"
            return key[:8] + "..." + key[-4:] if len(key) > 12 else "***"

        status = {
            "elevenlabs": {
                "configured": bool(settings.ELEVENLABS_API_KEY),
                "masked_key": mask_key(settings.ELEVENLABS_API_KEY),
                "webhook_configured": bool(settings.ELEVENLABS_WEBHOOK_SECRET),
            },
            "openai": {
                "configured": bool(settings.OPENAI_API_KEY),
                "masked_key": mask_key(settings.OPENAI_API_KEY),
            },
            "google": {
                "configured": bool(settings.GOOGLE_API_KEY),
                "masked_key": mask_key(settings.GOOGLE_API_KEY),
            },
        }

        return {"success": True, "api_keys": status}
    except Exception as e:
        logger.error(f"Error fetching API keys status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/health-check")
async def run_health_check(
    provider: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.VOICE_TEST)),
):
    """
    Run health check for voice providers

    Args:
        provider: Specific provider to check (or all if None)
    """
    try:
        providers_to_check = (
            [provider] if provider else ["elevenlabs", "whisper", "google"]
        )

        results = {}
        for prov in providers_to_check:
            try:
                health = await VoiceManagementService.check_provider_health(
                    prov
                )
                results[prov] = health
            except Exception as e:
                logger.error(f"Health check failed for {prov}: {e}")
                results[prov] = {
                    "provider": prov,
                    "is_healthy": False,
                    "error_message": str(e),
                }

        return {"success": True, "results": results}
    except Exception as e:
        logger.error(f"Error running health checks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/provider-health")
async def get_provider_health_history(
    provider: Optional[str] = None,
    limit: int = 10,
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get provider health history from database"""
    try:
        query = {}
        if provider:
            query["provider"] = provider

        health_records = (
            await VoiceProviderHealth.find(query)
            .sort([("last_check_at", -1)])
            .limit(limit)
            .to_list()
        )

        return {
            "success": True,
            "health_records": [
                {
                    "provider": h.provider,
                    "is_healthy": h.is_healthy,
                    "last_check_at": h.last_check_at.isoformat(),
                    "last_success_at": (
                        h.last_success_at.isoformat()
                        if h.last_success_at
                        else None
                    ),
                    "last_failure_at": (
                        h.last_failure_at.isoformat()
                        if h.last_failure_at
                        else None
                    ),
                    "consecutive_failures": h.consecutive_failures,
                    "avg_latency_ms": h.avg_latency_ms,
                    "success_rate_24h": h.success_rate_24h,
                    "last_error_message": h.last_error_message,
                }
                for h in health_records
            ],
        }
    except Exception as e:
        logger.error(f"Error fetching provider health history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhooks")
async def get_webhook_configuration(
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get webhook configuration status"""
    try:
        webhook_config = {
            "elevenlabs": {
                "configured": bool(settings.ELEVENLABS_WEBHOOK_SECRET),
                "endpoint_url": f"{settings.API_BASE_URL}/webhooks/elevenlabs"
                if hasattr(settings, "API_BASE_URL")
                else "NOT_CONFIGURED",
            },
        }

        return {"success": True, "webhooks": webhook_config}
    except Exception as e:
        logger.error(f"Error fetching webhook config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/current-providers")
async def get_current_providers(
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get currently configured voice providers"""
    try:
        providers = {
            "speech_to_text": settings.SPEECH_TO_TEXT_PROVIDER,
            "translation": settings.LIVE_TRANSLATION_PROVIDER,
            "text_to_speech": "elevenlabs",  # Primary TTS provider
        }

        return {"success": True, "providers": providers}
    except Exception as e:
        logger.error(f"Error fetching current providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Health check endpoints for Bayit+ Backend.

Provides health status for monitoring systems and load balancers.

Endpoints:
- /health - Basic health check (backward compatible)
- /health/live - Liveness probe for container orchestration
- /health/ready - Readiness probe with DB connectivity check
- /health/deep - Comprehensive check of all services
- /health/live-translation - Legacy endpoint for translation services
"""

from app.core.config import settings
from app.core.health_checks import (
    HealthStatus,
    run_deep_health_check,
    run_liveness_check,
    run_readiness_check,
)
from fastapi import APIRouter, Response

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """
    Basic health check endpoint.

    Returns:
        Basic health status with app name.
    """
    return {"status": "healthy", "app": settings.APP_NAME}


@router.get("/health/live")
async def liveness_check() -> dict:
    """
    Liveness probe endpoint.

    Used by container orchestration (Kubernetes/Cloud Run) to determine
    if the application process is alive and should continue running.

    A failure here typically triggers a container restart.

    Returns:
        Simple health status.
    """
    return await run_liveness_check()


@router.get("/health/ready")
async def readiness_check(response: Response) -> dict:
    """
    Readiness probe endpoint.

    Used by load balancers to determine if this instance can receive traffic.
    Checks critical dependencies like database connectivity.

    A failure here removes the instance from the load balancer pool.

    Returns:
        Health status with service connectivity details.
    """
    result = await run_readiness_check()

    # Set appropriate status code
    if result["status"] != HealthStatus.HEALTHY.value:
        response.status_code = 503  # Service Unavailable

    return result


@router.get("/health/deep")
async def deep_health_check(response: Response) -> dict:
    """
    Deep health check endpoint.

    Performs comprehensive checks on all external dependencies including:
    - MongoDB database
    - Google Cloud Storage
    - Sentry error tracking
    - ElevenLabs API (if configured)

    This endpoint is more expensive than /health/ready and should be
    called less frequently (e.g., every 60 seconds).

    Returns:
        Comprehensive health status with all service details.
    """
    result = await run_deep_health_check()

    # Set appropriate status code
    if result["status"] == HealthStatus.UNHEALTHY.value:
        response.status_code = 503  # Service Unavailable
    elif result["status"] == HealthStatus.DEGRADED.value:
        response.status_code = 200  # Still OK, but degraded

    return result


@router.get("/health/live-translation")
async def live_translation_health_check() -> dict:
    """
    Health check for live translation services.

    Returns status of:
    - Speech-to-text provider (Google, Whisper, or ElevenLabs)
    - Translation provider (Google, OpenAI, or Claude)
    """
    from app.services.live_translation_service import (
        ANTHROPIC_AVAILABLE,
        ELEVENLABS_AVAILABLE,
        GOOGLE_AVAILABLE,
        OPENAI_AVAILABLE,
    )

    stt_provider = settings.SPEECH_TO_TEXT_PROVIDER
    translation_provider = settings.LIVE_TRANSLATION_PROVIDER

    # Check provider availability
    stt_available = False
    if stt_provider == "google":
        stt_available = GOOGLE_AVAILABLE
    elif stt_provider == "whisper":
        stt_available = OPENAI_AVAILABLE
    elif stt_provider == "elevenlabs":
        stt_available = ELEVENLABS_AVAILABLE

    translation_available = False
    if translation_provider == "google":
        translation_available = GOOGLE_AVAILABLE
    elif translation_provider == "openai":
        translation_available = OPENAI_AVAILABLE
    elif translation_provider == "claude":
        translation_available = ANTHROPIC_AVAILABLE

    healthy = stt_available and translation_available

    return {
        "status": "healthy" if healthy else "degraded",
        "stt_provider": stt_provider,
        "stt_available": stt_available,
        "translation_provider": translation_provider,
        "translation_available": translation_available,
        "providers": {
            "google_cloud": GOOGLE_AVAILABLE,
            "openai": OPENAI_AVAILABLE,
            "elevenlabs": ELEVENLABS_AVAILABLE,
            "anthropic": ANTHROPIC_AVAILABLE,
        },
    }

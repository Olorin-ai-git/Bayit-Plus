"""
Olorin.ai Platform API Routes

API endpoints for third-party integration:
- /olorin/v1/partner - Partner management
- /olorin/v1/dubbing - Realtime dubbing
- /olorin/v1/search - Semantic search
- /olorin/v1/context - Cultural context
- /olorin/v1/recap - Recap agent
- /olorin/v1/webhooks - Webhook management
- /olorin/v1/videos - Video ingest + Pause & Ask
- /olorin/v1/subtitles - AI subtitle generation
- /olorin/v1/trivia - Trivia generation + embed
"""

from fastapi import APIRouter, status
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.api.routes.olorin.b2b_pause_ask import router as pause_ask_router
from app.api.routes.olorin.b2b_subtitles import router as subtitles_router
from app.api.routes.olorin.b2b_trivia import router as trivia_router
from app.api.routes.olorin.context import router as context_router
from app.api.routes.olorin.dubbing import router as dubbing_router
from app.api.routes.olorin.partner import router as partner_router
from app.api.routes.olorin.recap import router as recap_router
from app.api.routes.olorin.search import router as search_router
from app.api.routes.olorin.video_ingest import router as video_ingest_router
from app.api.routes.olorin.webhooks import router as webhooks_router
from app.core.config import settings

# Get API version from config
API_VERSION = settings.olorin.api_version

# Create main router with versioned prefix
router = APIRouter(prefix=f"/olorin/{API_VERSION}", tags=["olorin"])

# Include sub-routers
router.include_router(partner_router, prefix="/partner", tags=["olorin-partner"])
router.include_router(dubbing_router, prefix="/dubbing", tags=["olorin-dubbing"])
router.include_router(search_router, prefix="/search", tags=["olorin-search"])
router.include_router(context_router, prefix="/context", tags=["olorin-context"])
router.include_router(recap_router, prefix="/recap", tags=["olorin-recap"])
router.include_router(webhooks_router, prefix="/webhooks", tags=["olorin-webhooks"])
router.include_router(video_ingest_router, prefix="/videos", tags=["olorin-videos"])
router.include_router(pause_ask_router, prefix="/videos", tags=["olorin-pause-ask"])
router.include_router(subtitles_router, prefix="/subtitles", tags=["olorin-subtitles"])
router.include_router(trivia_router, prefix="/trivia", tags=["olorin-trivia"])


# Create redirect router for backward compatibility
legacy_router = APIRouter(prefix="/olorin", tags=["olorin-legacy"])


@legacy_router.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    include_in_schema=False,
)
async def redirect_legacy_routes(request: Request, path: str) -> RedirectResponse:
    """
    Redirect legacy /olorin/* routes to /olorin/v1/*.

    This provides a 6-month deprecation period for clients using old endpoints.
    Returns 308 Permanent Redirect to preserve the HTTP method.
    """
    # Build new URL with version prefix
    new_path = f"/olorin/{API_VERSION}/{path}"
    if request.url.query:
        new_path = f"{new_path}?{request.url.query}"

    return RedirectResponse(
        url=new_path,
        status_code=status.HTTP_308_PERMANENT_REDIRECT,
    )


# Vanity router for api.olorin.ai (paths: /v1/partner/*, /v1/dubbing/*, etc.)
# Mounted without the /api/v1/olorin prefix so portal-documented paths work.
vanity_router = APIRouter(prefix=f"/{API_VERSION}", tags=["olorin"])
vanity_router.include_router(partner_router, prefix="/partner", tags=["olorin-partner"])
vanity_router.include_router(dubbing_router, prefix="/dubbing", tags=["olorin-dubbing"])
vanity_router.include_router(search_router, prefix="/search", tags=["olorin-search"])
vanity_router.include_router(context_router, prefix="/context", tags=["olorin-context"])
vanity_router.include_router(recap_router, prefix="/recap", tags=["olorin-recap"])
vanity_router.include_router(webhooks_router, prefix="/webhooks", tags=["olorin-webhooks"])
vanity_router.include_router(video_ingest_router, prefix="/videos", tags=["olorin-videos"])
vanity_router.include_router(pause_ask_router, prefix="/videos", tags=["olorin-pause-ask"])
vanity_router.include_router(subtitles_router, prefix="/subtitles", tags=["olorin-subtitles"])
vanity_router.include_router(trivia_router, prefix="/trivia", tags=["olorin-trivia"])

__all__ = ["router", "legacy_router", "vanity_router"]

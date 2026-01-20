"""
Olorin.ai Platform API Routes

API endpoints for third-party integration:
- /olorin/v1/partner - Partner management
- /olorin/v1/dubbing - Realtime dubbing
- /olorin/v1/search - Semantic search
- /olorin/v1/context - Cultural context
- /olorin/v1/recap - Recap agent
- /olorin/v1/webhooks - Webhook management
"""

from fastapi import APIRouter, status
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.api.routes.olorin.partner import router as partner_router
from app.api.routes.olorin.dubbing import router as dubbing_router
from app.api.routes.olorin.search import router as search_router
from app.api.routes.olorin.context import router as context_router
from app.api.routes.olorin.recap import router as recap_router
from app.api.routes.olorin.webhooks import router as webhooks_router

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


__all__ = ["router", "legacy_router"]

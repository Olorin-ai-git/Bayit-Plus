"""
Olorin.ai Platform API Routes

API endpoints for third-party integration:
- /olorin/partner - Partner management
- /olorin/dubbing - Realtime dubbing
- /olorin/search - Semantic search
- /olorin/context - Cultural context
- /olorin/recap - Recap agent
- /olorin/webhooks - Webhook management
"""

from fastapi import APIRouter

from app.api.routes.olorin.partner import router as partner_router
from app.api.routes.olorin.dubbing import router as dubbing_router
from app.api.routes.olorin.search import router as search_router
from app.api.routes.olorin.context import router as context_router
from app.api.routes.olorin.recap import router as recap_router
from app.api.routes.olorin.webhooks import router as webhooks_router

# Create main router
router = APIRouter(prefix="/olorin", tags=["olorin"])

# Include sub-routers
router.include_router(partner_router, prefix="/partner", tags=["olorin-partner"])
router.include_router(dubbing_router, prefix="/dubbing", tags=["olorin-dubbing"])
router.include_router(search_router, prefix="/search", tags=["olorin-search"])
router.include_router(context_router, prefix="/context", tags=["olorin-context"])
router.include_router(recap_router, prefix="/recap", tags=["olorin-recap"])
router.include_router(webhooks_router, prefix="/webhooks", tags=["olorin-webhooks"])

__all__ = ["router"]

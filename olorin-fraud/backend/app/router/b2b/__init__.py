"""
B2B Partner Platform Routers.

API endpoints for the unified B2B partner platform.

Endpoint Groups:
- /api/v1/b2b/partner/ - Partner management
- /api/v1/b2b/auth/ - Partner authentication
- /api/v1/b2b/billing/ - Billing and subscriptions
- /api/v1/b2b/usage/ - Usage analytics
- /api/v1/b2b/capabilities/fraud/ - Fraud detection APIs
- /api/v1/b2b/capabilities/content/ - Content AI APIs
"""

from fastapi import APIRouter

# Main B2B router aggregator
b2b_router = APIRouter(prefix="/api/v1/b2b", tags=["B2B Platform"])


def configure_b2b_routes() -> APIRouter:
    """
    Configure and return the main B2B router with all sub-routers included.

    Returns:
        APIRouter: Configured B2B router with all sub-routers
    """
    from app.router.b2b.auth_router import router as auth_router
    from app.router.b2b.partner_router import router as partner_router
    from app.router.b2b.billing_router import router as billing_router
    from app.router.b2b.usage_router import router as usage_router
    from app.router.b2b.capabilities.fraud_router import router as fraud_router
    from app.router.b2b.capabilities.content_router import router as content_router

    # Include sub-routers
    b2b_router.include_router(auth_router)
    b2b_router.include_router(partner_router)
    b2b_router.include_router(billing_router)
    b2b_router.include_router(usage_router)
    b2b_router.include_router(fraud_router)
    b2b_router.include_router(content_router)

    return b2b_router


__all__ = ["b2b_router", "configure_b2b_routes"]

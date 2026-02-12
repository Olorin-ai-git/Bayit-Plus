"""Talk Back routes."""

from app.api.routes.talk_back.talk_back_admin import router as admin_router
from app.api.routes.talk_back.talk_back_core import router as core_router
from app.api.routes.talk_back.talk_back_dashboard import (
    router as dashboard_router,
)

__all__ = ["admin_router", "core_router", "dashboard_router"]

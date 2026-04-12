"""Training platform API routes."""

from fastapi import APIRouter

from app.api.routes.training.auth import router as auth_router
from app.api.routes.training.content import router as content_router
from app.api.routes.training.content_enrichment import router as content_enrichment_router
from app.api.routes.training.content_retry import router as content_retry_router
from app.api.routes.training.content_edit import router as content_edit_router
from app.api.routes.training.password_reset import router as password_reset_router
from app.api.routes.training.team import router as team_router
from app.api.routes.training.progress import router as progress_router
from app.api.routes.training.assignments import router as assignments_router
from app.api.routes.training.settings import router as settings_router
from app.api.routes.training.byoc import router as byoc_router
from app.api.routes.training.party import router as party_router
from app.api.routes.training.pause_ask import router as pause_ask_router
from app.api.routes.training.checkout import router as checkout_router
from app.api.routes.training.comprehension_reports import (
    router as comprehension_reports_router,
)
from app.api.routes.training.pilot_metrics import (
    router as pilot_metrics_router,
)
from app.api.routes.training.exports import router as exports_router
from app.api.routes.training.scorm_interact import (
    router as scorm_interact_router,
)
from app.api.routes.training.onboarding import router as onboarding_router
from app.api.routes.training.analytics_export import (
    router as analytics_export_router,
)
from app.api.routes.training.portraits import router as portraits_router
from app.api.routes.training.companion import router as companion_router
from app.api.routes.training.superadmin import (
    public_router as config_router,
    router as superadmin_router,
)
from app.api.routes.training.source_connections import (
    router as source_connections_router,
)

router = APIRouter(prefix="/training")

router.include_router(auth_router)
router.include_router(password_reset_router)
router.include_router(content_router)
router.include_router(content_enrichment_router)
router.include_router(content_retry_router)
router.include_router(content_edit_router)
router.include_router(team_router)
router.include_router(progress_router)
router.include_router(assignments_router)
router.include_router(settings_router)
router.include_router(byoc_router)
router.include_router(party_router)
router.include_router(pause_ask_router)
router.include_router(checkout_router)
router.include_router(comprehension_reports_router)
router.include_router(pilot_metrics_router)
router.include_router(exports_router)
router.include_router(scorm_interact_router)
router.include_router(onboarding_router)
router.include_router(analytics_export_router)
router.include_router(portraits_router)
router.include_router(companion_router, prefix="/companion")
router.include_router(superadmin_router)
router.include_router(config_router)
router.include_router(source_connections_router)

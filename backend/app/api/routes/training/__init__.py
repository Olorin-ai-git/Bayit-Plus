"""Training platform API routes."""

from fastapi import APIRouter

from app.api.routes.training.auth import router as auth_router
from app.api.routes.training.content import router as content_router
from app.api.routes.training.password_reset import router as password_reset_router
from app.api.routes.training.team import router as team_router
from app.api.routes.training.progress import router as progress_router
from app.api.routes.training.assignments import router as assignments_router

router = APIRouter(prefix="/training")

router.include_router(auth_router)
router.include_router(password_reset_router)
router.include_router(content_router)
router.include_router(team_router)
router.include_router(progress_router)
router.include_router(assignments_router)

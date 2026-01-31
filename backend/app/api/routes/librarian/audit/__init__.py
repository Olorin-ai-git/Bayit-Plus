"""
Audit endpoints package - refactored from audit_endpoints.py.

Original file was 1,437 lines. Split into:
- scheduler.py - Internal Cloud Scheduler endpoint
- trigger.py - Admin audit triggering
- reports.py - Audit report management  
- actions.py - Librarian action management
- control.py - Audit control (pause/resume/cancel)
- interaction.py - Audit interaction (interject/reapply)
- _helpers/ - Shared helper functions

All endpoint files are under 200 lines.
"""
from fastapi import APIRouter

from . import scheduler, trigger, reports, actions, control, interaction

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(scheduler.router, tags=["librarian-scheduler"])
router.include_router(trigger.router, tags=["librarian-audit"])
router.include_router(reports.router, tags=["librarian-reports"])
router.include_router(actions.router, tags=["librarian-actions"])
router.include_router(control.router, tags=["librarian-control"])
router.include_router(interaction.router, tags=["librarian-interaction"])

__all__ = ["router"]

"""
Librarian module.

This module handles all Librarian AI Agent functionality:
- Audit triggering and management
- Audit reports and actions
- Voice commands
- Series linking and duplicate resolution
- Configuration and status

The module is split into logical submodules for maintainability:
- audit_endpoints: Audit CRUD and control operations
- status: Configuration and status endpoints
- voice_command: Voice command execution
- series_linking: Episode linking and duplicate management
- models: Request/response models
- utils: Shared utilities
"""

from fastapi import APIRouter

from app.api.routes.librarian.audit_endpoints import router as audit_router
from app.api.routes.librarian.series_linking import router as series_router
from app.api.routes.librarian.status import router as status_router
from app.api.routes.librarian.voice_command import router as voice_router

# Create combined router
router = APIRouter()

# Include all sub-routers
router.include_router(status_router)
router.include_router(audit_router)
router.include_router(voice_router)
router.include_router(series_router)

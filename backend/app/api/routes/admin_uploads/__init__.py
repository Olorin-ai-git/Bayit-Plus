"""
Admin uploads module.

This module handles all admin upload functionality:
- Basic file uploads (images, URL validation, presigned URLs)
- Browser-based chunked uploads (resumable)
- Upload queue management
- Monitored folder management
- Integrity management (orphaned files/records, stuck jobs)
- Real-time WebSocket updates

The module is split into logical submodules for maintainability:
- upload_endpoints: Basic upload operations
- browser_upload: Chunked/resumable uploads
- queue_management: Queue operations and job management
- monitored_folders: Folder watching and scanning
- integrity: Cleanup and recovery operations
- websocket: Real-time progress updates
"""

from fastapi import APIRouter

from app.api.routes.admin_uploads.upload_endpoints import router as upload_router
from app.api.routes.admin_uploads.browser_upload import router as browser_router
from app.api.routes.admin_uploads.queue_management import router as queue_router
from app.api.routes.admin_uploads.monitored_folders import router as folders_router
from app.api.routes.admin_uploads.integrity import router as integrity_router
from app.api.routes.admin_uploads.websocket import router as websocket_router

# Create combined router
router = APIRouter()

# Include all sub-routers
router.include_router(upload_router)
router.include_router(browser_router)
router.include_router(queue_router)
router.include_router(folders_router)
router.include_router(integrity_router)
router.include_router(websocket_router)

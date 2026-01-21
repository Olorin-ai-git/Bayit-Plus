"""
Log Stream Router
Feature: 021-live-merged-logstream

FastAPI router providing SSE streaming and polling endpoints for merged logs.
Integrates aggregator and deduplicator services for real-time log delivery.

Author: Gil Klainert
Date: 2025-11-12
Updated: 2025-11-13 (Refactored for 200-line compliance)
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from fastapi import APIRouter

from app.api.logstream_ingestion import router as ingestion_router
from app.api.logstream_polling import router as polling_router
from app.api.logstream_streaming import router as streaming_router

# Create main router with prefix and tags
router = APIRouter(prefix="/api/v1/investigations", tags=["log-stream"])

# Include endpoint routers
router.include_router(streaming_router)
router.include_router(polling_router)
router.include_router(ingestion_router)

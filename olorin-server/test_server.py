#!/usr/bin/env python3
"""
Simplified Test Server for Autonomous Investigation Testing

This server includes only the essential components needed to test the autonomous
investigation system without the complex dependencies that might be missing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Olorin Autonomous Investigation Test Server",
    description="Simplified server for testing autonomous investigation capabilities",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "olorin-test-server"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Olorin Autonomous Investigation Test Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "autonomous_investigations": "/autonomous",
            "docs": "/docs"
        }
    }

# Include our autonomous investigation router
try:
    from app.router.autonomous_investigation_router import router as autonomous_router
    app.include_router(autonomous_router)
    logger.info("✅ Autonomous investigation router loaded successfully")
except Exception as e:
    logger.warning(f"⚠️ Could not load autonomous investigation router: {e}")
    
    # Create a fallback minimal router for testing
    from fastapi import APIRouter
    
    fallback_router = APIRouter(prefix="/autonomous", tags=["autonomous-investigation"])
    
    @fallback_router.get("/scenarios")
    async def list_scenarios_fallback():
        return {
            "fraud_scenarios": ["device_spoofing", "impossible_travel"],
            "legitimate_scenarios": ["normal_behavior"]
        }
    
    @fallback_router.post("/start_investigation")
    async def start_investigation_fallback():
        return {
            "investigation_id": "TEST_FALLBACK_001",
            "status": "started",
            "message": "Fallback test mode - autonomous investigation router not fully loaded",
            "note": "This is a minimal fallback for basic testing"
        }
    
    app.include_router(fallback_router)
    logger.info("✅ Fallback autonomous investigation endpoints loaded")

if __name__ == "__main__":
    print("🚀 Starting Olorin Autonomous Investigation Test Server")
    print("📡 Server will be available at: http://localhost:8000")
    print("📋 API documentation at: http://localhost:8000/docs")
    print("🧪 Test endpoints at: http://localhost:8000/autonomous/scenarios")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    )
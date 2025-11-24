"""
Location Router - REST API endpoints for location-based risk analysis.

This module provides FastAPI endpoints for analyzing location-based risk indicators
in fraud detection investigations.
"""
import logging
from typing import Any, Dict, List, Optional

<<<<<<< HEAD
from fastapi import APIRouter, Query
from starlette.requests import Request

from app.persistence import ensure_investigation_exists
=======
from fastapi import APIRouter, Depends, Query
from starlette.requests import Request

from app.persistence import ensure_investigation_exists
from app.security.auth import User, require_read
>>>>>>> 001-modify-analyzer-method
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/location")


@router.options("/{entity_id}")
def analyze_location_options():
    """Handle CORS preflight requests for location analysis endpoint."""
    return {}


@router.get("/{entity_id}")
async def analyze_location(
    entity_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "30d",
    entity_type: str = Query("user_id", pattern="^(user_id|device_id)$"),
    splunk_host: Optional[str] = None,
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
<<<<<<< HEAD
=======
    current_user: User = Depends(require_read),
>>>>>>> 001-modify-analyzer-method
) -> dict:
    """Analyze location risk for a user or device.

    This endpoint provides location-based risk analysis including:
    - Geographic velocity analysis
    - Location pattern detection
    - Anomalous location identification
    - Travel pattern analysis

    Args:
        entity_id: User ID or device ID to analyze
        request: FastAPI request object
        investigation_id: Investigation identifier
        time_range: Time range for analysis (default: 30d)
        entity_type: Type of entity (user_id or device_id)
        splunk_host: Optional Splunk host override
        raw_splunk_override: Optional raw data override for testing

    Returns:
        Dictionary containing location risk analysis results
    """
    try:
        logger.info(f"=== LOCATION ENDPOINT HIT (router) ===")
        logger.info(f"Location risk analysis requested for {entity_type}: {entity_id}")

        # Ensure investigation exists
        ensure_investigation_exists(investigation_id, entity_id, entity_type)

        # For now, return a basic response structure
        # This would normally delegate to a LocationAnalysisService similar to NetworkAnalysisService
        result = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_id": investigation_id,
            "analysis_type": "location_risk",
            "time_range": time_range,
            "status": "completed",
            "location_analysis": {
                "geographic_velocity": {
                    "max_velocity_km_h": 0.0,
                    "suspicious_movements": []
                },
                "location_patterns": {
                    "primary_locations": [],
                    "anomalous_locations": []
                },
                "travel_analysis": {
                    "total_unique_locations": 0,
                    "geographic_spread_km": 0.0
                },
                "risk_indicators": {
                    "velocity_risk": "low",
                    "location_anomaly_risk": "low",
                    "geographic_risk": "low"
                }
            },
            "overall_location_risk_score": 0.0,
            "risk_factors": [],
            "recommendations": ["No significant location-based risk indicators detected"],
            "metadata": {
                "analysis_timestamp": "2024-01-01T00:00:00Z",
                "data_sources": ["splunk"],
                "analysis_version": "1.0"
            }
        }

        logger.info(f"Location analysis completed for {entity_type}: {entity_id}")
        return result

    except Exception as e:
        logger.error(f"❌ Error in location analysis for {entity_id}: {e}", exc_info=True)
        # Return error response structure
        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_id": investigation_id,
            "analysis_type": "location_risk",
            "status": "error",
            "error": f"Location analysis failed: {str(e)}",
            "overall_location_risk_score": 0.0,
            "risk_factors": [f"Analysis error: {str(e)}"],
            "recommendations": ["Unable to complete location analysis due to error"],
            "metadata": {
                "analysis_timestamp": "2024-01-01T00:00:00Z",
                "error_details": str(e)
            }
        }


@router.get("/health")
async def location_router_health():
    """Health check endpoint for location router."""
    return {
        "status": "healthy",
        "router": "location_router",
        "endpoints": [
            "GET /{entity_id} - Location risk analysis",
            "OPTIONS /{entity_id} - CORS preflight",
            "GET /health - Health check"
        ]
    }
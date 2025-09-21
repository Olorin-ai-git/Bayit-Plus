"""
API endpoints for risk analytics powered by Snowflake.
"""

import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.service.logging import get_bridge_logger
from app.service.analytics.risk_analyzer import get_risk_analyzer

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])


class RiskAnalyticsRequest(BaseModel):
    """Request model for risk analytics."""
    time_window: Optional[str] = Field(
        None,
        description="Time window for analysis (e.g., '24h', '7d', '30d')"
    )
    group_by: Optional[str] = Field(
        None,
        description="Field to group by (e.g., 'EMAIL', 'DEVICE_ID', 'IP')"
    )
    top_percentage: Optional[float] = Field(
        None,
        description="Top percentage to return (e.g., 10 for top 10%)",
        ge=1,
        le=100
    )
    force_refresh: bool = Field(
        False,
        description="Force refresh bypassing cache"
    )


class EntityAnalysisRequest(BaseModel):
    """Request model for entity analysis."""
    entity_value: str = Field(
        ...,
        description="The entity value to analyze"
    )
    entity_type: str = Field(
        "email",
        description="Type of entity (email, device_id, ip, etc.)"
    )
    time_window: str = Field(
        "30d",
        description="Time window for analysis"
    )


@router.get("/health")
async def analytics_health():
    """Check if analytics service is available."""
    snowflake_enabled = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'
    
    return {
        "status": "healthy",
        "snowflake_enabled": snowflake_enabled,
        "message": "Analytics service is operational" if snowflake_enabled else "Analytics disabled (USE_SNOWFLAKE=false)"
    }


@router.get("/risk/top-entities")
async def get_top_risk_entities(
    request: Request,
    time_window: Optional[str] = Query(None, description="Time window (e.g., '24h', '7d')"),
    group_by: Optional[str] = Query(None, description="Group by field (e.g., 'EMAIL', 'DEVICE_ID', 'IP')"),
    top_percentage: Optional[float] = Query(None, description="Top percentage (1-100)"),
    force_refresh: bool = Query(False, description="Force refresh cache")
):
    """
    Get top risk entities based on risk-weighted transaction value.
    
    Returns entities with highest risk_score × transaction_amount values.
    """
    # Check if Snowflake is enabled
    if os.getenv('USE_SNOWFLAKE', 'false').lower() != 'true':
        raise HTTPException(
            status_code=503,
            detail="Analytics service unavailable. Snowflake is disabled (USE_SNOWFLAKE=false)"
        )
    
    # Check for cached results in app state (loaded on startup)
    if not force_refresh and hasattr(request.app.state, 'top_risk_entities'):
        cached = request.app.state.top_risk_entities
        if cached and not time_window and not group_by and not top_percentage:
            logger.info("Returning startup-cached risk entities")
            return cached
    
    try:
        analyzer = get_risk_analyzer()
        results = await analyzer.get_top_risk_entities(
            time_window=time_window,
            group_by=group_by,
            top_percentage=top_percentage,
            force_refresh=force_refresh
        )
        
        if results.get('status') == 'failed':
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {results.get('error', 'Unknown error')}"
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Risk analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk analysis failed: {str(e)}"
        )


@router.post("/risk/top-entities")
async def post_top_risk_entities(
    request: Request,
    body: RiskAnalyticsRequest
):
    """
    Get top risk entities with POST request for complex parameters.
    """
    # Check if Snowflake is enabled
    if os.getenv('USE_SNOWFLAKE', 'false').lower() != 'true':
        raise HTTPException(
            status_code=503,
            detail="Analytics service unavailable. Snowflake is disabled"
        )
    
    try:
        analyzer = get_risk_analyzer()
        results = await analyzer.get_top_risk_entities(
            time_window=body.time_window,
            group_by=body.group_by,
            top_percentage=body.top_percentage,
            force_refresh=body.force_refresh
        )
        
        if results.get('status') == 'failed':
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {results.get('error', 'Unknown error')}"
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Risk analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk analysis failed: {str(e)}"
        )


@router.post("/entity/analyze")
async def analyze_entity(body: EntityAnalysisRequest):
    """
    Analyze a specific entity's risk profile.
    
    Provides detailed risk assessment for a single entity (email, device, IP, etc.)
    """
    # Check if Snowflake is enabled
    if os.getenv('USE_SNOWFLAKE', 'false').lower() != 'true':
        raise HTTPException(
            status_code=503,
            detail="Analytics service unavailable. Snowflake is disabled"
        )
    
    try:
        analyzer = get_risk_analyzer()
        results = await analyzer.analyze_entity(
            entity_value=body.entity_value,
            entity_type=body.entity_type,
            time_window=body.time_window
        )
        
        if results.get('status') == 'failed':
            raise HTTPException(
                status_code=500,
                detail=f"Entity analysis failed: {results.get('error', 'Unknown error')}"
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Entity analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Entity analysis failed: {str(e)}"
        )


@router.get("/config")
async def get_analytics_config():
    """
    Get current analytics configuration.
    """
    return {
        "snowflake_enabled": os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true',
        "default_time_window": os.getenv('ANALYTICS_DEFAULT_TIME_WINDOW', '24h'),
        "default_group_by": os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'EMAIL'),
        "default_top_percentage": float(os.getenv('ANALYTICS_DEFAULT_TOP_PERCENTAGE', '10')),
        "cache_ttl": int(os.getenv('ANALYTICS_CACHE_TTL', '300')),
        "available_groupings": ["EMAIL", "DEVICE_ID", "IP", "BIN", "MERCHANT_NAME"],
        "available_time_windows": ["1h", "6h", "12h", "24h", "7d", "30d"]
    }
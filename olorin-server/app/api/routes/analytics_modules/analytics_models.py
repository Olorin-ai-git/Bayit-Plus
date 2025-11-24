"""
Analytics API Models

Extracted request models from analytics.py
"""

from typing import Optional
from pydantic import BaseModel, Field


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


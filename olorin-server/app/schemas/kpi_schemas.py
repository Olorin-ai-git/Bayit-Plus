"""
KPI Dashboard Schemas
Feature: KPI Dashboard Microservice

Pydantic schemas for KPI API requests and responses.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class KPIDailyMetricsResponse(BaseModel):
    """Response schema for daily KPI metrics."""
    id: str
    pilot_id: str
    tenant_id: str
    metric_date: datetime
    
    # Quality Metrics
    precision: Optional[float] = None
    recall: Optional[float] = None
    fpr: Optional[float] = None
    pr_auc: Optional[float] = None
    
    # Confusion Matrix
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0
    
    # Business Impact
    fraud_amount_avoided: Optional[float] = None
    false_positive_cost: Optional[float] = None
    net_savings: Optional[float] = None
    roi_percentage: Optional[float] = None
    
    # Operational Metrics
    approval_rate: Optional[float] = None
    review_rate: Optional[float] = None
    decline_rate: Optional[float] = None
    latency_p95: Optional[float] = None
    error_rate: Optional[float] = None
    drift_psi: Optional[float] = None
    
    # Model Info
    model_version: Optional[str] = None
    total_events: int = 0
    labeled_events: int = 0
    
    class Config:
        from_attributes = True


class KPIThresholdSweepResponse(BaseModel):
    """Response schema for threshold sweep data."""
    id: str
    pilot_id: str
    tenant_id: str
    sweep_date: datetime
    model_version: Optional[str] = None
    threshold: float
    
    precision: Optional[float] = None
    recall: Optional[float] = None
    fpr: Optional[float] = None
    
    profit: Optional[float] = None
    fraud_amount_avoided: Optional[float] = None
    false_positive_cost: Optional[float] = None
    
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0
    
    class Config:
        from_attributes = True


class KPIBreakdownResponse(BaseModel):
    """Response schema for KPI breakdowns."""
    id: str
    pilot_id: str
    tenant_id: str
    breakdown_date: datetime
    breakdown_type: str
    breakdown_value: str
    
    precision: Optional[float] = None
    recall: Optional[float] = None
    fpr: Optional[float] = None
    total_events: int = 0
    fraud_count: int = 0
    fraud_amount: Optional[float] = None
    
    class Config:
        from_attributes = True


class KPIDashboardResponse(BaseModel):
    """Complete KPI dashboard response."""
    # Top Tiles
    recall: Optional[float] = None
    fpr: Optional[float] = None
    precision: Optional[float] = None
    net_savings: Optional[float] = None
    latency_p95: Optional[float] = None
    error_rate: Optional[float] = None
    
    # Time Series Data
    daily_metrics: List[KPIDailyMetricsResponse] = []
    
    # Threshold Sweep Data
    threshold_sweep: List[KPIThresholdSweepResponse] = []
    
    # Breakdowns
    breakdowns: List[KPIBreakdownResponse] = []
    
    # Metadata
    pilot_id: str
    tenant_id: str
    date_range_start: datetime
    date_range_end: datetime
    last_updated: datetime


class KPIMetricsRequest(BaseModel):
    """Request schema for KPI metrics query."""
    pilot_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    model_version: Optional[str] = None
    breakdown_type: Optional[str] = None  # merchant, segment, method, model_version






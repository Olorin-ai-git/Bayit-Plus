"""
Report API Schemas
Pydantic models for Report API request/response validation.
All configuration from environment variables - no hardcoded values.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ReportCreate(BaseModel):
    """Create report request."""
    title: str = Field(..., min_length=1, max_length=255, description="Report title")
    content: str = Field(..., description="Report content in markdown format")
    tags: Optional[List[str]] = Field(default_factory=list, description="Report tags")


class ReportUpdate(BaseModel):
    """Update report request."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    status: Optional[str] = Field(None, description="Report status: Draft, Published, Archived")
    tags: Optional[List[str]] = None


class ReportResponse(BaseModel):
    """Report response."""
    id: str
    title: str
    content: str
    owner: str
    status: str
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Report list response."""
    reports: List[ReportResponse]
    total: int
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class InvestigationStatisticsResponse(BaseModel):
    """Investigation statistics for widget data."""
    total: int = Field(description="Total number of investigations")
    completed: int = Field(description="Number of completed investigations")
    success_rate: float = Field(ge=0.0, le=100.0, description="Success rate percentage")
    investigations: List[Dict[str, Any]] = Field(default_factory=list, description="Recent investigations")


class ReportPublishRequest(BaseModel):
    """Publish report request."""
    status: str = Field(..., description="New status: Published or Draft")


class ReportShareResponse(BaseModel):
    """Share report response."""
    share_url: str = Field(description="Shareable URL for the report")


class ReportExportRequest(BaseModel):
    """Export report request."""
    format: str = Field(default="json", description="Export format: json, pdf, html")


class InvestigationReportGenerateRequest(BaseModel):
    """Request to generate comprehensive investigation report."""
    investigation_id: str = Field(..., description="Investigation ID")
    title: Optional[str] = Field(None, description="Custom report title")


class InvestigationReportGenerateResponse(BaseModel):
    """Response after generating investigation report."""
    investigation_id: str = Field(description="Investigation ID")
    report_path: str = Field(description="Path to generated HTML report")
    file_size_bytes: int = Field(description="Report file size in bytes")
    generated_at: datetime = Field(description="Generation timestamp")
    summary: Dict[str, Any] = Field(description="Report summary data")


class InvestigationReportListItem(BaseModel):
    """Investigation report list item with metadata."""
    investigation_id: str = Field(description="Investigation ID")
    title: Optional[str] = Field(None, description="Report title")
    generated_at: datetime = Field(description="Generation timestamp")
    file_size_bytes: int = Field(description="Report file size in bytes")
    overall_risk_score: Optional[float] = Field(None, description="Overall risk score (0-100)")
    entity_id: Optional[str] = Field(None, description="Primary entity ID")
    entity_type: Optional[str] = Field(None, description="Entity type")
    status: Optional[str] = Field(None, description="Investigation status")
    owner: Optional[str] = Field(None, description="Investigation owner")


class InvestigationReportListResponse(BaseModel):
    """Investigation reports list response with pagination."""
    reports: List[InvestigationReportListItem] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of reports")
    page: int = Field(default=1, ge=1, description="Current page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")


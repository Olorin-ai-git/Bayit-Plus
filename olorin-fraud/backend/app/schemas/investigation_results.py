"""
Investigation Results Schema

Pydantic schemas for hybrid graph investigation final results.
Used for GET /api/investigations/{id}/results endpoint.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field


class FindingSchema(BaseModel):
    """Individual finding from investigation."""

    finding_id: str = Field(..., description="Unique finding identifier")
    severity: Literal["critical", "high", "medium", "low"] = Field(
        ..., description="Finding severity level"
    )
    domain: Literal["device", "location", "network", "logs", "risk"] = Field(
        ..., description="Domain agent that generated finding"
    )
    title: str = Field(..., description="Finding title")
    description: str = Field(..., description="Detailed finding description")
    affected_entities: List[str] = Field(
        default_factory=list, description="List of affected entity identifiers"
    )
    evidence_ids: List[str] = Field(
        default_factory=list, description="References to supporting evidence"
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Agent confidence in finding (0-1)"
    )
    timestamp: datetime = Field(..., description="Finding timestamp")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional finding metadata"
    )


class EvidenceSchema(BaseModel):
    """Evidence supporting investigation findings."""

    evidence_id: str = Field(..., description="Unique evidence identifier")
    source: str = Field(..., description="Data source (e.g., 'Snowflake', 'Splunk')")
    evidence_type: str = Field(
        ..., description="Evidence type (e.g., 'device_fingerprint', 'geo_location')"
    )
    data: Dict[str, Any] = Field(..., description="Actual evidence data")
    timestamp: datetime = Field(..., description="Evidence timestamp")
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Evidence reliability score (0-1)"
    )
    related_findings: List[str] = Field(
        default_factory=list, description="Finding IDs related to this evidence"
    )


class AgentDecisionSchema(BaseModel):
    """Decision made by domain agent during investigation."""

    agent_name: str = Field(..., description="Agent name (e.g., 'Device Agent')")
    decision: str = Field(..., description="Human-readable decision")
    rationale: str = Field(..., description="Explanation for decision")
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Decision confidence (0-1)"
    )
    supporting_evidence: List[str] = Field(
        default_factory=list, description="Evidence IDs supporting decision"
    )
    alternative_hypotheses: List[str] = Field(
        default_factory=list, description="Other possibilities considered"
    )
    timestamp: datetime = Field(..., description="Decision timestamp")


class InvestigationMetadataSchema(BaseModel):
    """Investigation execution metadata."""

    entity_type: str = Field(..., description="Entity type investigated")
    entity_id: str = Field(..., description="Entity identifier")
    time_range: Dict[str, datetime] = Field(..., description="Time range (start, end)")
    tools_used: List[str] = Field(
        default_factory=list, description="Tools executed during investigation"
    )
    execution_mode: str = Field(..., description="Execution mode (parallel/sequential)")
    correlation_mode: str = Field(..., description="Correlation mode (OR/AND)")


class InvestigationResultsSchema(BaseModel):
    """
    Response schema for GET /api/investigations/{id}/results endpoint.

    Provides comprehensive investigation results after completion.
    """

    investigation_id: str = Field(..., description="Unique investigation identifier")

    overall_risk_score: float = Field(
        ..., ge=0.0, le=100.0, description="Final risk assessment (0-100)"
    )

    status: Literal["completed", "failed"] = Field(
        ..., description="Final investigation status"
    )

    started_at: datetime = Field(..., description="Investigation start timestamp")

    completed_at: datetime = Field(
        ..., description="Investigation completion timestamp"
    )

    duration_ms: int = Field(
        ..., ge=0, description="Total investigation duration in milliseconds"
    )

    findings: List[FindingSchema] = Field(
        default_factory=list, description="List of all findings"
    )

    evidence: List[EvidenceSchema] = Field(
        default_factory=list, description="List of all evidence collected"
    )

    agent_decisions: List[AgentDecisionSchema] = Field(
        default_factory=list, description="List of agent decisions"
    )

    summary: str = Field("", description="Human-readable investigation summary")

    metadata: InvestigationMetadataSchema = Field(
        ..., description="Investigation execution metadata"
    )

    class Config:
        """Pydantic model configuration."""

        json_schema_extra = {
            "example": {
                "investigation_id": "inv-123e4567-e89b-12d3-a456-426614174000",
                "overall_risk_score": 78.5,
                "status": "completed",
                "started_at": "2025-01-21T10:00:00Z",
                "completed_at": "2025-01-21T10:15:00Z",
                "duration_ms": 900000,
                "findings": [
                    {
                        "finding_id": "find-001",
                        "severity": "high",
                        "domain": "device",
                        "title": "Suspicious device fingerprint detected",
                        "description": "Device fingerprint does not match expected pattern",
                        "affected_entities": ["user@example.com"],
                        "evidence_ids": ["ev-001", "ev-002"],
                        "confidence_score": 0.85,
                        "timestamp": "2025-01-21T10:05:00Z",
                    }
                ],
                "summary": "Investigation completed with high-risk findings",
                "metadata": {
                    "entity_type": "user",
                    "entity_id": "user@example.com",
                    "time_range": {
                        "start": "2025-01-01T00:00:00Z",
                        "end": "2025-01-07T23:59:59Z",
                    },
                    "tools_used": ["check_device_fingerprint", "analyze_network"],
                    "execution_mode": "parallel",
                    "correlation_mode": "OR",
                },
            }
        }

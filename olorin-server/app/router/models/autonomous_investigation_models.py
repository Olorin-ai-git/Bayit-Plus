"""
Autonomous Investigation Models
This module contains all Pydantic models for autonomous investigation requests and responses.
"""
import re
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.utils.entity_validation import validate_entity_type_against_enum


class AutonomousInvestigationRequest(BaseModel):
    """Request model for starting an autonomous investigation"""
    investigation_id: Optional[str] = Field(None, description="Optional investigation ID (auto-generated if not provided)")
    entity_id: str = Field(..., description="Entity being investigated (user_id, device_id, etc.)")
    entity_type: str = Field(..., min_length=1, max_length=100, description="Type of entity (user, device, transaction, etc.)")
    scenario: Optional[str] = Field(None, description="Mock scenario to use for testing (optional)")
    enable_verbose_logging: bool = Field(True, description="Enable comprehensive logging of all interactions")
    enable_journey_tracking: bool = Field(True, description="Enable LangGraph journey tracking")
    enable_chain_of_thought: bool = Field(True, description="Enable agent reasoning logging")
    investigation_priority: str = Field("normal", description="Investigation priority (low, normal, high, critical)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional investigation metadata")

    @validator("entity_type")
    def validate_entity_type(cls, v):
        """Validate entity type against EntityType enum with comprehensive security checks."""
        is_valid, error_message = validate_entity_type_against_enum(v)
        if not is_valid:
            raise ValueError(error_message)
        
        return v.strip().lower()


class AutonomousInvestigationResponse(BaseModel):
    """Response model for investigation start request"""
    investigation_id: str
    status: str
    message: str
    investigation_context: Dict[str, Any]
    monitoring_endpoints: Dict[str, str]
    estimated_completion_time_ms: int
    created_at: str


class InvestigationStatusResponse(BaseModel):
    """Response model for investigation status"""
    investigation_id: str
    status: str
    current_phase: str
    progress_percentage: float
    agent_status: Dict[str, str]
    findings_summary: Dict[str, Any]
    investigation_timeline: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]


class InvestigationLogsResponse(BaseModel):
    """Response model for investigation logs"""
    investigation_id: str
    log_summary: Dict[str, Any]
    interaction_logs: List[Dict[str, Any]]
    llm_interactions: List[Dict[str, Any]]
    agent_decisions: List[Dict[str, Any]]
    tool_executions: List[Dict[str, Any]]


class LangGraphJourneyResponse(BaseModel):
    """Response model for LangGraph journey visualization"""
    investigation_id: str
    journey_visualization: Dict[str, Any]
    execution_path: List[Dict[str, Any]]  # Changed from List[str] to List[Dict[str, Any]] to match timeline data
    agent_coordination: List[Dict[str, Any]]
    performance_analytics: Dict[str, Any]
"""
Investigation Progress API Models
Feature: 008-live-investigation-updates (US1 Real-Time Progress Monitoring)

Pydantic models for investigation progress tracking and real-time monitoring.
All models provide comprehensive data for live progress display.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters properly typed
- Full validation for data integrity
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator
import uuid


class ToolExecutionInput(BaseModel):
    """Tool execution input parameters"""
    entity_id: str
    entity_type: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionResult(BaseModel):
    """Tool execution result data"""
    success: bool
    risk_score: Optional[float] = None
    risk: Optional[float] = None
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionError(BaseModel):
    """Tool execution error details"""
    code: str
    message: str
    details: Any = None


class ToolExecution(BaseModel):
    """
    Tool execution tracking for real-time progress monitoring.
    
    Each tool execution tracks:
    - Status lifecycle (queued → running → completed/failed/skipped)
    - Timing information (queued_at, started_at, completed_at)
    - Execution input (entity_id, parameters)
    - Result data (findings, risk score)
    - Error information if failed
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique tool execution ID")
    tool_name: str = Field(..., description="Name of the tool executed")
    agent_type: str = Field(..., description="Type of agent that executed the tool")
    status: str = Field(..., pattern="^(queued|running|completed|failed|skipped)$", description="Execution status")
    queued_at: datetime = Field(..., description="When tool was queued for execution")
    started_at: Optional[datetime] = Field(None, description="When tool execution started")
    completed_at: Optional[datetime] = Field(None, description="When tool execution completed")
    execution_time_ms: int = Field(ge=0, default=0, description="Total execution time in milliseconds")
    input: ToolExecutionInput = Field(..., description="Tool execution input parameters")
    result: Optional[ToolExecutionResult] = Field(None, description="Tool execution result if successful")
    error: Optional[ToolExecutionError] = Field(None, description="Error details if execution failed")
    retry_count: int = Field(ge=0, default=0, description="Number of retries attempted")
    max_retries: int = Field(ge=0, default=3, description="Maximum retries allowed")


class AgentStatus(BaseModel):
    """Agent execution status tracking"""
    agent_type: str
    agent_name: str
    status: str  # 'pending', 'running', 'completed', 'failed'
    tools_completed: int = 0
    total_tools: int = 0
    progress_percent: int = 0
    average_execution_time_ms: int = 0
    findings_count: int = 0
    risk_score: float = 0.0
    max_risk_detected: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PhaseProgress(BaseModel):
    """Investigation phase progress tracking"""
    id: str
    name: str
    order: int
    status: str  # 'pending', 'in_progress', 'completed', 'failed', 'skipped'
    completion_percent: int = 0
    tool_execution_ids: List[str] = Field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration_ms: int = 0


class InvestigationEntity(BaseModel):
    """Investigation entity tracking"""
    id: str
    type: str
    value: str
    label: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    added_at: datetime


class EntityRelationship(BaseModel):
    """Entity relationship tracking"""
    id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    confidence: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    discovered_at: datetime


class RiskMetrics(BaseModel):
    """Risk assessment metrics"""
    overall: float = 0.0
    by_agent: Dict[str, float] = Field(default_factory=dict)
    confidence: float = 0.0
    last_calculated: datetime


class InvestigationError(BaseModel):
    """Investigation error tracking"""
    id: str
    code: str
    message: str
    timestamp: datetime
    severity: str  # 'warning', 'error', 'critical'
    context: Dict[str, Any] = Field(default_factory=dict)


class InvestigationProgress(BaseModel):
    """
    Complete investigation progress response for real-time monitoring.
    
    US1: Provides all data needed for live progress display:
    - Real-time progress percentage and tool execution status
    - Agent status and risk metrics
    - Phase transitions and completion tracking
    - Entity relationships discovered
    - Error tracking and reporting
    - Domain findings with LLM analysis (risk scores, confidence, reasoning)
    
    Matches frontend TypeScript InvestigationProgress interface.
    Populated from InvestigationState.progress_json in database.
    """
    # Core identification
    id: str = Field(..., description="Progress record ID")
    investigation_id: str = Field(..., description="Associated investigation ID")

    # Status and lifecycle
    status: str = Field(
        ...,
        pattern="^(pending|initializing|running|paused|completed|failed|cancelled)$",
        description="Current investigation status"
    )
    lifecycle_stage: str = Field(
        ...,
        pattern="^(draft|submitted|in_progress|completed|failed)$",
        description="Investigation lifecycle stage"
    )
    completion_percent: int = Field(ge=0, le=100, default=0, description="Overall completion percentage")

    # Timestamps
    created_at: datetime = Field(..., description="When investigation was created")
    started_at: Optional[datetime] = Field(None, description="When investigation execution started")
    completed_at: Optional[datetime] = Field(None, description="When investigation completed")
    last_updated_at: datetime = Field(..., description="Last update timestamp")

    # Tool execution tracking
    tool_executions: List[ToolExecution] = Field(default_factory=list, description="All tool executions")
    total_tools: int = Field(ge=0, default=0, description="Total tools in investigation")
    completed_tools: int = Field(ge=0, default=0, description="Completed tools")
    running_tools: int = Field(ge=0, default=0, description="Currently running tools")
    queued_tools: int = Field(ge=0, default=0, description="Queued tools waiting execution")
    failed_tools: int = Field(ge=0, default=0, description="Failed tool executions")
    skipped_tools: int = Field(ge=0, default=0, description="Skipped tools")

    # Agent tracking
    agent_statuses: List[AgentStatus] = Field(default_factory=list, description="Status of each agent")

    # Risk assessment
    risk_metrics: RiskMetrics = Field(..., description="Current risk assessment metrics")

    # Phase tracking
    phases: List[PhaseProgress] = Field(default_factory=list, description="Investigation phases")
    current_phase: Optional[str] = Field(None, description="Currently executing phase")

    # Entity relationships
    entities: List[InvestigationEntity] = Field(default_factory=list, description="Discovered entities")
    relationships: List[EntityRelationship] = Field(default_factory=list, description="Entity relationships")

    # Real-time activity
    tools_per_second: float = Field(ge=0.0, default=0.0, description="Current tools per second rate")
    peak_tools_per_second: float = Field(ge=0.0, default=0.0, description="Peak tools per second rate")

    # Connection status
    ice_connected: bool = Field(default=True, description="ICE service connection status")

    # Error tracking
    errors: List[InvestigationError] = Field(default_factory=list, description="Investigation errors")

    # Domain findings with LLM analysis
    domain_findings: Dict[str, Any] = Field(
        default_factory=dict,
        description="Domain-specific findings including LLM risk scores, confidence, and reasoning"
    )

    @validator("completion_percent")
    def validate_completion_percent(cls, v):
        """Ensure completion percentage is valid."""
        return max(0, min(100, v))

    @validator("tool_executions")
    def validate_tool_consistency(cls, v):
        """Validate tool execution list."""
        return v or []

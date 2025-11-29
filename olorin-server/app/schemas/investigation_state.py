"""
Pydantic Schemas: Investigation State
Feature: 005-polling-and-persistence (Enhanced for 001-investigation-state-management)

Provides request/response validation schemas for investigation state management.
All schemas match OpenAPI contract specifications.

Investigation Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

SYSTEM MANDATE Compliance:
- No hardcoded values: All enums match database constraints
- Complete validation: All fields validated with Pydantic
- Type-safe: All fields properly typed
"""

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel


# Enums
class LifecycleStage(str, Enum):
    """Investigation lifecycle stages."""

    CREATED = "CREATED"
    SETTINGS = "SETTINGS"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class InvestigationStatus(str, Enum):
    """Investigation status values."""

    CREATED = "CREATED"
    SETTINGS = "SETTINGS"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"


class InvestigationType(str, Enum):
    """Investigation type determining tool selection mode."""

    STRUCTURED = "structured"
    HYBRID = "hybrid"


class InvestigationMode(str, Enum):
    """Investigation mode determining entity selection."""

    RISK = "risk"
    ENTITY = "entity"


class EntityType(str, Enum):
    """Supported entity types for investigation."""

    USER_ID = "user_id"
    EMAIL = "email"
    IP = "ip"  # Matches database schema column name
    DEVICE_ID = "device_id"
    SESSION_ID = "session_id"
    MERCHANT = "merchant"


class CorrelationMode(str, Enum):
    """Entity correlation mode."""

    OR = "OR"
    AND = "AND"


class PhaseStatus(str, Enum):
    """Investigation phase status."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# Entity Models
class Entity(BaseModel):
    """Investigation entity configuration."""

    model_config = ConfigDict(
        use_enum_values=True, alias_generator=to_camel, populate_by_name=True
    )

    entity_type: Optional[EntityType] = None  # Allow None for risk-based mode
    entity_value: Optional[str] = None


class TimeRange(BaseModel):
    """Investigation time range."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # Accept both start_date/startDate and start_time/startTime
    start_time: Optional[datetime] = Field(
        None, validation_alias="start_date", serialization_alias="start_date"
    )
    # Accept both end_date/endDate and end_time/endTime
    end_time: Optional[datetime] = Field(
        None, validation_alias="end_date", serialization_alias="end_date"
    )
    # Accept duration_hours for backward compatibility
    duration_hours: Optional[int] = Field(None, ge=1, le=720)
    # Accept type field from frontend (e.g., "last_180d", "last_30d")
    type: Optional[str] = Field(
        None,
        description="Time range type: last_24h, last_7d, last_30d, last_180d, custom",
    )

    @field_validator("end_time")
    @classmethod
    def validate_end_after_start(
        cls, v: Optional[datetime], info
    ) -> Optional[datetime]:
        """Ensure end_time is after start_time."""
        if v:
            # Check end_time is after start_time
            if info.data.get("start_time") and v <= info.data["start_time"]:
                raise ValueError("end_time must be after start_time")
            
            # REMOVED: max_lookback cap validation
            # Investigations should be able to run on ANY date range,
            # including recent data. The max_lookback constraint applies
            # to WHERE THE ANALYZER LOOKS, not where investigations can run.
        return v


class ToolSelection(BaseModel):
    """Investigation tool configuration."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    tool_name: str = Field(..., min_length=1, max_length=100)
    enabled: bool = True
    config: Dict[str, Any] = Field(default_factory=dict)


class InvestigationSettings(BaseModel):
    """Complete investigation settings."""

    model_config = ConfigDict(
        use_enum_values=True,
        alias_generator=to_camel,
        populate_by_name=True,  # Accept both snake_case and camelCase
    )

    name: str = Field(..., min_length=1, max_length=255)
    entities: List[Entity] = Field(
        default_factory=list, max_items=10
    )  # Optional for risk-based mode
    time_range: TimeRange
    investigation_type: InvestigationType = Field(
        default=InvestigationType.STRUCTURED,
        description="Investigation type: structured (user selects tools) or hybrid (LLM selects tools)",
    )
    investigation_mode: Optional[InvestigationMode] = Field(
        default=InvestigationMode.ENTITY,
        description="Investigation mode: risk (auto-select entities) or entity (user specifies entities)",
    )
    auto_select_entities: Optional[bool] = Field(
        default=False, description="Whether to automatically select high-risk entities"
    )
    tools: List[ToolSelection] = Field(default_factory=list, max_items=20)
    correlation_mode: CorrelationMode

    @model_validator(mode="after")
    def validate_settings(self):
        """Validate settings based on investigation type and mode."""
        # Validate entities requirement based on investigation mode
        is_risk_mode = (
            self.investigation_mode == InvestigationMode.RISK
            or self.auto_select_entities is True
        )

        if not is_risk_mode and len(self.entities) == 0:
            raise ValueError(
                "At least 1 entity must be specified for entity-based investigations. "
                "Use investigation_mode='risk' or auto_select_entities=true for risk-based mode."
            )

        # Validate entity values for entity-based mode
        if not is_risk_mode:
            for entity in self.entities:
                if not entity.entity_type or not entity.entity_value:
                    raise ValueError(
                        "entity_type and entity_value are required for entity-based investigations"
                    )

        # Validate tools for structured investigations
        if (
            self.investigation_type == InvestigationType.STRUCTURED
            and len(self.tools) == 0
        ):
            raise ValueError(
                "At least 1 tool must be specified for structured investigations"
            )

        # For hybrid investigations, empty tools list is allowed (LLM will choose)
        return self


class ToolExecution(BaseModel):
    """Tool execution status."""

    model_config = ConfigDict(use_enum_values=True)

    tool_name: str
    status: PhaseStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    result_summary: Optional[str] = None


class InvestigationPhase(BaseModel):
    """Investigation phase information."""

    model_config = ConfigDict(use_enum_values=True)

    phase_name: str
    status: PhaseStatus
    tools_executed: List[ToolExecution] = Field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


# Enhanced Progress Model with new fields
class PhaseProgress(BaseModel):
    """Progress for a specific phase."""

    phase_name: str
    phase_percentage: float = Field(0.0, ge=0.0, le=100.0)
    tools_completed: int = Field(0, ge=0)
    tools_total: int = Field(0, ge=0)


class InvestigationProgress(BaseModel):
    """Investigation execution progress with enhanced tracking."""

    phases: List[InvestigationPhase] = Field(default_factory=list)
    tools_executed: List[str] = Field(default_factory=list)
    percent_complete: int = Field(0, ge=0, le=100)
    current_phase: Optional[str] = None
    estimated_completion: Optional[datetime] = None

    # New fields for enhanced progress tracking
    progress_percentage: float = Field(
        0.0, ge=0.0, le=100.0, description="Overall progress as float"
    )
    phase_progress: Dict[str, PhaseProgress] = Field(
        default_factory=dict, description="Detailed progress per phase"
    )

    # Domain findings with LLM analysis
    domain_findings: Dict[str, Any] = Field(
        default_factory=dict,
        description="Domain-specific findings including LLM risk scores, confidence, and reasoning",
    )


class InvestigationResults(BaseModel):
    """Investigation final results."""

    risk_score: int = Field(..., ge=0, le=100)
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Optional[str] = None
    completed_at: Optional[datetime] = None

    # Domain findings with LLM analysis
    domain_findings: Dict[str, Any] = Field(
        default_factory=dict,
        description="Domain-specific findings including LLM risk scores, confidence, and reasoning",
    )


# API Request/Response Models
class InvestigationStateCreate(BaseModel):
    """Request schema for creating investigation state."""

    model_config = ConfigDict(use_enum_values=True)

    investigation_id: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Optional investigation ID. If not provided, backend will generate UUID.",
    )
    lifecycle_stage: LifecycleStage = LifecycleStage.CREATED
    settings: Optional[InvestigationSettings] = None
    status: InvestigationStatus = InvestigationStatus.CREATED


class InvestigationStateUpdate(BaseModel):
    """Request schema for updating investigation state."""

    model_config = ConfigDict(use_enum_values=True)

    lifecycle_stage: Optional[LifecycleStage] = None
    settings: Optional[InvestigationSettings] = None
    progress: Optional[InvestigationProgress] = None
    status: Optional[InvestigationStatus] = None
    version: int = Field(..., ge=1)


class InvestigationStateResponse(BaseModel):
    """Response schema for investigation state with enhanced fields."""

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    investigation_id: str
    user_id: str
    lifecycle_stage: LifecycleStage
    settings: Optional[InvestigationSettings] = None
    progress: Optional[InvestigationProgress] = None
    status: InvestigationStatus
    created_at: datetime
    updated_at: datetime
    last_accessed: Optional[datetime] = None

    # Enhanced fields for optimistic locking and caching
    version: int = Field(..., ge=1, description="Version for optimistic locking")
    etag: Optional[str] = Field(None, description="ETag for conditional requests")

    # Internal fields to access JSON columns from SQLAlchemy model (not exposed in API)
    settings_json: Optional[str] = Field(
        None, exclude=True, description="Internal field for JSON deserialization"
    )
    progress_json: Optional[str] = Field(
        None, exclude=True, description="Internal field for JSON deserialization"
    )

    @field_serializer("created_at", "updated_at", "last_accessed", when_used="json")
    def serialize_datetime_with_timezone(
        self, dt: Optional[datetime], _info
    ) -> Optional[str]:
        """Ensure all datetimes are serialized with timezone information (assume UTC if naive)."""
        if dt is None:
            return None

        # If datetime is naive (no timezone), assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        # Return ISO format string with timezone
        return dt.isoformat()

    @model_validator(mode="after")
    def deserialize_json_fields(self):
        """Deserialize JSON fields from database model after Pydantic population."""
        # Handle progress field - deserialize from database property if it's a dict
        if self.progress is None:
            progress_json_str = getattr(self, "progress_json", None)
            if progress_json_str and isinstance(progress_json_str, str):
                try:
                    progress_data = json.loads(progress_json_str)
                    # Ensure domain_findings is included (default to empty dict if not present)
                    if "domain_findings" not in progress_data:
                        progress_data["domain_findings"] = {}
                    self.progress = InvestigationProgress(**progress_data)
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass

        # Handle settings field
        if self.settings is None:
            settings_json_str = getattr(self, "settings_json", None)
            if settings_json_str and isinstance(settings_json_str, str):
                try:
                    settings_data = json.loads(settings_json_str)
                    self.settings = InvestigationSettings(**settings_data)
                except (json.JSONDecodeError, TypeError, ValueError) as e:
                    # Log deserialization error for debugging
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.error(
                        f"Failed to deserialize settings_json for investigation {self.investigation_id}: "
                        f"{type(e).__name__}: {str(e)}"
                    )
                    logger.debug(
                        f"Settings data that failed: {settings_data if 'settings_data' in locals() else 'JSON parse failed'}"
                    )

        return self


# Error Response Models
class ErrorDetail(BaseModel):
    """Error detail information."""

    message: str
    field: Optional[str] = None
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
    details: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None


class ConflictResponse(BaseModel):
    """409 Conflict response for version mismatch."""

    error: str = "Version conflict"
    current_version: int
    provided_version: int
    message: str = "The resource has been modified. Please refresh and retry."


class RateLimitResponse(BaseModel):
    """429 Too Many Requests response."""

    error: str = "Rate limit exceeded"
    retry_after_seconds: int
    limit: int
    remaining: int = 0
    reset_at: datetime

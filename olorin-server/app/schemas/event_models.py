"""
Event Models Schema
Feature: 001-investigation-state-management

Provides Pydantic models for investigation events, event feeds, and summaries.
Supports cursor-based pagination and real-time event streaming.

SYSTEM MANDATE Compliance:
- No hardcoded values: All fields with proper validation
- Complete implementation: Full Pydantic models with validations
- Type-safe: All fields properly typed with descriptions
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ActorType(str, Enum):
    """Types of actors that can generate events."""
    SYSTEM = "system"
    USER = "user"
    WEBHOOK = "webhook"
    POLLING = "polling"


class OperationType(str, Enum):
    """Types of operations on entities."""
    APPEND = "append"
    UPDATE = "update"
    DELETE = "delete"


class EntityType(str, Enum):
    """Types of entities that can be modified."""
    ANOMALY = "anomaly"
    RELATIONSHIP = "relationship"
    NOTE = "note"
    STATUS = "status"
    PHASE = "phase"
    TOOL_EXECUTION = "tool_execution"
    LIFECYCLE_STAGE = "lifecycle_stage"
    SETTINGS = "settings"
    PROGRESS = "progress"
    RESULTS = "results"


class Actor(BaseModel):
    """Actor information for event source attribution."""

    type: ActorType = Field(
        ...,
        description="Type of actor generating the event"
    )
    user_id: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User ID if actor type is 'user'"
    )
    service: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Service name if actor type is 'system' or 'webhook'"
    )

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v: Optional[str], info) -> Optional[str]:
        """Ensure user_id is provided when actor type is user."""
        if info.data.get("type") == ActorType.USER and not v:
            raise ValueError("user_id is required when actor type is 'user'")
        return v

    @field_validator("service")
    @classmethod
    def validate_service(cls, v: Optional[str], info) -> Optional[str]:
        """Ensure service is provided when actor type is system or webhook."""
        actor_type = info.data.get("type")
        if actor_type in [ActorType.SYSTEM, ActorType.WEBHOOK] and not v:
            raise ValueError("service is required when actor type is 'system' or 'webhook'")
        return v


class InvestigationEvent(BaseModel):
    """Event representing a change in investigation state."""

    id: str = Field(
        ...,
        pattern=r"^\d{13}_\d{6}$",
        description="Event cursor ID in format: {timestamp_ms}_{sequence}"
    )
    investigation_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Investigation ID this event belongs to"
    )
    ts: str = Field(
        ...,
        description="ISO 8601 timestamp when event occurred"
    )
    actor: Actor = Field(
        ...,
        description="Information about who/what generated this event"
    )
    op: OperationType = Field(
        ...,
        description="Type of operation performed"
    )
    entity: EntityType = Field(
        ...,
        description="Type of entity that was modified"
    )
    payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Event-specific payload data"
    )

    @field_validator("ts")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        """Validate ISO 8601 timestamp format."""
        try:
            # Parse to validate format, but return original string
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError("Timestamp must be in ISO 8601 format")


class EventsFeedResponse(BaseModel):
    """Response model for event feed pagination."""

    items: List[InvestigationEvent] = Field(
        default_factory=list,
        description="List of events in chronological order"
    )
    next_cursor: Optional[str] = Field(
        None,
        pattern=r"^\d{13}_\d{6}$",
        description="Cursor for next page of results"
    )
    has_more: bool = Field(
        False,
        description="Whether more results exist after this page"
    )
    poll_after_seconds: Optional[int] = Field(
        None,
        ge=1,
        le=3600,
        description="Recommended seconds to wait before next poll"
    )
    etag: Optional[str] = Field(
        None,
        description="ETag for conditional requests (format: W/\"version-hash\")"
    )


class SummaryResponse(BaseModel):
    """Lightweight summary snapshot of investigation state."""

    investigation_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Investigation ID"
    )
    lifecycle_stage: str = Field(
        ...,
        description="Current lifecycle stage"
    )
    status: str = Field(
        ...,
        description="Current investigation status"
    )
    current_phase: Optional[str] = Field(
        None,
        description="Current execution phase if in progress"
    )
    progress_percentage: float = Field(
        0.0,
        ge=0.0,
        le=100.0,
        description="Overall progress percentage (0-100)"
    )
    created_at: datetime = Field(
        ...,
        description="Investigation creation timestamp"
    )
    updated_at: datetime = Field(
        ...,
        description="Last update timestamp"
    )
    etag: Optional[str] = Field(
        None,
        description="ETag for conditional requests"
    )

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
"""
UnifiedLog Pydantic Model
Feature: 021-live-merged-logstream

Normalized log record representing a single log entry from any source (frontend or backend).
Supports real-time streaming, merging, deduplication, and PII redaction.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/data-model.md
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Literal
from datetime import datetime
import uuid


class UnifiedLog(BaseModel):
    """
    Unified log entry normalized from any source.

    Used for live merged log streaming across frontend and backend systems.
    Supports SSE streaming, polling fallback, and deduplication.
    """

    # Identity
    event_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique event identifier for deduplication"
    )

    # Timestamp and ordering
    ts: datetime = Field(
        description="ISO 8601 timestamp when log was emitted"
    )
    seq: int = Field(
        default=0,
        ge=0,
        description="Monotonic sequence number for ordering logs with same timestamp"
    )

    # Source identification
    source: Literal["frontend", "backend"] = Field(
        description="Which system emitted this log"
    )
    service: str = Field(
        min_length=1,
        description="Service name within the source (e.g., 'investigation-service', 'react-app')"
    )

    # Log content
    level: Literal["DEBUG", "INFO", "WARN", "ERROR"] = Field(
        description="Log severity level"
    )
    message: str = Field(
        min_length=1,
        max_length=10000,
        description="Log message content (PII-redacted)"
    )

    # Correlation
    investigation_id: str = Field(
        min_length=1,
        description="Investigation ID this log belongs to"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation ID for tracing requests across services"
    )

    # Additional context
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional structured context data"
    )

    # Metadata
    schema_version: int = Field(
        default=1,
        description="Schema version for migration compatibility"
    )

    @field_validator('ts', mode='before')
    @classmethod
    def parse_timestamp(cls, v: Any) -> datetime:
        """
        Parse timestamp from ISO 8601 string or datetime object.

        Handles both string and datetime inputs with proper timezone handling.
        """
        if isinstance(v, str):
            # Replace 'Z' with '+00:00' for proper ISO 8601 parsing
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        elif isinstance(v, datetime):
            return v
        else:
            raise ValueError(f"Invalid timestamp type: {type(v)}")

    class Config:
        """Pydantic model configuration"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        # Allow extra fields for forward compatibility
        extra = 'ignore'
        # Validate on assignment
        validate_assignment = True


class UnifiedLogCreate(BaseModel):
    """
    Schema for creating new UnifiedLog entries.

    Used by log ingestion endpoints (e.g., POST /client-logs).
    event_id is optional (will be auto-generated if not provided).
    """

    event_id: Optional[str] = Field(
        default=None,
        description="Optional event ID (auto-generated if not provided)"
    )
    ts: datetime = Field(
        description="ISO 8601 timestamp when log was emitted"
    )
    seq: int = Field(
        default=0,
        ge=0,
        description="Monotonic sequence number"
    )
    source: Literal["frontend", "backend"] = Field(
        description="Which system emitted this log"
    )
    service: str = Field(
        min_length=1,
        description="Service name within the source"
    )
    level: Literal["DEBUG", "INFO", "WARN", "ERROR"] = Field(
        description="Log severity level"
    )
    message: str = Field(
        min_length=1,
        max_length=10000,
        description="Log message content"
    )
    investigation_id: str = Field(
        min_length=1,
        description="Investigation ID this log belongs to"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation ID"
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional structured context"
    )
    schema_version: int = Field(
        default=1,
        description="Schema version"
    )

    @field_validator('ts', mode='before')
    @classmethod
    def parse_timestamp(cls, v: Any) -> datetime:
        """Parse timestamp from ISO 8601 string or datetime object"""
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        elif isinstance(v, datetime):
            return v
        else:
            raise ValueError(f"Invalid timestamp type: {type(v)}")

    def to_unified_log(self) -> UnifiedLog:
        """Convert to UnifiedLog with auto-generated event_id if needed"""
        data = self.model_dump()
        if not data.get('event_id'):
            data['event_id'] = str(uuid.uuid4())
        return UnifiedLog(**data)

    class Config:
        """Pydantic model configuration"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        extra = 'ignore'
        validate_assignment = True

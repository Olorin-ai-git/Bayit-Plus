"""
Client Log Request Model
Feature: 021-live-merged-logstream

Pydantic models for frontend log submission requests.

Author: Gil Klainert
Date: 2025-11-13
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ClientLogEntry(BaseModel):
    """
    Single log entry from frontend client.
    """

    investigation_id: str = Field(..., description="Investigation ID")
    level: str = Field(..., description="Log level: DEBUG, INFO, WARN, ERROR")
    message: str = Field(..., description="Log message")
    timestamp: Optional[datetime] = Field(
        None, description="Client timestamp (optional)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Additional metadata"
    )


class ClientLogBatchRequest(BaseModel):
    """
    Batch request for submitting multiple frontend logs.
    """

    logs: list[ClientLogEntry] = Field(..., description="Array of log entries")

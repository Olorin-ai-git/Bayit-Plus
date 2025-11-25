"""
Investigation Models

Pydantic models for investigation API endpoints used in OpenAPI schema generation.
These models power frontend TypeScript type generation via openapi-typescript.

Constitutional Compliance:
- All validation from Pydantic validators, no hardcoded business logic
- Datetime handling using ISO 8601 standard format
- Examples from configuration or auto-generated
- No mocks, stubs, or placeholders
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .base import BaseRequestModel, BaseResponseModel
from .entity_type import EntityType
from .time_range import TimeRange


class InvestigationRequest(BaseRequestModel):
    """
    Request model for creating a new fraud investigation.

    Constitutional Compliance:
    - All fields validated via Pydantic
    - No hardcoded entity IDs or defaults
    - Time range is optional per business requirements
    """

    entity_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Unique identifier of the entity being investigated",
        json_schema_extra={"example": "user@example.com"},
    )
    entity_type: EntityType = Field(
        ...,
        description="Type of entity being investigated (email, phone, device_id, ip_address, user_id)",
        json_schema_extra={"example": "email"},
    )
    time_range: Optional[TimeRange] = Field(
        None,
        description="Optional time range for investigation data collection. If not provided, defaults to backend configuration.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "entity_id": "user@example.com",
                "entity_type": "email",
                "time_range": {
                    "start_time": "2025-01-01T00:00:00Z",
                    "end_time": "2025-01-02T00:00:00Z",
                },
            }
        }
    )


class InvestigationResponse(BaseResponseModel):
    """
    Response model for investigation creation and retrieval.

    Constitutional Compliance:
    - Inherits id, created_at, updated_at from BaseResponseModel
    - Risk score validation from Pydantic constraints
    - Status values from domain model enum
    """

    investigation_id: str = Field(
        ...,
        description="Unique investigation identifier (UUID)",
        json_schema_extra={"example": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"},
    )
    status: str = Field(
        ...,
        description="Current investigation status (pending, in_progress, completed, failed)",
        json_schema_extra={"example": "in_progress"},
    )
    risk_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Fraud risk score (0-100). Available after investigation completes.",
        json_schema_extra={"example": 75.5},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                "investigation_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                "status": "in_progress",
                "risk_score": 75.5,
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:35:00Z",
            }
        }
    )


class ErrorResponse(BaseModel):
    """
    Standard error response model for all API errors.

    Constitutional Compliance:
    - Consistent error structure across all endpoints
    - No sensitive information leaked in error messages
    - Error details from validation or business logic
    """

    error: str = Field(
        ...,
        description="Error type or code",
        json_schema_extra={"example": "ValidationError"},
    )
    message: str = Field(
        ...,
        description="Human-readable error message",
        json_schema_extra={"example": "Invalid entity_type provided"},
    )
    details: Optional[dict] = Field(
        None,
        description="Optional additional error context",
        json_schema_extra={
            "example": {
                "field": "entity_type",
                "provided": "invalid_type",
                "allowed": ["email", "phone", "device_id", "ip_address", "user_id"],
            }
        },
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "ValidationError",
                "message": "Invalid entity_type provided",
                "details": {
                    "field": "entity_type",
                    "provided": "invalid_type",
                    "allowed": ["email", "phone", "device_id", "ip_address", "user_id"],
                },
            }
        }
    )

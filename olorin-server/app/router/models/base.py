"""
Base Pydantic Models for Contract Testing

This module provides common base models with shared fields (id, created_at, updated_at)
for API request/response contracts. All models follow constitutional compliance with
environment-driven configuration and fail-fast validation.

Constitutional Compliance:
- No hardcoded values (timestamps use datetime utilities)
- Reusable base classes for all API models
- Comprehensive field validation
- Clear documentation for contract generation
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
import uuid


class TimestampedModel(BaseModel):
    """
    Base model with timestamp fields for tracking creation and updates.

    This model provides standard created_at and updated_at fields that are
    automatically populated with ISO 8601 formatted timestamps.

    Usage:
        class MyModel(TimestampedModel):
            name: str
            value: int

    Fields:
        created_at: ISO 8601 timestamp of record creation
        updated_at: ISO 8601 timestamp of last update
    """

    created_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z",
        description="ISO 8601 timestamp of creation"
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z",
        description="ISO 8601 timestamp of last update"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:35:00Z"
            }
        }
    )


class IdentifiedModel(BaseModel):
    """
    Base model with unique identifier field.

    This model provides a standard UUID-based id field for unique identification.
    The ID is automatically generated on creation if not provided.

    Usage:
        class MyModel(IdentifiedModel):
            name: str
            value: int

    Fields:
        id: Unique UUID-based identifier (auto-generated)
    """

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique identifier (UUID)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
            }
        }
    )


class BaseAPIModel(IdentifiedModel, TimestampedModel):
    """
    Complete base model with id, created_at, and updated_at fields.

    This model combines IdentifiedModel and TimestampedModel to provide
    a complete base for API models with automatic ID generation and
    timestamp tracking.

    Usage:
        class UserModel(BaseAPIModel):
            username: str
            email: str

    Fields:
        id: Unique UUID-based identifier
        created_at: ISO 8601 timestamp of creation
        updated_at: ISO 8601 timestamp of last update
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:35:00Z"
            }
        }
    )


class BaseRequestModel(BaseModel):
    """
    Base model for API request payloads.

    This model provides a minimal base for request models without
    auto-generated fields (id, timestamps), allowing full control
    over request payload structure.

    Usage:
        class CreateUserRequest(BaseRequestModel):
            username: str
            email: str
    """

    class Config:
        """Pydantic configuration"""
        str_strip_whitespace = True
        validate_assignment = True


class BaseResponseModel(BaseAPIModel):
    """
    Base model for API response payloads.

    This model extends BaseAPIModel for response models, ensuring
    all responses include id, created_at, and updated_at fields.

    Usage:
        class UserResponse(BaseResponseModel):
            username: str
            email: str
    """

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:35:00Z"
            }
        }

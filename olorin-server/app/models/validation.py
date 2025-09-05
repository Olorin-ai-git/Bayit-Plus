"""
Enhanced input validation models with security constraints
"""

import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, validator
from app.utils.entity_validation import validate_entity_type_against_enum


class SecureString(BaseModel):
    """Base class for strings with security validation."""

    @validator("*", pre=True)
    def validate_no_scripts(cls, v):
        """Prevent script injection in string fields."""
        if isinstance(v, str):
            # Check for common script patterns
            dangerous_patterns = [
                r"<script[^>]*>.*?</script>",
                r"javascript:",
                r"on\w+\s*=",
                r"vbscript:",
                r"data:text/html",
                r"<iframe[^>]*>.*?</iframe>",
            ]

            for pattern in dangerous_patterns:
                if re.search(pattern, v, re.IGNORECASE | re.DOTALL):
                    raise ValueError(f"Potentially dangerous content detected")

            # Limit string length to prevent DoS
            if len(v) > 10000:
                raise ValueError("String too long")

        return v


class ValidatedUserID(BaseModel):
    """Validated user ID with security constraints."""

    user_id: str = Field(
        ..., min_length=1, max_length=200, description="User identifier"
    )

    @validator("user_id")
    def validate_user_id(cls, v):
        """Validate user ID format."""
        # Allow alphanumeric, hyphens, underscores, periods, and @ symbol
        if not re.match(r"^[a-zA-Z0-9._@-]+$", v):
            raise ValueError("User ID contains invalid characters")
        return v


class ValidatedDeviceID(BaseModel):
    """Validated device ID with security constraints."""

    device_id: str = Field(
        ..., min_length=1, max_length=200, description="Device identifier"
    )

    @validator("device_id")
    def validate_device_id(cls, v):
        """Validate device ID format."""
        # Allow alphanumeric and hyphens (typical for device IDs)
        if not re.match(r"^[a-zA-Z0-9-]+$", v):
            raise ValueError("Device ID contains invalid characters")
        return v


class ValidatedInvestigationID(BaseModel):
    """Validated investigation ID with security constraints."""

    investigation_id: str = Field(
        ..., min_length=1, max_length=100, description="Investigation identifier"
    )

    @validator("investigation_id")
    def validate_investigation_id(cls, v):
        """Validate investigation ID format."""
        # Allow alphanumeric, hyphens, and underscores
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Investigation ID contains invalid characters")
        return v


class ValidatedTimeRange(BaseModel):
    """Validated time range with security constraints."""

    time_range: str = Field(..., description="Time range for analysis")

    @validator("time_range")
    def validate_time_range(cls, v):
        """Validate time range format."""
        # Allow specific time range patterns like '30d', '7d', '1h', etc.
        if not re.match(r"^\d+[dhm]$", v):
            raise ValueError(
                "Time range must be in format: number followed by d/h/m (e.g., '30d', '7d', '1h')"
            )

        # Extract number and unit
        match = re.match(r"^(\d+)([dhm])$", v)
        if match:
            number, unit = match.groups()
            number = int(number)

            # Set reasonable limits
            if unit == "d" and number > 365:  # Max 1 year
                raise ValueError("Time range cannot exceed 365 days")
            elif unit == "h" and number > 8760:  # Max 1 year in hours
                raise ValueError("Time range cannot exceed 8760 hours")
            elif unit == "m" and number > 525600:  # Max 1 year in minutes
                raise ValueError("Time range cannot exceed 525600 minutes")

        return v


class ValidatedEntityType(BaseModel):
    """Comprehensive entity type validation supporting all EntityType enum values."""

    entity_type: str = Field(
        ..., 
        min_length=1,
        max_length=100,
        description="Type of entity being analyzed"
    )

    @validator("entity_type")
    def validate_entity_type(cls, v):
        """Validate entity type against EntityType enum with comprehensive security checks."""
        is_valid, error_message = validate_entity_type_against_enum(v)
        if not is_valid:
            raise ValueError(error_message)
        
        return v.strip().lower()


class ValidatedAnalysisMode(BaseModel):
    """Validated analysis mode with restricted values."""

    mode: Literal["manual", "autonomous"] = Field(..., description="Analysis mode")


class ValidatedComment(SecureString):
    """Validated comment with length constraints."""

    comment: str = Field(..., min_length=1, max_length=5000, description="User comment")
    sender: Literal["Investigator", "Policy Team", "System Prompt Instructions"] = (
        Field(..., description="Comment sender role")
    )
    timestamp: Optional[datetime] = Field(
        default_factory=datetime.utcnow, description="Comment timestamp"
    )

    @validator("comment")
    def validate_comment_content(cls, v):
        """Additional validation for comment content."""
        # Remove extra whitespace
        v = v.strip()

        # Ensure not empty after stripping
        if not v:
            raise ValueError("Comment cannot be empty")

        return v


class ValidatedInvestigationRequest(BaseModel):
    """Validated request for investigation analysis."""

    entity_id: str = Field(
        ..., min_length=1, max_length=200, description="Entity identifier"
    )
    entity_type: str = Field(
        ..., min_length=1, max_length=100, description="Type of entity"
    )
    investigation_id: str = Field(
        ..., min_length=1, max_length=100, description="Investigation identifier"
    )
    time_range: str = Field(..., description="Time range for analysis")
    mode: Optional[Literal["manual", "autonomous"]] = Field(
        default="manual", description="Analysis mode"
    )

    @validator("entity_id")
    def validate_entity_id(cls, v):
        """Validate entity ID format."""
        if not re.match(r"^[a-zA-Z0-9._@-]+$", v):
            raise ValueError("Entity ID contains invalid characters")
        return v

    @validator("entity_type")
    def validate_entity_type(cls, v):
        """Validate entity type against EntityType enum with comprehensive security checks."""
        is_valid, error_message = validate_entity_type_against_enum(v)
        if not is_valid:
            raise ValueError(error_message)
        
        return v.strip().lower()

    @validator("investigation_id")
    def validate_investigation_id(cls, v):
        """Validate investigation ID format."""
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Investigation ID contains invalid characters")
        return v

    @validator("time_range")
    def validate_time_range(cls, v):
        """Validate time range format."""
        if not re.match(r"^\d+[dhm]$", v):
            raise ValueError("Time range must be in format: number followed by d/h/m")
        return v


class ValidatedSearchQuery(SecureString):
    """Validated search query with security constraints."""

    query: str = Field(..., min_length=1, max_length=1000, description="Search query")

    @validator("query")
    def validate_search_query(cls, v):
        """Validate search query for security."""
        # Remove potential SQL injection patterns
        dangerous_sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
            r"(--|#|\/\*|\*\/)",
            r"(\bUNION\b.*\bSELECT\b)",
            r"(\bOR\b.*=.*)",
            r"(;|\||&)",
        ]

        for pattern in dangerous_sql_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Query contains potentially dangerous SQL patterns")

        return v.strip()


class RateLimitInfo(BaseModel):
    """Rate limit information for API responses."""

    limit: int = Field(..., description="Rate limit")
    remaining: int = Field(..., description="Remaining requests")
    reset_time: int = Field(..., description="Reset timestamp")
    retry_after: Optional[int] = Field(None, description="Retry after seconds")

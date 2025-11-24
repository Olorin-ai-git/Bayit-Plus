"""
External API Configuration Schema

Configuration for external fraud detection API integrations including
IP reputation, email verification, phone validation, and credit bureau services.
"""

import os
from typing import Optional
from pydantic import BaseModel, Field, validator
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RateLimitConfig(BaseModel):
    """Rate limiting configuration for API endpoints."""

    calls: int = Field(..., description="Number of calls allowed per period")
    period_seconds: int = Field(..., description="Time period in seconds")

    @validator("calls")
    def validate_calls(cls, v):
        if v <= 0:
            raise ValueError("Rate limit calls must be positive")
        return v

    @validator("period_seconds")
    def validate_period(cls, v):
        if v <= 0:
            raise ValueError("Rate limit period must be positive")
        return v


class ServiceEndpointConfig(BaseModel):
    """Configuration for an external API service endpoint."""

    endpoint_url: str = Field(..., description="Service endpoint URL")
    api_key: str = Field(..., description="API authentication key")
    timeout_seconds: int = Field(30, description="Request timeout in seconds")
    max_retries: int = Field(3, description="Maximum retry attempts")
    rate_limit: RateLimitConfig = Field(..., description="Rate limiting configuration")

    @validator("endpoint_url")
    def validate_url(cls, v):
        if not v or v == "<service-url>" or v == "<url>":
            raise ValueError(f"Invalid endpoint URL: {v}. Must be configured in environment.")
        if not v.startswith(("http://", "https://")):
            raise ValueError(f"Endpoint URL must start with http:// or https://: {v}")
        return v

    @validator("api_key")
    def validate_api_key(cls, v):
        if not v or v == "<secret-manager>" or v == "YOUR_API_KEY":
            raise ValueError("Invalid API key. Must be configured from secret manager.")
        if len(v) < 10:
            raise ValueError("API key appears invalid (too short)")
        return v

    @validator("timeout_seconds")
    def validate_timeout(cls, v):
        if v <= 0 or v > 300:
            raise ValueError("Timeout must be between 1 and 300 seconds")
        return v

    @validator("max_retries")
    def validate_retries(cls, v):
        if v < 0 or v > 10:
            raise ValueError("Max retries must be between 0 and 10")
        return v


class ExternalAPIConfig(BaseModel):
    """Complete external API configuration."""

    # IP Reputation Service
    ip_reputation: ServiceEndpointConfig

    # Email Verification Service
    email_verification: ServiceEndpointConfig

    # Phone Validation Service
    phone_validation: ServiceEndpointConfig

    # Credit Bureau Service
    credit_bureau: ServiceEndpointConfig

    # Global settings
    enable_caching: bool = Field(True, description="Enable API response caching")
    cache_ttl_seconds: int = Field(3600, description="Cache time-to-live in seconds")

    @validator("cache_ttl_seconds")
    def validate_cache_ttl(cls, v):
        if v < 0:
            raise ValueError("Cache TTL must be non-negative")
        return v

    class Config:
        validate_assignment = True


def load_external_api_config() -> ExternalAPIConfig:
    """
    Load and validate external API configuration from environment variables.

    Returns:
        Validated ExternalAPIConfig instance

    Raises:
        ValueError: If configuration is invalid or missing required values
        RuntimeError: If configuration fails to load
    """
    try:
        config = ExternalAPIConfig(
            ip_reputation=ServiceEndpointConfig(
                endpoint_url=os.getenv("EXTERNAL_API_IP_REPUTATION_ENDPOINT", ""),
                api_key=os.getenv("EXTERNAL_API_IP_REPUTATION_KEY", ""),
                timeout_seconds=int(os.getenv("EXTERNAL_API_TIMEOUT_SECONDS", "30")),
                max_retries=int(os.getenv("EXTERNAL_API_MAX_RETRIES", "3")),
                rate_limit=RateLimitConfig(
                    calls=int(os.getenv("RATE_LIMIT_IP_REPUTATION_CALLS", "100")),
                    period_seconds=int(os.getenv("RATE_LIMIT_IP_REPUTATION_PERIOD", "60"))
                )
            ),
            email_verification=ServiceEndpointConfig(
                endpoint_url=os.getenv("EXTERNAL_API_EMAIL_VERIFICATION_ENDPOINT", ""),
                api_key=os.getenv("EXTERNAL_API_EMAIL_VERIFICATION_KEY", ""),
                timeout_seconds=int(os.getenv("EXTERNAL_API_TIMEOUT_SECONDS", "30")),
                max_retries=int(os.getenv("EXTERNAL_API_MAX_RETRIES", "3")),
                rate_limit=RateLimitConfig(
                    calls=int(os.getenv("RATE_LIMIT_EMAIL_VERIFICATION_CALLS", "50")),
                    period_seconds=int(os.getenv("RATE_LIMIT_EMAIL_VERIFICATION_PERIOD", "60"))
                )
            ),
            phone_validation=ServiceEndpointConfig(
                endpoint_url=os.getenv("EXTERNAL_API_PHONE_VALIDATION_ENDPOINT", ""),
                api_key=os.getenv("EXTERNAL_API_PHONE_VALIDATION_KEY", ""),
                timeout_seconds=int(os.getenv("EXTERNAL_API_TIMEOUT_SECONDS", "30")),
                max_retries=int(os.getenv("EXTERNAL_API_MAX_RETRIES", "3")),
                rate_limit=RateLimitConfig(
                    calls=int(os.getenv("RATE_LIMIT_PHONE_VALIDATION_CALLS", "50")),
                    period_seconds=int(os.getenv("RATE_LIMIT_PHONE_VALIDATION_PERIOD", "60"))
                )
            ),
            credit_bureau=ServiceEndpointConfig(
                endpoint_url=os.getenv("EXTERNAL_API_CREDIT_BUREAU_ENDPOINT", ""),
                api_key=os.getenv("EXTERNAL_API_CREDIT_BUREAU_KEY", ""),
                timeout_seconds=int(os.getenv("EXTERNAL_API_TIMEOUT_SECONDS", "30")),
                max_retries=int(os.getenv("EXTERNAL_API_MAX_RETRIES", "3")),
                rate_limit=RateLimitConfig(
                    calls=int(os.getenv("RATE_LIMIT_CREDIT_BUREAU_CALLS", "10")),
                    period_seconds=int(os.getenv("RATE_LIMIT_CREDIT_BUREAU_PERIOD", "60"))
                )
            ),
            enable_caching=os.getenv("EXTERNAL_API_ENABLE_CACHING", "true").lower() == "true",
            cache_ttl_seconds=int(os.getenv("EXTERNAL_API_CACHE_TTL_SECONDS", "3600"))
        )

        logger.info("External API configuration loaded successfully")
        return config

    except ValueError as e:
        logger.error(f"Configuration validation failed: {e}")
        raise RuntimeError(f"Invalid external API configuration – refusing to start: {e}")
    except Exception as e:
        logger.error(f"Failed to load external API configuration: {e}")
        raise RuntimeError(f"Configuration load failed – refusing to start: {e}")

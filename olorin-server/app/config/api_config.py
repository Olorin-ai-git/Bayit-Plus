"""
API Configuration Schema for Contract Testing

This module defines the configuration schema for API endpoints, OpenAPI generation,
and contract testing. All values MUST come from environment variables with fail-fast
validation.

Constitutional Compliance:
- NO hardcoded values (all from environment variables)
- Pydantic validation with fail-fast behavior
- No defaults for required configuration
- Clear error messages for missing configuration
"""

import os
from pydantic import Field, field_validator, AnyHttpUrl
from pydantic_settings import BaseSettings
from typing import Literal


class APIConfig(BaseSettings):
    """
    API Configuration with environment variable validation.

    All values MUST be provided via environment variables.
    Missing required values will cause startup failure.
    """

    # Backend URL configuration
    backend_url: AnyHttpUrl = Field(
        ...,
        env="API_BASE_URL",
        description="Backend API base URL (e.g., http://localhost:8090)"
    )

    # Request timeout configuration
    request_timeout_ms: int = Field(
        ...,
        env="REQUEST_TIMEOUT_MS",
        description="Default API request timeout in milliseconds",
        gt=0,
        le=300000  # Max 5 minutes
    )

    # Contract testing configuration
    contract_test_timeout_ms: int = Field(
        ...,
        env="CONTRACT_TEST_TIMEOUT_MS",
        description="Timeout for contract test execution in milliseconds",
        gt=0,
        le=600000  # Max 10 minutes
    )

    # OpenAPI schema configuration
    enable_openapi_schema_generation: bool = Field(
        ...,
        env="ENABLE_OPENAPI_SCHEMA_GENERATION",
        description="Enable automatic OpenAPI schema generation"
    )

    openapi_schema_path: str = Field(
        ...,
        env="OPENAPI_SCHEMA_PATH",
        description="URL path for OpenAPI schema endpoint (e.g., /openapi.json)"
    )

    @field_validator("openapi_schema_path")
    @classmethod
    def validate_schema_path(cls, v: str) -> str:
        """Validate that schema path starts with /"""
        if not v.startswith("/"):
            raise ValueError("OpenAPI schema path must start with /")
        if not v.endswith(".json"):
            raise ValueError("OpenAPI schema path must end with .json")
        return v

    @field_validator("request_timeout_ms", "contract_test_timeout_ms")
    @classmethod
    def validate_timeout_ms(cls, v: int) -> int:
        """Validate timeout values are reasonable"""
        if v < 1000:
            raise ValueError("Timeout must be at least 1000ms (1 second)")
        return v

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ignore extra environment variables not defined in this config
    }


def load_api_config() -> APIConfig:
    """
    Load and validate API configuration from environment variables.

    Returns:
        APIConfig: Validated configuration object

    Raises:
        ValueError: If required environment variables are missing or invalid
        RuntimeError: If configuration validation fails
    """
    try:
        config = APIConfig()
        return config
    except Exception as e:
        error_msg = f"""
        ========================================
        API CONFIGURATION ERROR - STARTUP FAILED
        ========================================

        Failed to load API configuration from environment variables.

        Error: {str(e)}

        Required Environment Variables:
        - API_BASE_URL: Backend API base URL (e.g., http://localhost:8090)
        - REQUEST_TIMEOUT_MS: Request timeout in milliseconds (1000-300000)
        - CONTRACT_TEST_TIMEOUT_MS: Contract test timeout in milliseconds (1000-600000)
        - ENABLE_OPENAPI_SCHEMA_GENERATION: Enable schema generation (true/false)
        - OPENAPI_SCHEMA_PATH: OpenAPI schema endpoint path (must start with / and end with .json)

        Example .env configuration:
        API_BASE_URL=http://localhost:8090
        REQUEST_TIMEOUT_MS=30000
        CONTRACT_TEST_TIMEOUT_MS=60000
        ENABLE_OPENAPI_SCHEMA_GENERATION=true
        OPENAPI_SCHEMA_PATH=/openapi.json

        ========================================
        """
        raise RuntimeError(error_msg) from e


# Global configuration instance
# This is initialized once at module import and cached
_api_config: APIConfig | None = None


def get_api_config() -> APIConfig:
    """
    Get the global API configuration instance.

    Configuration is loaded once and cached for performance.

    Returns:
        APIConfig: Global configuration instance

    Raises:
        RuntimeError: If configuration cannot be loaded
    """
    global _api_config
    if _api_config is None:
        _api_config = load_api_config()
    return _api_config

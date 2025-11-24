#!/usr/bin/env python3
"""
Test Runner Configuration Module.

Externalized configuration for unified AI investigation test runner.
All hardcoded values moved to environment variables with validation.

Author: Gil Klainert
Date: 2025-11-12
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseSettings, Field, validator


class TestRunnerConfig(BaseSettings):
    """Test runner configuration with environment variable support."""

    # Server configuration
    server_url: str = Field(
        ...,
        env="TEST_RUNNER_SERVER_URL",
        description="Server endpoint URL for testing"
    )

    # Test execution configuration
    timeout: int = Field(
        default=300,
        env="TEST_RUNNER_TIMEOUT",
        description="Test timeout in seconds"
    )

    concurrent: int = Field(
        default=3,
        env="TEST_RUNNER_CONCURRENT",
        description="Number of concurrent tests to run"
    )

    csv_limit: int = Field(
        default=2000,
        env="TEST_RUNNER_CSV_LIMIT",
        description="Maximum number of CSV rows to process"
    )

    default_csv_file: Path = Field(
        ...,
        env="TEST_RUNNER_DEFAULT_CSV_FILE",
        description="Path to default CSV file for testing"
    )

    # Logging configuration
    log_level: str = Field(
        default="INFO",
        env="TEST_RUNNER_LOG_LEVEL",
        description="Logging level (DEBUG, INFO, WARNING, ERROR)"
    )

    # Feature flags
    use_mock_ips_cache: bool = Field(
        default=False,
        env="TEST_RUNNER_USE_MOCK_IPS",
        description="Use mocked IPS cache for testing"
    )

    # Retry configuration
    max_retry_attempts: int = Field(
        default=3,
        env="TEST_RUNNER_MAX_RETRIES",
        description="Maximum number of retry attempts"
    )

    retry_delay_seconds: int = Field(
        default=5,
        env="TEST_RUNNER_RETRY_DELAY",
        description="Delay between retry attempts in seconds"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False

    @validator("timeout")
    def validate_timeout(cls, v):
        """Ensure timeout is positive."""
        if v <= 0:
            raise ValueError("timeout must be positive")
        return v

    @validator("concurrent")
    def validate_concurrent(cls, v):
        """Ensure concurrent count is positive."""
        if v <= 0:
            raise ValueError("concurrent must be positive")
        return v

    @validator("csv_limit")
    def validate_csv_limit(cls, v):
        """Ensure CSV limit is positive."""
        if v <= 0:
            raise ValueError("csv_limit must be positive")
        return v

    @validator("default_csv_file")
    def validate_csv_file_path(cls, v: Path) -> Path:
        """Ensure CSV file path is absolute."""
        if not v.is_absolute():
            raise ValueError("default_csv_file must be an absolute path")
        return v

    @validator("log_level")
    def validate_log_level(cls, v: str) -> str:
        """Ensure log level is valid."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.upper()


def load_test_runner_config() -> TestRunnerConfig:
    """
    Load and validate test runner configuration.

    Returns:
        Validated configuration object

    Raises:
        ValueError: If configuration is invalid or missing required values
    """
    try:
        return TestRunnerConfig()
    except Exception as e:
        raise ValueError(
            f"Invalid test runner configuration. "
            f"Please ensure all required environment variables are set: {e}"
        )


# Singleton instance for global access
_config_instance: Optional[TestRunnerConfig] = None


def get_test_runner_config() -> TestRunnerConfig:
    """
    Get singleton configuration instance.

    Returns:
        Singleton configuration object
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = load_test_runner_config()
    return _config_instance

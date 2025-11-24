#!/usr/bin/env python3
"""
Recovery Automation Configuration.

Externalized configuration for recovery automation service.
All hardcoded values moved to environment variables with validation.

Author: Gil Klainert
Date: 2025-11-12
"""

import os
from typing import Dict, Any
from pydantic import BaseSettings, Field, validator


class ServiceEndpointConfig(BaseSettings):
    """Service endpoint configuration."""

    backend_health_url: str = Field(
        ...,
        env="RECOVERY_BACKEND_HEALTH_URL",
        description="Backend service health endpoint URL"
    )

    frontend_health_url: str = Field(
        ...,
        env="RECOVERY_FRONTEND_HEALTH_URL",
        description="Frontend service health endpoint URL"
    )

    backend_restart_command: str = Field(
        ...,
        env="RECOVERY_BACKEND_RESTART_CMD",
        description="Command to restart backend service"
    )

    frontend_restart_command: str = Field(
        ...,
        env="RECOVERY_FRONTEND_RESTART_CMD",
        description="Command to restart frontend service"
    )


class RecoveryAutomationConfig(BaseSettings):
    """Recovery automation configuration with validation."""

    # Service configuration
    services: ServiceEndpointConfig = Field(default_factory=ServiceEndpointConfig)

    # Backup configuration
    backup_directory: str = Field(
        ...,
        env="RECOVERY_BACKUP_DIR",
        description="Directory for service backups"
    )

    # Recovery timeouts
    service_restart_timeout_seconds: int = Field(
        default=60,
        env="RECOVERY_RESTART_TIMEOUT",
        description="Timeout for service restart operations"
    )

    health_check_timeout_seconds: int = Field(
        default=30,
        env="RECOVERY_HEALTH_CHECK_TIMEOUT",
        description="Timeout for health check operations"
    )

    configuration_change_timeout_seconds: int = Field(
        default=45,
        env="RECOVERY_CONFIG_CHANGE_TIMEOUT",
        description="Timeout for configuration change operations"
    )

    # Retry configuration
    max_retry_attempts: int = Field(
        default=3,
        env="RECOVERY_MAX_RETRIES",
        description="Maximum number of retry attempts"
    )

    retry_delay_seconds: int = Field(
        default=5,
        env="RECOVERY_RETRY_DELAY",
        description="Delay between retry attempts"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False

    @validator("backup_directory")
    def validate_backup_directory(cls, v):
        """Ensure backup directory path is absolute."""
        if not os.path.isabs(v):
            raise ValueError("backup_directory must be an absolute path")
        return v


def load_recovery_config() -> RecoveryAutomationConfig:
    """
    Load and validate recovery automation configuration.

    Returns:
        Validated configuration object

    Raises:
        ValueError: If configuration is invalid or missing required values
    """
    try:
        return RecoveryAutomationConfig()
    except Exception as e:
        raise ValueError(
            f"Invalid recovery automation configuration. "
            f"Please ensure all required environment variables are set: {e}"
        )

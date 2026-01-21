"""
Unified configuration management for Olorin.ai ecosystem platforms.

Provides Pydantic-based settings with environment variable support,
validation, and sensible defaults for both platforms.
"""

import os
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Core settings for Olorin.ai platforms.

    Loads configuration from environment variables with `.env` file support.
    Subclass this in each platform to add platform-specific settings.
    """

    # Environment
    environment: str = Field(default="development", description="Deployment environment")
    debug: bool = Field(default=False, description="Debug mode")

    # API
    api_prefix: str = Field(default="/api/v1", description="API route prefix")
    api_title: str = Field(default="Olorin.ai API", description="API title")
    api_version: str = Field(default="1.0.0", description="API version")

    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, ge=1, le=65535, description="Server port")
    log_level: str = Field(default="INFO", description="Logging level")

    # JWT
    secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        description="JWT secret key",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_access_token_expire_minutes: int = Field(
        default=30,
        ge=1,
        le=1440,
        description="Access token expiration in minutes",
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7,
        ge=1,
        le=365,
        description="Refresh token expiration in days",
    )

    # Database
    database_url: Optional[str] = Field(
        default=None,
        description="Database connection URL",
    )
    database_name: Optional[str] = Field(
        default=None,
        description="Database name",
    )

    # Firebase
    firebase_project_id: Optional[str] = Field(
        default=None,
        description="Firebase project ID",
    )
    firebase_credentials: Optional[str] = Field(
        default=None,
        description="Firebase service account JSON path",
    )

    # GCP
    gcp_project_id: Optional[str] = Field(
        default=None,
        description="GCP project ID",
    )
    gcp_region: str = Field(default="us-east1", description="GCP region")

    # CORS
    cors_origins: list[str] = Field(
        default=["*"],
        description="CORS allowed origins",
    )
    cors_credentials: bool = Field(default=True, description="CORS allow credentials")
    cors_methods: list[str] = Field(
        default=["*"],
        description="CORS allowed methods",
    )
    cors_headers: list[str] = Field(
        default=["*"],
        description="CORS allowed headers",
    )

    # Features
    enable_docs: bool = Field(default=True, description="Enable OpenAPI docs endpoint")
    enable_swagger: bool = Field(default=True, description="Enable Swagger UI")
    enable_redoc: bool = Field(default=True, description="Enable ReDoc UI")

    class Config:
        """Pydantic configuration."""

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Ensure secret key is set and not default in production."""
        if v == "dev-secret-key-change-in-production" and os.getenv("ENVIRONMENT") == "production":
            raise ValueError(
                "SECRET_KEY must be set in production. "
                "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return v

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: Optional[str], info) -> Optional[str]:
        """Validate database URL format if provided."""
        if v and not any(v.startswith(prefix) for prefix in ["mongodb://", "postgresql://", "mysql://"]):
            raise ValueError("Database URL must start with valid scheme (mongodb://, postgresql://, mysql://)")
        return v

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment.lower() in ["development", "dev"]

    @property
    def is_testing(self) -> bool:
        """Check if running in test mode."""
        return self.environment.lower() in ["test", "testing"]


# Global settings instance (lazily initialized)
_settings_instance: Optional[Settings] = None


def get_settings(settings_class: type[Settings] = Settings) -> Settings:
    """
    Get or create global settings instance.

    Args:
        settings_class: Settings class to instantiate (allows subclassing)

    Returns:
        Settings instance
    """
    global _settings_instance

    if _settings_instance is None or not isinstance(_settings_instance, settings_class):
        _settings_instance = settings_class()

    return _settings_instance


def reset_settings() -> None:
    """Reset global settings instance (useful for testing)."""
    global _settings_instance
    _settings_instance = None

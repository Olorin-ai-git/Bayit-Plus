"""
Security configuration for Olorin application
"""

import os
from typing import List, Optional

from pydantic import BaseModel


class SecurityConfig(BaseModel):
    """Security configuration settings."""

    # JWT Configuration - Environment Variable Required
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # CORS Configuration
    allowed_origins: List[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,https://localhost:3000"
    ).split(",")

    # Rate Limiting
    rate_limit_calls: int = int(os.getenv("RATE_LIMIT_CALLS", "60"))
    rate_limit_period: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))

    # CSRF Protection
    csrf_secret_key: Optional[str] = os.getenv("CSRF_SECRET_KEY")
    csrf_enabled: bool = os.getenv("CSRF_ENABLED", "true").lower() == "true"

    # Encryption - Environment Variables Required
    encryption_password: str = os.getenv("ENCRYPTION_PASSWORD")
    encryption_salt: str = os.getenv("ENCRYPTION_SALT")

    # Redis Security
    redis_url: str = os.getenv("REDIS_URL", "redis://default@redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com:13848")
    redis_api_key: Optional[str] = os.getenv("REDIS_API_KEY")
    redis_use_tls: bool = os.getenv("REDIS_USE_TLS", "false").lower() == "true"

    # Security Headers
    enable_security_headers: bool = (
        os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"
    )

    # API Keys
    olorin_api_key: str = os.getenv("OLORIN_API_KEY", "")
    olorin_app_secret: str = os.getenv("OLORIN_APP_SECRET", "")

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate critical environment variables on initialization
        if not self.jwt_secret_key:
            raise ValueError(
                "JWT_SECRET_KEY environment variable is required. "
                "Generate with: openssl rand -base64 64"
            )
        
        if not self.encryption_password:
            raise ValueError(
                "ENCRYPTION_PASSWORD environment variable is required. "
                "Generate with: openssl rand -base64 32"
            )
        
        if not self.encryption_salt:
            raise ValueError(
                "ENCRYPTION_SALT environment variable is required. "
                "Generate with: openssl rand -base64 16"
            )
    
    def validate_production_settings(self) -> List[str]:
        """Validate security settings for production deployment."""
        issues = []

        if self.is_production:
            # Validate required environment variables
            if not self.jwt_secret_key:
                issues.append("JWT_SECRET_KEY environment variable is required in production")
            elif len(self.jwt_secret_key) < 32:
                issues.append("JWT_SECRET_KEY must be at least 32 characters long in production")

            if not self.encryption_password:
                issues.append("ENCRYPTION_PASSWORD environment variable is required in production")
            elif len(self.encryption_password) < 32:
                issues.append("ENCRYPTION_PASSWORD must be at least 32 characters long in production")

            if not self.encryption_salt:
                issues.append("ENCRYPTION_SALT environment variable is required in production")
            elif len(self.encryption_salt) < 16:
                issues.append("ENCRYPTION_SALT must be at least 16 characters long in production")

            if not self.olorin_api_key:
                issues.append("OLORIN_API_KEY must be set in production")

            if not self.olorin_app_secret:
                issues.append("OLORIN_APP_SECRET must be set in production")

            if "http://localhost" in str(self.allowed_origins):
                issues.append(
                    "ALLOWED_ORIGINS should not include localhost in production"
                )

            if self.debug:
                issues.append("DEBUG should be disabled in production")

        return issues


# Global security configuration instance
_security_config = None


def get_security_config() -> SecurityConfig:
    """Get global security configuration instance."""
    global _security_config
    if _security_config is None:
        _security_config = SecurityConfig()
    return _security_config

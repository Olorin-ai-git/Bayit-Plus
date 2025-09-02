"""
Security configuration for Olorin application
"""

import os
from typing import List, Optional

from pydantic import BaseModel
from app.service.config_loader import ConfigLoader


class SecurityConfig(BaseModel):
    """Security configuration settings."""
    
    def __init__(self, **kwargs):
        # Initialize ConfigLoader for secrets
        config_loader = ConfigLoader()
        
        # Load secrets from Firebase Secret Manager
        jwt_secret_key = config_loader.load_secret("JWT_SECRET_KEY")
        csrf_secret_key = config_loader.load_secret("CSRF_SECRET_KEY")
        encryption_password = config_loader.load_secret("ENCRYPTION_PASSWORD")
        encryption_salt = config_loader.load_secret("ENCRYPTION_SALT")
        redis_api_key = config_loader.load_secret("REDIS_API_KEY")
        olorin_api_key = config_loader.load_secret("OLORIN_API_KEY")
        olorin_app_secret = config_loader.load_secret("OLORIN_APP_SECRET")
        
        # Set defaults for JWT configuration
        access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        
        # Set defaults for CORS configuration  
        allowed_origins = os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:3000,https://localhost:3000"
        ).split(",")
        
        # Set defaults for rate limiting
        rate_limit_calls = int(os.getenv("RATE_LIMIT_CALLS", "60"))
        rate_limit_period = int(os.getenv("RATE_LIMIT_PERIOD", "60"))
        
        # Set defaults for CSRF protection
        csrf_enabled = os.getenv("CSRF_ENABLED", "true").lower() == "true"
        
        # Set defaults for Redis security
        redis_url = os.getenv("REDIS_URL", "redis://default@redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com:13848")
        redis_use_tls = os.getenv("REDIS_USE_TLS", "false").lower() == "true"
        
        # Set defaults for security headers
        enable_security_headers = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"
        
        # Set defaults for environment
        environment = os.getenv("ENVIRONMENT", "development")
        debug = os.getenv("DEBUG", "false").lower() == "true"
        
        # Initialize parent with all values
        super().__init__(
            jwt_secret_key=jwt_secret_key,
            jwt_algorithm="HS256",
            access_token_expire_minutes=access_token_expire_minutes,
            allowed_origins=allowed_origins,
            rate_limit_calls=rate_limit_calls,
            rate_limit_period=rate_limit_period,
            csrf_secret_key=csrf_secret_key,
            csrf_enabled=csrf_enabled,
            encryption_password=encryption_password,
            encryption_salt=encryption_salt,
            redis_url=redis_url,
            redis_api_key=redis_api_key,
            redis_use_tls=redis_use_tls,
            enable_security_headers=enable_security_headers,
            olorin_api_key=olorin_api_key or "",
            olorin_app_secret=olorin_app_secret or "",
            environment=environment,
            debug=debug,
            **kwargs
        )
        
        # Validate critical secrets on initialization
        if not self.jwt_secret_key:
            raise ValueError(
                "JWT_SECRET_KEY secret is required in Firebase Secret Manager. "
                "Generate with: openssl rand -base64 64"
            )
        
        if not self.encryption_password:
            raise ValueError(
                "ENCRYPTION_PASSWORD secret is required in Firebase Secret Manager. "
                "Generate with: openssl rand -base64 32"
            )
        
        if not self.encryption_salt:
            raise ValueError(
                "ENCRYPTION_SALT secret is required in Firebase Secret Manager. "
                "Generate with: openssl rand -base64 16"
            )
    
    # JWT Configuration - From Firebase Secrets
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS Configuration
    allowed_origins: List[str]

    # Rate Limiting
    rate_limit_calls: int = 60
    rate_limit_period: int = 60

    # CSRF Protection
    csrf_secret_key: Optional[str] = None
    csrf_enabled: bool = True

    # Encryption - From Firebase Secrets
    encryption_password: str
    encryption_salt: str

    # Redis Security
    redis_url: str
    redis_api_key: Optional[str] = None
    redis_use_tls: bool = False

    # Security Headers
    enable_security_headers: bool = True

    # API Keys - From Firebase Secrets
    olorin_api_key: str = ""
    olorin_app_secret: str = ""

    # Environment
    environment: str = "development"
    debug: bool = False

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    def validate_production_settings(self) -> List[str]:
        """Validate security settings for production deployment."""
        issues = []

        if self.is_production:
            # Validate required secrets
            if not self.jwt_secret_key:
                issues.append("JWT_SECRET_KEY secret is required in Firebase Secret Manager for production")
            elif len(self.jwt_secret_key) < 32:
                issues.append("JWT_SECRET_KEY must be at least 32 characters long in production")

            if not self.encryption_password:
                issues.append("ENCRYPTION_PASSWORD secret is required in Firebase Secret Manager for production")
            elif len(self.encryption_password) < 32:
                issues.append("ENCRYPTION_PASSWORD must be at least 32 characters long in production")

            if not self.encryption_salt:
                issues.append("ENCRYPTION_SALT secret is required in Firebase Secret Manager for production")
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
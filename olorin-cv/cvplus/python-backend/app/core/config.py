"""
Configuration Management using Pydantic Settings
Follows Olorin ecosystem configuration patterns

INTEGRATES WITH:
- olorin-fraud: Fail-fast validation patterns
- bayit-plus: Pydantic BaseSettings
- olorin-shared: Centralized configuration
"""

from functools import lru_cache
from typing import List, Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    app_name: str = "Olorin CVPlus"
    environment: str = Field(default="production", env="APP_ENV")
    port: int = Field(default=8080, env="PORT")

    # URLs
    app_base_url: str = Field(..., env="APP_BASE_URL")
    api_base_url: str = Field(..., env="API_BASE_URL")

    # MongoDB Configuration (uses olorin-shared patterns)
    mongodb_uri: str = Field(..., env="MONGODB_URI")
    mongodb_db_name: str = Field(default="cvplus", env="MONGODB_DB_NAME")
    mongodb_max_pool_size: int = Field(default=100, env="MONGODB_MAX_POOL_SIZE")
    mongodb_min_pool_size: int = Field(default=20, env="MONGODB_MIN_POOL_SIZE")

    # Firebase/GCP
    firebase_project_id: str = Field(..., env="FIREBASE_PROJECT_ID")
    storage_bucket: str = Field(..., env="STORAGE_BUCKET")
    storage_region: str = Field(default="us-east1", env="STORAGE_REGION")

    # JWT Configuration
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")

    # AI Services
    anthropic_api_key: str = Field(..., env="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-3-sonnet-20240229", env="ANTHROPIC_MODEL")
    anthropic_max_tokens: int = Field(default=4096, env="ANTHROPIC_MAX_TOKENS")

    # Email
    email_service: str = Field(default="gmail", env="EMAIL_SERVICE")
    email_user: str = Field(..., env="EMAIL_USER")
    email_from: str = Field(..., env="EMAIL_FROM")

    # Feature Flags
    feature_calendar: bool = Field(default=False, env="FEATURE_CALENDAR")
    feature_video_thumbnails: bool = Field(default=False, env="FEATURE_VIDEO_THUMBNAILS")
    feature_text_to_speech: bool = Field(default=False, env="FEATURE_TEXT_TO_SPEECH")

    # CORS
    cors_origins: List[str] = Field(default=["*"], env="CORS_ORIGINS")

    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @validator("jwt_secret_key")
    def validate_jwt_secret(cls, v):
        """Ensure JWT secret is strong enough"""
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    FAIL FAST: Raises validation error if configuration is invalid
    """
    try:
        settings = Settings()
        print(f"✅ Configuration loaded successfully")
        print(f"   Environment: {settings.environment}")
        print(f"   Database: {settings.mongodb_db_name}")
        return settings
    except Exception as e:
        print("❌ CRITICAL: Configuration validation failed")
        print(f"Error: {e}")
        print("\n💡 Please check your environment variables against .env.example")
        raise

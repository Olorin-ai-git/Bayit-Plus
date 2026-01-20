"""
Olorin-specific minimal settings.

Separate from main Bayit+ settings to avoid loading unnecessary configuration
when deploying the Olorin backend independently.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class OlorinMinimalSettings(BaseSettings):
    """Minimal settings required for Olorin backend only."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra environment variables
    )

    # Core settings
    ENVIRONMENT: str = Field(default="production")
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")

    # Database
    MONGODB_URL: str = Field(...)  # Required
    MONGODB_DB_NAME: str = Field(default="bayit_plus")

    # API Keys
    ANTHROPIC_API_KEY: str = Field(default="")
    OPENAI_API_KEY: str = Field(default="")
    ELEVENLABS_API_KEY: str = Field(default="")
    PINECONE_API_KEY: str = Field(default="")

    # Olorin-specific (from olorin_config.py nested settings)
    OLORIN_API_VERSION: str = Field(default="v1", alias="API_V1_PREFIX")
    OLORIN_PARTNER_API_KEY_SALT: str = Field(default="")
    OLORIN_DUBBING_ENABLED: bool = Field(default=False)
    OLORIN_SEMANTIC_SEARCH_ENABLED: bool = Field(default=False)
    OLORIN_CULTURAL_CONTEXT_ENABLED: bool = Field(default=False)
    OLORIN_RECAP_ENABLED: bool = Field(default=False)
    OLORIN_DEFAULT_CONTENT_LANGUAGE: str = Field(default="he")

    # Pinecone
    PINECONE_ENVIRONMENT: str = Field(default="us-east-1-aws")
    PINECONE_INDEX_NAME: str = Field(default="olorin-content")

    # OpenAI Embeddings
    EMBEDDING_MODEL: str = Field(default="text-embedding-3-small")
    EMBEDDING_DIMENSIONS: int = Field(default=1536)

    # GCP
    GCP_PROJECT_ID: str = Field(default="")
    PROJECT_ID: str = Field(default="")

    # Sentry (optional)
    SENTRY_DSN: str = Field(default="")
    SENTRY_ENVIRONMENT: str = Field(default="production")
    SENTRY_TRACES_SAMPLE_RATE: float = Field(default=0.2)

    # CORS
    BACKEND_CORS_ORIGINS: str = Field(default="*")


# Singleton instance
settings = OlorinMinimalSettings()

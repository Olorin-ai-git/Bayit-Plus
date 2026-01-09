from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Bayit+ API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "bayit_plus"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_BASIC: str = ""
    STRIPE_PRICE_PREMIUM: str = ""
    STRIPE_PRICE_FAMILY: str = ""

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"

    # ElevenLabs (speech-to-text and text-to-speech)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = "EXAVITQu4vr4xnSDxMaL"  # Rachel - multilingual voice, excellent for Hebrew

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://bayit.tv",
    ]

    # DRM (optional)
    DRM_LICENSE_URL: str = ""
    DRM_API_KEY: str = ""

    # Storage (local or S3)
    STORAGE_TYPE: str = "local"  # "local" or "s3"
    UPLOAD_DIR: str = "uploads"

    # AWS S3 (optional, only needed if STORAGE_TYPE is "s3")
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "us-east-1"
    CDN_BASE_URL: str = ""  # Optional CloudFront URL

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

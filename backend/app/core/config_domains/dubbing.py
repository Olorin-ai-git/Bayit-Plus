"""Domain config: Dubbing, animation, speech, and geolocation."""
import os

from pydantic import Field, field_validator


class DubbingConfigMixin:
    """Dubbing, animation, speech, and geolocation configuration fields."""

    # ElevenLabs (speech-to-text and text-to-speech)
    ELEVENLABS_API_URL: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - male voice for consistent TTS experience
    )
    ELEVENLABS_ASSISTANT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
    )
    ELEVENLABS_SUPPORT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
    )

    # Character Animation Provider Selection
    CHARACTER_ANIMATION_PROVIDER: str = Field(
        default="aurora",
        description="Provider for character animation: 'aurora', 'elevenlabs', or 'creatify'"
    )
    TEMP_FILE_HOST_URL: str = Field(
        default="https://tmpfiles.org/api/v1/upload",
        description="Temp file hosting API for bridging local files to external APIs",
    )

    # fal.ai Aurora (direct image+audio lip-sync via Creatify Aurora model)
    FAL_KEY: str = Field(
        default="",
        description="fal.ai API key for Aurora lip-sync generation",
    )
    FAL_AURORA_RESOLUTION: str = Field(
        default="480p",
        description="Aurora output resolution: 480p or 720p",
    )

    # Creatify Aurora (Character animation and lip-sync - Alternative provider)
    CREATIFY_API_URL: str = Field(
        default="https://api.creatify.ai",
        description="Creatify Aurora API base URL"
    )
    CREATIFY_API_ID: str = Field(
        default="",
        description="Creatify API ID for authentication"
    )
    CREATIFY_API_KEY: str = Field(
        default="",
        description="Creatify API key for authentication"
    )

    # Creatify Stock Persona IDs (character animation fallbacks)
    CREATIFY_PERSONA_MALE: str = Field(
        default="0251876f-0da4-4c61-8320-8955d8be1f98",
        description="Creatify stock male persona UUID"
    )
    CREATIFY_PERSONA_FEMALE: str = Field(
        default="009f502d-3649-4624-a438-80b126f1fa30",
        description="Creatify stock female persona UUID"
    )
    CHARACTER_VOICE_DEFAULT: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="Default ElevenLabs voice ID for unmatched characters"
    )

    @field_validator("CHARACTER_ANIMATION_PROVIDER")
    @classmethod
    def validate_animation_provider(cls, v: str) -> str:
        """Validate CHARACTER_ANIMATION_PROVIDER is a supported provider."""
        valid_providers = ["aurora", "elevenlabs", "creatify"]
        if v.lower() not in valid_providers:
            raise ValueError(
                f"CHARACTER_ANIMATION_PROVIDER must be one of {valid_providers}, got '{v}'"
            )
        return v.lower()

    # OpenAI (Whisper speech-to-text)
    OPENAI_API_KEY: str = ""

    # GeoNames (Reverse geocoding for location-based features)
    GEONAMES_USERNAME: str = Field(
        default="",
        description="GeoNames API username for reverse geocoding (required for location features)"
    )
    GEONAMES_API_BASE_URL: str = Field(
        default="https://secure.geonames.org",
        description="GeoNames API base URL"
    )
    GEONAMES_TIMEOUT_SECONDS: int = Field(
        default=10,
        description="GeoNames API request timeout in seconds"
    )
    LOCATION_CACHE_TTL_HOURS: int = Field(
        default=24,
        description="Location cache TTL in hours (cached for 24h by default)"
    )
    LOCATION_CACHE_COLLECTION: str = Field(
        default="location_cache",
        description="MongoDB collection name for location cache"
    )
    LOCATION_CONTENT_TOPIC_TAGS: list[str] = Field(
        default=["israeli", "israel", "jewish_community"],
        description="Topic tags to filter for Israeli-focused content"
    )
    LOCATION_CONTENT_EVENT_TYPES: list[str] = Field(
        default=["community", "holiday", "shiur"],
        description="Event types to filter for Israeli-focused community events"
    )
    LOCATION_CONTENT_ARTICLE_FORMATS: list[str] = Field(
        default=["documentary", "news", "article"],
        description="Content formats to include for news articles"
    )
    LOCATION_REVERSE_GEOCODE_RATE_LIMIT: int = Field(
        default=30,
        description="Max reverse geocode requests per minute per IP"
    )
    LOCATION_CONTENT_RATE_LIMIT: int = Field(
        default=60,
        description="Max location content requests per minute per IP"
    )
    LOCATION_ENCRYPTION_KEY: str = Field(
        default="",
        description="Fernet key for encrypting location data at rest (base64-encoded)"
    )

    # Diagnostics Settings (System Health Monitoring)
    DIAGNOSTICS_ENABLED: bool = Field(
        default=True,
        description="Enable system diagnostics and health monitoring"
    )
    DIAGNOSTICS_HEARTBEAT_INTERVAL_SECONDS: int = Field(
        default=10,
        description="Client heartbeat interval in seconds"
    )
    DIAGNOSTICS_CLIENT_TIMEOUT_SECONDS: int = Field(
        default=300,
        description="Client timeout in seconds (5 minutes default)"
    )

    @field_validator("GEONAMES_USERNAME")
    @classmethod
    def validate_geonames_username(cls, v: str) -> str:
        """Validate GeoNames username is configured for production."""
        is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
        if is_prod and not v:
            raise ValueError(
                "GEONAMES_USERNAME must be configured in production for location features. "
                "Obtain free account from https://www.geonames.org/login"
            )
        return v

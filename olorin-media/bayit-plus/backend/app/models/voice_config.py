"""
Voice Configuration Models
Database models for voice configuration overrides and management
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field


class VoiceConfiguration(Document):
    """
    Voice configuration overrides stored in database
    Allows runtime configuration changes without redeployment
    """

    # Configuration identifier
    config_key: str  # e.g., "default_voice_id", "assistant_voice_id"
    config_value: str  # The actual configuration value
    config_type: str  # voice_id, provider, setting

    # Localization support
    language: Optional[str] = None  # ISO 639-1 code (e.g., "he", "en")
    platform: Optional[str] = None  # web, ios, tvos, android

    # Testing support
    test_sample_text: Optional[str] = None
    last_tested_at: Optional[datetime] = None
    test_passed: bool = True

    # Audit trail
    created_by: str  # Admin user ID
    updated_by: str  # Admin user ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Metadata
    description: Optional[str] = None
    is_active: bool = True

    class Settings:
        name = "voice_configurations"
        indexes = [
            "config_key",
            [("config_key", 1), ("language", 1)],
            [("config_key", 1), ("platform", 1)],
            [("is_active", 1)],
            [("config_type", 1)],
        ]


class VoiceProviderHealth(Document):
    """Track voice provider health and status"""

    provider: str  # elevenlabs, whisper, google
    is_healthy: bool = True
    last_check_at: datetime = Field(default_factory=datetime.utcnow)
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None

    # Error tracking
    consecutive_failures: int = 0
    last_error_message: Optional[str] = None

    # Performance metrics
    avg_latency_ms: float = 0.0
    success_rate_24h: float = 100.0

    # Metadata
    region: Optional[str] = None
    endpoint_url: Optional[str] = None

    class Settings:
        name = "voice_provider_health"
        indexes = [
            "provider",
            [("is_healthy", 1)],
            [("last_check_at", -1)],
        ]

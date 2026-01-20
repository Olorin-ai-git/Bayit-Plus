"""
Content Auditor Constants

Audit rules, thresholds, and configuration loaded from settings.
All values are configurable via environment variables through the settings object.
"""

from dataclasses import dataclass
from typing import List

from app.core.config import settings


@dataclass
class MetadataAuditConfig:
    """Configuration for metadata audit rules."""

    # Description minimum length
    min_description_length: int = 20

    # Minimum subtitle languages required for movies
    min_subtitle_languages_movie: int = 3

    # External YouTube URL patterns to detect
    youtube_url_patterns: tuple = ("img.youtube.com", "i.ytimg.com")


@dataclass
class ClassificationAuditConfig:
    """Configuration for classification verification."""

    # Batch size for AI verification API calls
    verification_batch_size: int = 50

    # Threshold below which content is flagged as misclassified
    misclassification_threshold: int = 6

    # Cache TTL in days for verification results
    cache_ttl_days: int = 7

    # Rate limit delay between batches (seconds)
    rate_limit_delay: float = 0.5


@dataclass
class AIInsightsConfig:
    """Configuration for AI insights generation."""

    # Max tokens for insights response
    max_tokens: int = 1000

    # Number of sample issues to include in analysis
    sample_broken_streams: int = 5
    sample_missing_metadata: int = 5
    sample_misclassifications: int = 3


def get_metadata_audit_config() -> MetadataAuditConfig:
    """Get metadata audit configuration from settings."""
    return MetadataAuditConfig()


def get_classification_audit_config() -> ClassificationAuditConfig:
    """Get classification audit configuration from settings."""
    return ClassificationAuditConfig()


def get_ai_insights_config() -> AIInsightsConfig:
    """Get AI insights configuration from settings."""
    return AIInsightsConfig()


def get_claude_model() -> str:
    """Get the Claude model to use for AI operations."""
    return settings.CLAUDE_MODEL


def get_anthropic_api_key() -> str:
    """Get the Anthropic API key from settings."""
    return settings.ANTHROPIC_API_KEY


# Supported languages for AI insights
SUPPORTED_INSIGHT_LANGUAGES: List[str] = ["en", "es", "he"]

# Issue types that can be detected
METADATA_ISSUE_TYPES: List[str] = [
    "missing_thumbnail",
    "external_youtube_thumbnail",
    "missing_backdrop",
    "external_youtube_backdrop",
    "missing_tmdb_id",
    "missing_imdb_id",
    "incomplete_description",
    "missing_genre",
    "missing_subtitles",
    "insufficient_subtitle_languages",
    "missing_trailer",
]

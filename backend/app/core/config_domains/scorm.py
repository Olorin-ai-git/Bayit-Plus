"""Domain config: SCORM export settings."""
from pydantic import Field


class ScormConfigMixin:
    """SCORM export tier caps and token defaults."""

    SCORM_TOKEN_DEFAULT_CAP: int = Field(
        default=500, ge=0,
        env="SCORM_TOKEN_DEFAULT_CAP",
        description="Default max live interactions per export token",
    )
    SCORM_TOKEN_EXPIRY_DAYS: int = Field(
        default=365, ge=1,
        env="SCORM_TOKEN_EXPIRY_DAYS",
        description="Default token expiry in days from export",
    )
    SCORM_TEAM_MAX_CHARACTERS: int = Field(
        default=3, ge=1, le=20,
        env="SCORM_TEAM_MAX_CHARACTERS",
        description="Max characters in Team tier SCORM export",
    )
    SCORM_ORG_MAX_CHARACTERS: int = Field(
        default=10, ge=1, le=50,
        env="SCORM_ORG_MAX_CHARACTERS",
        description="Max characters in Organization tier SCORM export",
    )
    SCORM_QA_PAIRS_PER_CHARACTER: int = Field(
        default=12, ge=3, le=30,
        env="SCORM_QA_PAIRS_PER_CHARACTER",
        description="Q&A pairs to generate per character for Org+ tiers",
    )
    SCORM_FOLLOW_UP_CHAINS: int = Field(
        default=4, ge=1, le=10,
        env="SCORM_FOLLOW_UP_CHAINS",
        description="Follow-up conversation chains per character",
    )
    SCORM_CHAIN_LENGTH: int = Field(
        default=3, ge=2, le=6,
        env="SCORM_CHAIN_LENGTH",
        description="Exchanges per follow-up chain",
    )
    SCORM_EXPORT_GCS_PREFIX: str = Field(
        default="scorm-exports",
        env="SCORM_EXPORT_GCS_PREFIX",
        description="GCS path prefix for SCORM export artifacts",
    )
    SCORM_API_BASE_URL: str = Field(
        default="",
        env="SCORM_API_BASE_URL",
        description="Public API base URL embedded in SCORM packages for live mode",
    )

"""
Confidence Score Data Models

This module contains data models and enums for the confidence consolidation system
to ensure consistency across different components.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

# Import Pydantic for enhanced type safety
from pydantic import BaseModel, Field, ValidationInfo, field_validator


class ConfidenceFieldType(Enum):
    """Types of confidence fields in the system."""

    AI_CONFIDENCE = "ai_confidence"  # Hybrid state AI confidence
    CONFIDENCE_SCORE = "confidence_score"  # Orchestrator confidence score
    CONFIDENCE = "confidence"  # Raw confidence value
    EVIDENCE_CONFIDENCE = "evidence_confidence"  # Evidence quality confidence
    TOOL_CONFIDENCE = "tool_confidence"  # Tool output confidence
    DOMAIN_CONFIDENCE = "domain_confidence"  # Domain analysis confidence
    OVERALL_CONFIDENCE = "overall_confidence"  # Final aggregated confidence


@dataclass
class ConsolidatedConfidence:
    """Standardized confidence representation."""

    # Core confidence values
    overall_score: float  # Primary confidence (0.0-1.0)
    level_description: str  # Human-readable level

    # Component breakdown
    ai_confidence: float = None  # AI routing confidence
    evidence_confidence: float = None  # Evidence quality confidence
    tool_confidence: float = None  # Tool reliability confidence
    domain_confidence: float = None  # Domain analysis confidence

    # Quality indicators
    consistency_score: float = 1.0  # How consistent different scores are
    reliability_score: float = 1.0  # How reliable the confidence is
    data_quality_issues: List[str] = field(default_factory=list)

    # Metadata
    source_fields: Dict[str, float] = field(default_factory=dict)
    calculation_timestamp: str = field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )
    consolidation_method: str = "weighted_average"

    def __post_init__(self):
        """Validate consolidated confidence after initialization."""
        self._validate_overall_score()
        self._validate_component_scores()
        self._validate_quality_scores()

    def _validate_overall_score(self):
        """Validate overall score is in valid range."""
        if not (0.0 <= self.overall_score <= 1.0):
            raise ValueError(
                f"Overall score must be between 0.0 and 1.0, got {self.overall_score}"
            )

    def _validate_component_scores(self):
        """Validate component scores are in valid ranges."""
        components = [
            ("ai_confidence", self.ai_confidence),
            ("evidence_confidence", self.evidence_confidence),
            ("tool_confidence", self.tool_confidence),
            ("domain_confidence", self.domain_confidence),
        ]

        for name, value in components:
            if value is not None and not (0.0 <= value <= 1.0):
                raise ValueError(f"{name} must be between 0.0 and 1.0, got {value}")

    def _validate_quality_scores(self):
        """Validate quality indicator scores are in valid ranges."""
        if not (0.0 <= self.consistency_score <= 1.0):
            raise ValueError(
                f"Consistency score must be between 0.0 and 1.0, got {self.consistency_score}"
            )

        if not (0.0 <= self.reliability_score <= 1.0):
            raise ValueError(
                f"Reliability score must be between 0.0 and 1.0, got {self.reliability_score}"
            )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "overall_score": self.overall_score,
            "level_description": self.level_description,
            "ai_confidence": self.ai_confidence,
            "evidence_confidence": self.evidence_confidence,
            "tool_confidence": self.tool_confidence,
            "domain_confidence": self.domain_confidence,
            "consistency_score": self.consistency_score,
            "reliability_score": self.reliability_score,
            "data_quality_issues": self.data_quality_issues,
            "source_fields": self.source_fields,
            "calculation_timestamp": self.calculation_timestamp,
            "consolidation_method": self.consolidation_method,
        }


# Default component weights for confidence calculation
DEFAULT_COMPONENT_WEIGHTS = {
    ConfidenceFieldType.AI_CONFIDENCE: 0.35,  # AI routing decisions
    ConfidenceFieldType.EVIDENCE_CONFIDENCE: 0.25,  # Evidence quality
    ConfidenceFieldType.TOOL_CONFIDENCE: 0.20,  # Tool reliability
    ConfidenceFieldType.DOMAIN_CONFIDENCE: 0.20,  # Domain analysis
}

# Confidence level thresholds
CONFIDENCE_THRESHOLDS = {
    "CRITICAL": 0.9,
    "HIGH": 0.75,
    "MEDIUM": 0.5,
    "LOW": 0.25,
    "MINIMAL": 0.0,
}

# Fallback confidence configuration
FALLBACK_CONFIDENCE = 0.5
FALLBACK_LEVEL = "MEDIUM_FALLBACK"

# Confidence variance thresholds for inconsistency detection
HIGH_VARIANCE_THRESHOLD = 0.5  # 50% difference between highest and lowest
AI_SCORE_DIFF_THRESHOLD = 0.3  # 30% difference between AI and other scores


class ConfidencePayload(BaseModel):
    """
    Pydantic model for confidence calculation input validation.

    Ensures all confidence scores are valid floats between 0.0 and 1.0
    before arithmetic operations in confidence_calculator.py.
    """

    # Core confidence components
    snowflake_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Snowflake evidence confidence (0.0-1.0)"
    )
    tool_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Tool execution confidence (0.0-1.0)"
    )
    domain_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Domain analysis confidence (0.0-1.0)"
    )
    pattern_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Pattern recognition confidence (0.0-1.0)"
    )
    velocity_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Investigation velocity confidence (0.0-1.0)"
    )

    # Allow extra fields for flexibility
    model_config = {"extra": "allow", "validate_assignment": True}

    @field_validator(
        "snowflake_score",
        "tool_score",
        "domain_score",
        "pattern_score",
        "velocity_score",
        mode="before",
    )
    @classmethod
    def validate_numeric_scores(cls, v, info: ValidationInfo):
        """Validate that all score fields are valid numeric values."""
        field_name = info.field_name
        if v is None:
            return None

        # Handle string representations
        if isinstance(v, str):
            try:
                v = float(v)
            except (ValueError, TypeError):
                raise ValueError(f"{field_name} must be a valid number, got '{v}'")

        # Check for NaN or infinite values
        if isinstance(v, (int, float)):
            if not (-float("inf") < v < float("inf")):
                raise ValueError(f"{field_name} must be finite, got {v}")

            # Convert to float for consistency
            return float(v)

        raise ValueError(f"{field_name} must be a number, got {type(v).__name__}: {v}")

    def to_confidence_dict(self) -> Dict[ConfidenceFieldType, float]:
        """
        Convert to the format expected by confidence_calculator.py.

        Returns:
            Dictionary mapping ConfidenceFieldType to float values
        """
        result = {}

        # Map fields to ConfidenceFieldType enums
        field_mapping = {
            "snowflake_score": ConfidenceFieldType.AI_CONFIDENCE,
            "tool_score": ConfidenceFieldType.TOOL_CONFIDENCE,
            "domain_score": ConfidenceFieldType.DOMAIN_CONFIDENCE,
            "pattern_score": ConfidenceFieldType.EVIDENCE_CONFIDENCE,
            "velocity_score": ConfidenceFieldType.CONFIDENCE_SCORE,
        }

        for field_name, field_type in field_mapping.items():
            value = getattr(self, field_name, None)
            if value is not None:
                result[field_type] = value

        return result

    def has_sufficient_data(self, min_components: int = 2) -> bool:
        """
        Check if we have sufficient confidence components for calculation.

        Args:
            min_components: Minimum number of components required

        Returns:
            True if we have enough valid components
        """
        valid_components = sum(
            1
            for field in [
                "snowflake_score",
                "tool_score",
                "domain_score",
                "pattern_score",
                "velocity_score",
            ]
            if getattr(self, field, None) is not None
        )
        return valid_components >= min_components

    def get_data_quality_issues(self) -> List[str]:
        """
        Identify data quality issues with the confidence payload.

        Returns:
            List of data quality issue descriptions
        """
        issues = []

        # Check for missing critical components
        if self.snowflake_score is None:
            issues.append("Missing Snowflake evidence confidence")

        if self.tool_score is None:
            issues.append("Missing tool execution confidence")

        # Check for suspiciously low or high values
        for field_name in [
            "snowflake_score",
            "tool_score",
            "domain_score",
            "pattern_score",
            "velocity_score",
        ]:
            value = getattr(self, field_name, None)
            if value is not None:
                if value == 0.0:
                    issues.append(f"{field_name} is exactly 0.0 (suspicious)")
                elif value == 1.0:
                    issues.append(f"{field_name} is exactly 1.0 (suspicious)")

        # Check for insufficient data
        if not self.has_sufficient_data():
            issues.append("Insufficient confidence components for reliable calculation")

        return issues


class ConfidenceCalculationError(Exception):
    """Raised when confidence calculation fails due to invalid input."""

    pass

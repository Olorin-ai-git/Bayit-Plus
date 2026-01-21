"""
Decision Models
Feature: 026-llm-training-pipeline

Dataclasses for risk bands and decision actions.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional


class RiskBand(Enum):
    """Risk band classifications."""

    AUTO_APPROVE = "auto_approve"
    LOG_ONLY = "log_only"
    MANUAL_REVIEW = "manual_review"
    AUTO_DECLINE = "auto_decline"


class DecisionAction(Enum):
    """Actions to take based on risk band."""

    APPROVE = "approve"
    APPROVE_LOG = "approve_log"
    REVIEW = "review"
    DECLINE = "decline"


@dataclass
class BandConfig:
    """Configuration for a single risk band."""

    band: RiskBand
    min_score: float
    max_score: float
    action: DecisionAction
    requires_review: bool = False
    escalation_level: int = 0

    def contains_score(self, score: float) -> bool:
        """Check if score falls within this band."""
        return self.min_score <= score < self.max_score

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "band": self.band.value,
            "min_score": self.min_score,
            "max_score": self.max_score,
            "action": self.action.value,
            "requires_review": self.requires_review,
            "escalation_level": self.escalation_level,
        }


@dataclass
class SegmentedDecision:
    """Decision result with segment-aware thresholds."""

    risk_score: float
    risk_band: RiskBand
    action: DecisionAction
    segment: str
    confidence: float
    reasoning: str = ""
    segment_threshold_applied: bool = False
    default_threshold: float = 0.5
    applied_threshold: float = 0.5

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "risk_score": self.risk_score,
            "risk_band": self.risk_band.value,
            "action": self.action.value,
            "segment": self.segment,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "segment_threshold_applied": self.segment_threshold_applied,
            "default_threshold": self.default_threshold,
            "applied_threshold": self.applied_threshold,
        }

    @property
    def is_high_risk(self) -> bool:
        """Check if decision is high risk."""
        return self.risk_band in (RiskBand.MANUAL_REVIEW, RiskBand.AUTO_DECLINE)

    @property
    def requires_action(self) -> bool:
        """Check if decision requires human action."""
        return self.action in (DecisionAction.REVIEW, DecisionAction.DECLINE)


@dataclass
class SegmentConfig:
    """Configuration for a merchant/channel segment."""

    segment_id: str
    segment_name: str
    threshold_override: Optional[float] = None
    band_overrides: Dict[str, float] = field(default_factory=dict)
    is_high_risk: bool = False
    notes: str = ""

    def get_threshold(self, default: float) -> float:
        """Get threshold for this segment."""
        return self.threshold_override if self.threshold_override is not None else default

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "segment_id": self.segment_id,
            "segment_name": self.segment_name,
            "threshold_override": self.threshold_override,
            "band_overrides": self.band_overrides,
            "is_high_risk": self.is_high_risk,
            "notes": self.notes,
        }

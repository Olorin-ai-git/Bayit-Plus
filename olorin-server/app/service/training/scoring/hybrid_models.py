"""
Hybrid Models
Feature: 026-llm-training-pipeline

Dataclasses for hybrid scoring combining classical and LLM approaches.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ScoringMode(Enum):
    """Available scoring modes."""

    LLM_ONLY = "llm_only"
    CLASSICAL_ONLY = "classical_only"
    HYBRID = "hybrid"


@dataclass
class ExplanationRequest:
    """Request for LLM-based explanation generation."""

    entity_type: str
    entity_value: str
    features: Dict[str, Any]
    classical_score: float
    feature_contributions: Dict[str, float]
    merchant_name: Optional[str] = None
    top_contributors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "entity_type": self.entity_type,
            "entity_value": self.entity_value,
            "features": self.features,
            "classical_score": self.classical_score,
            "feature_contributions": self.feature_contributions,
            "merchant_name": self.merchant_name,
            "top_contributors": self.top_contributors,
        }


@dataclass
class HybridAssessment:
    """Complete assessment from hybrid scoring system."""

    risk_score: float
    confidence: float
    prediction: str
    reasoning: str
    key_indicators: List[str] = field(default_factory=list)
    classical_score: float = 0.0
    llm_score: Optional[float] = None
    feature_contributions: Dict[str, float] = field(default_factory=dict)
    scoring_mode: ScoringMode = ScoringMode.HYBRID
    is_calibrated: bool = False
    model_version: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "prediction": self.prediction,
            "reasoning": self.reasoning,
            "key_indicators": self.key_indicators,
            "classical_score": self.classical_score,
            "llm_score": self.llm_score,
            "feature_contributions": self.feature_contributions,
            "scoring_mode": self.scoring_mode.value,
            "is_calibrated": self.is_calibrated,
            "model_version": self.model_version,
            "error": self.error,
        }

    @classmethod
    def from_error(cls, error: str) -> "HybridAssessment":
        """Create error assessment."""
        return cls(
            risk_score=0.0,
            confidence=0.0,
            prediction="ERROR",
            reasoning=f"Error during assessment: {error}",
            error=error,
        )

"""
Risk Bands Manager
Feature: 026-llm-training-pipeline

Manages risk band definitions and score-to-action mapping.
"""

import os
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.decision.decision_models import (
    BandConfig,
    DecisionAction,
    RiskBand,
    SegmentedDecision,
)
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class RiskBandManager:
    """Manages risk band definitions and decision mapping."""

    def __init__(self):
        """Initialize risk band manager from config."""
        self._config = get_training_config()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize band configurations from environment."""
        self._enabled = os.getenv("LLM_RISK_BANDS_ENABLED", "true").lower() == "true"

        auto_approve_max = float(os.getenv("LLM_BAND_APPROVE_MAX", "0.30"))
        log_only_max = float(os.getenv("LLM_BAND_LOG_MAX", "0.55"))
        review_max = float(os.getenv("LLM_BAND_REVIEW_MAX", "0.75"))

        self._bands = [
            BandConfig(
                band=RiskBand.AUTO_APPROVE,
                min_score=0.0,
                max_score=auto_approve_max,
                action=DecisionAction.APPROVE,
                requires_review=False,
                escalation_level=0,
            ),
            BandConfig(
                band=RiskBand.LOG_ONLY,
                min_score=auto_approve_max,
                max_score=log_only_max,
                action=DecisionAction.APPROVE_LOG,
                requires_review=False,
                escalation_level=1,
            ),
            BandConfig(
                band=RiskBand.MANUAL_REVIEW,
                min_score=log_only_max,
                max_score=review_max,
                action=DecisionAction.REVIEW,
                requires_review=True,
                escalation_level=2,
            ),
            BandConfig(
                band=RiskBand.AUTO_DECLINE,
                min_score=review_max,
                max_score=1.01,
                action=DecisionAction.DECLINE,
                requires_review=False,
                escalation_level=3,
            ),
        ]

    def is_enabled(self) -> bool:
        """Check if risk bands are enabled."""
        return self._enabled

    def get_band(self, score: float) -> BandConfig:
        """
        Get band configuration for a given score.

        Args:
            score: Risk score (0.0 to 1.0)

        Returns:
            BandConfig for the score
        """
        score = max(0.0, min(1.0, score))

        for band in self._bands:
            if band.contains_score(score):
                return band

        return self._bands[-1]

    def make_decision(
        self,
        score: float,
        confidence: float,
        segment: str = "default",
        reasoning: str = "",
    ) -> SegmentedDecision:
        """
        Make a decision based on risk score.

        Args:
            score: Risk score
            confidence: Confidence in score
            segment: Merchant/channel segment
            reasoning: Explanation for score

        Returns:
            SegmentedDecision with action
        """
        if not self._enabled:
            action = DecisionAction.DECLINE if score >= 0.5 else DecisionAction.APPROVE
            return SegmentedDecision(
                risk_score=score,
                risk_band=RiskBand.LOG_ONLY,
                action=action,
                segment=segment,
                confidence=confidence,
                reasoning=reasoning,
            )

        band_config = self.get_band(score)

        return SegmentedDecision(
            risk_score=score,
            risk_band=band_config.band,
            action=band_config.action,
            segment=segment,
            confidence=confidence,
            reasoning=reasoning,
            default_threshold=0.5,
            applied_threshold=band_config.min_score,
        )

    def get_all_bands(self) -> List[BandConfig]:
        """Get all band configurations."""
        return list(self._bands)

    def get_action_for_score(self, score: float) -> DecisionAction:
        """Get action for a given score."""
        return self.get_band(score).action

    def get_band_boundaries(self) -> dict:
        """Get band boundaries as dictionary."""
        return {
            "auto_approve_max": self._bands[0].max_score,
            "log_only_max": self._bands[1].max_score,
            "review_max": self._bands[2].max_score,
        }


_risk_band_manager: Optional[RiskBandManager] = None


def get_risk_band_manager() -> RiskBandManager:
    """Get cached risk band manager instance."""
    global _risk_band_manager
    if _risk_band_manager is None:
        _risk_band_manager = RiskBandManager()
    return _risk_band_manager

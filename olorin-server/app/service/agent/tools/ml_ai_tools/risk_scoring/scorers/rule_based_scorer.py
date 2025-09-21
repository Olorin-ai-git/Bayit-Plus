"""
Rule-Based Risk Scorer

Implements rule-based risk scoring methodology.
"""

from typing import Any, Dict, Optional, List
from .base_scorer import BaseScorer
from ..core.input_schema import RiskAssessmentResult


class RuleBasedScorer(BaseScorer):
    """Rule-based risk scoring implementation."""

    def score(
        self,
        processed_data: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        risk_tolerance: str,
        time_horizon: str = "short_term",
        historical_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply rule-based risk scoring."""
        assessment_scores = self._extract_assessment_scores(risk_assessments)

        # Apply predefined rules
        rule_score = 0.0
        applied_rules = []

        # High fraud + high behavioral = critical
        if (assessment_scores.get("fraud", 0) > 0.7 and
            assessment_scores.get("behavioral", 0) > 0.6):
            rule_score = max(rule_score, 0.9)
            applied_rules.append("high_fraud_behavioral_combination")

        # Multiple high risks = elevated score
        high_risk_count = sum(1 for score in assessment_scores.values() if score > 0.6)
        if high_risk_count >= 3:
            rule_score = max(rule_score, 0.8)
            applied_rules.append("multiple_high_risks")

        # Credit + operational issues = business risk
        if (assessment_scores.get("credit", 0) > 0.5 and
            assessment_scores.get("operational", 0) > 0.5):
            rule_score = max(rule_score, 0.7)
            applied_rules.append("credit_operational_combination")

        # Contextual amplification
        if assessment_scores.get("contextual", 0) > 0.6:
            rule_score *= 1.2
            applied_rules.append("contextual_amplification")

        # Risk tolerance adjustment
        rule_score = self._apply_tolerance_adjustment(rule_score, risk_tolerance)

        # Time horizon adjustment
        rule_score = self._apply_time_horizon_adjustment(rule_score, time_horizon)

        # Normalize final score
        final_score = self._normalize_score(rule_score)

        return {
            "overall_score": final_score,
            "risk_level": self._determine_risk_level(final_score),
            "confidence": self._calculate_confidence(risk_assessments),
            "applied_rules": applied_rules,
            "model_type": "rule_based",
            "contributing_factors": self._extract_contributing_factors(risk_assessments)
        }

    def _apply_tolerance_adjustment(self, score: float, tolerance: str) -> float:
        """Apply risk tolerance adjustment."""
        adjustments = {
            "low": 1.3,    # More conservative
            "medium": 1.0,  # No adjustment
            "high": 0.8     # More aggressive
        }
        return score * adjustments.get(tolerance, 1.0)

    def _apply_time_horizon_adjustment(self, score: float, time_horizon: str) -> float:
        """Apply time horizon adjustment."""
        adjustments = {
            "immediate": 1.2,     # Higher weight for immediate risks
            "short_term": 1.0,    # No adjustment
            "medium_term": 0.9,   # Slightly lower weight
            "long_term": 0.8      # Lower weight for long-term risks
        }
        return score * adjustments.get(time_horizon, 1.0)

    def _extract_contributing_factors(self, assessments: List[RiskAssessmentResult]) -> List[str]:
        """Extract all contributing factors from assessments."""
        all_factors = []
        for assessment in assessments:
            all_factors.extend(assessment.factors)
        return list(set(all_factors))  # Remove duplicates
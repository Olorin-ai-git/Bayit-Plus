"""
Behavioral Risk Assessor

Specialized module for assessing behavioral risk factors.
"""

from typing import Any, Dict, List

from ..core.input_schema import RiskAssessmentResult
from .base_assessor import BaseRiskAssessor


class BehavioralRiskAssessor(BaseRiskAssessor):
    """Behavioral risk assessment implementation."""

    def assess(
        self, processed_data: Dict[str, Any], risk_tolerance: str
    ) -> RiskAssessmentResult:
        """Assess behavioral risk factors."""
        risk_factors = []
        contributing_factors = []

        # Analyze user behavior patterns
        behavioral_data = processed_data.get("behavioral_data", {})
        self._assess_behavior_patterns(
            behavioral_data, risk_factors, contributing_factors
        )

        # Analyze access patterns
        access_data = processed_data.get("access_data", {})
        self._assess_access_patterns(access_data, risk_factors, contributing_factors)

        # Analyze transaction behavior
        transaction_data = processed_data.get("transaction_data", {})
        self._assess_transaction_behavior(
            transaction_data, risk_factors, contributing_factors
        )

        # Calculate composite score
        risk_score = self._calculate_risk_score(risk_factors)
        risk_level = self._determine_risk_level(risk_score, risk_tolerance)
        confidence = self._calculate_confidence(
            processed_data.get("data_quality", 0.7), len(risk_factors)
        )

        return RiskAssessmentResult(
            risk_type="behavioral",
            score=risk_score,
            confidence=confidence,
            factors=contributing_factors,
            severity=risk_level,
        )

    def _assess_behavior_patterns(
        self,
        behavioral_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess user behavior patterns."""
        for field, value in behavioral_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Unusual activity patterns
                if "unusual" in field_lower and value > 0.6:
                    risk_factors.append(
                        {
                            "score": value * 0.8,
                            "weight": 1.5,
                            "factor": "unusual_activity",
                        }
                    )
                    contributing_factors.append("unusual_activity")

                # High risk activities
                elif "risky" in field_lower and value > 0.4:
                    risk_factors.append(
                        {
                            "score": value * 0.9,
                            "weight": 1.8,
                            "factor": "risky_behavior",
                        }
                    )
                    contributing_factors.append("risky_behavior")

    def _assess_access_patterns(
        self,
        access_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess access pattern indicators."""
        for field, value in access_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Off-hours access
                if "off_hours" in field_lower and value > 10:
                    risk_increase = min(value / 50, 0.6)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.3,
                            "factor": "off_hours_access",
                        }
                    )
                    contributing_factors.append("off_hours_access")

                # Multiple failed attempts
                elif "failed" in field_lower and "attempt" in field_lower and value > 5:
                    risk_increase = min(value / 20, 0.7)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.6,
                            "factor": "failed_access_attempts",
                        }
                    )
                    contributing_factors.append("failed_access_attempts")

    def _assess_transaction_behavior(
        self,
        transaction_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess transaction behavior indicators."""
        for field, value in transaction_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Rapid succession transactions
                if "rapid" in field_lower and value > 0.7:
                    risk_factors.append(
                        {
                            "score": value * 0.6,
                            "weight": 1.4,
                            "factor": "rapid_transactions",
                        }
                    )
                    contributing_factors.append("rapid_transactions")

                # Unusual amounts
                elif (
                    "unusual" in field_lower and "amount" in field_lower and value > 0.5
                ):
                    risk_factors.append(
                        {
                            "score": value * 0.7,
                            "weight": 1.5,
                            "factor": "unusual_amounts",
                        }
                    )
                    contributing_factors.append("unusual_amounts")

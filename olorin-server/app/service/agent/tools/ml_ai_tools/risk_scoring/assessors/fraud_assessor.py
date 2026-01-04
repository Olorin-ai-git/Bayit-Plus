"""
Fraud Risk Assessor

Specialized module for assessing fraud-related risk factors.
"""

from typing import Any, Dict, List

from ..core.input_schema import RiskAssessmentResult
from .base_assessor import BaseRiskAssessor


class FraudRiskAssessor(BaseRiskAssessor):
    """Fraud risk assessment implementation."""

    def assess(
        self, processed_data: Dict[str, Any], risk_tolerance: str
    ) -> RiskAssessmentResult:
        """Assess fraud-specific risk factors."""
        risk_factors = []
        contributing_factors = []

        # Analyze financial data for fraud indicators
        financial_data = processed_data.get("financial_data", {})
        self._assess_financial_fraud_indicators(
            financial_data, risk_factors, contributing_factors
        )

        # Analyze risk indicators
        risk_indicators = processed_data.get("risk_indicators", {})
        self._assess_risk_indicators(
            risk_indicators, risk_factors, contributing_factors
        )

        # Analyze behavioral patterns
        behavioral_data = processed_data.get("behavioral_data", {})
        self._assess_behavioral_fraud_patterns(
            behavioral_data, risk_factors, contributing_factors
        )

        # Calculate composite score
        risk_score = self._calculate_risk_score(risk_factors)
        risk_level = self._determine_risk_level(risk_score, risk_tolerance)
        confidence = self._calculate_confidence(
            processed_data.get("data_quality", 0.7), len(risk_factors)
        )

        return RiskAssessmentResult(
            risk_type="fraud",
            score=risk_score,
            confidence=confidence,
            factors=contributing_factors,
            severity=risk_level,
        )

    def _assess_financial_fraud_indicators(
        self,
        financial_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess financial fraud indicators."""
        for field, value in financial_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Large amounts
                if "amount" in field_lower and value > 10000:
                    risk_increase = min(value / 50000, 0.3)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.0,
                            "factor": "large_transaction_amount",
                        }
                    )
                    contributing_factors.append("large_transaction_amount")

                # High velocity
                elif "velocity" in field_lower and value > 10:
                    risk_increase = min(value / 50, 0.4)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.2,
                            "factor": "high_transaction_velocity",
                        }
                    )
                    contributing_factors.append("high_transaction_velocity")

    def _assess_risk_indicators(
        self,
        risk_indicators: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess general risk indicators."""
        for field, value in risk_indicators.items():
            if isinstance(value, (int, float)) and value > 0:
                if "failed" in field.lower():
                    risk_increase = min(value / 10, 0.5)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.5,
                            "factor": "failed_attempts",
                        }
                    )
                    contributing_factors.append("failed_attempts")

                elif "fraud" in field.lower():
                    risk_increase = min(value, 0.8)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 2.0,
                            "factor": "fraud_indicators",
                        }
                    )
                    contributing_factors.append("fraud_indicators")

    def _assess_behavioral_fraud_patterns(
        self,
        behavioral_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess behavioral fraud patterns."""
        for field, value in behavioral_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Unusual access patterns
                if "unusual" in field_lower and value > 0.5:
                    risk_factors.append(
                        {
                            "score": value * 0.6,
                            "weight": 1.3,
                            "factor": "unusual_behavior",
                        }
                    )
                    contributing_factors.append("unusual_behavior")

                # Device inconsistencies
                elif (
                    "device" in field_lower
                    and "inconsistency" in field_lower
                    and value > 0.3
                ):
                    risk_factors.append(
                        {
                            "score": value * 0.7,
                            "weight": 1.4,
                            "factor": "device_inconsistency",
                        }
                    )
                    contributing_factors.append("device_inconsistency")

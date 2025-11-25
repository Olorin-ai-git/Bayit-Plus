"""
Credit Risk Assessor

Specialized module for assessing credit-related risk factors.
"""

from typing import Any, Dict, List

from ..core.input_schema import RiskAssessmentResult
from .base_assessor import BaseRiskAssessor


class CreditRiskAssessor(BaseRiskAssessor):
    """Credit risk assessment implementation."""

    def assess(
        self, processed_data: Dict[str, Any], risk_tolerance: str
    ) -> RiskAssessmentResult:
        """Assess credit-specific risk factors."""
        risk_factors = []
        contributing_factors = []

        # Analyze financial health indicators
        financial_data = processed_data.get("financial_data", {})
        self._assess_financial_health(
            financial_data, risk_factors, contributing_factors
        )

        # Analyze payment history
        payment_data = processed_data.get("payment_data", {})
        self._assess_payment_history(payment_data, risk_factors, contributing_factors)

        # Analyze debt indicators
        debt_data = processed_data.get("debt_data", {})
        self._assess_debt_indicators(debt_data, risk_factors, contributing_factors)

        # Calculate composite score
        risk_score = self._calculate_risk_score(risk_factors)
        risk_level = self._determine_risk_level(risk_score, risk_tolerance)
        confidence = self._calculate_confidence(
            processed_data.get("data_quality", 0.7), len(risk_factors)
        )

        return RiskAssessmentResult(
            risk_type="credit",
            score=risk_score,
            confidence=confidence,
            factors=contributing_factors,
            severity=risk_level,
        )

    def _assess_financial_health(
        self,
        financial_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess financial health indicators."""
        for field, value in financial_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Credit score
                if "credit" in field_lower and "score" in field_lower:
                    if value < 600:
                        risk_increase = (600 - value) / 600 * 0.8
                        risk_factors.append(
                            {
                                "score": risk_increase,
                                "weight": 2.0,
                                "factor": "low_credit_score",
                            }
                        )
                        contributing_factors.append("low_credit_score")

                # Income stability
                elif "income" in field_lower and "stability" in field_lower:
                    if value < 0.5:
                        risk_factors.append(
                            {
                                "score": (0.5 - value) * 1.5,
                                "weight": 1.5,
                                "factor": "income_instability",
                            }
                        )
                        contributing_factors.append("income_instability")

    def _assess_payment_history(
        self,
        payment_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess payment history indicators."""
        for field, value in payment_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Late payments
                if "late" in field_lower and "payment" in field_lower and value > 2:
                    risk_increase = min(value / 10, 0.6)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.8,
                            "factor": "late_payments",
                        }
                    )
                    contributing_factors.append("late_payments")

                # Payment defaults
                elif "default" in field_lower and value > 0:
                    risk_factors.append(
                        {
                            "score": min(value * 0.3, 0.9),
                            "weight": 2.5,
                            "factor": "payment_defaults",
                        }
                    )
                    contributing_factors.append("payment_defaults")

    def _assess_debt_indicators(
        self,
        debt_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess debt-related indicators."""
        for field, value in debt_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Debt-to-income ratio
                if "debt" in field_lower and "income" in field_lower and value > 0.4:
                    risk_increase = min((value - 0.4) / 0.6 * 0.7, 0.7)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.8,
                            "factor": "high_debt_to_income",
                        }
                    )
                    contributing_factors.append("high_debt_to_income")

                # Credit utilization
                elif "utilization" in field_lower and value > 0.7:
                    risk_increase = min((value - 0.7) / 0.3 * 0.5, 0.5)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.6,
                            "factor": "high_credit_utilization",
                        }
                    )
                    contributing_factors.append("high_credit_utilization")

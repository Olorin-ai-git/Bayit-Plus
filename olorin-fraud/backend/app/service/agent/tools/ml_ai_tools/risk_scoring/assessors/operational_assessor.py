"""
Operational Risk Assessor

Specialized module for assessing operational risk factors.
"""

from typing import Any, Dict, List

from ..core.input_schema import RiskAssessmentResult
from .base_assessor import BaseRiskAssessor


class OperationalRiskAssessor(BaseRiskAssessor):
    """Operational risk assessment implementation."""

    def assess(
        self, processed_data: Dict[str, Any], risk_tolerance: str
    ) -> RiskAssessmentResult:
        """Assess operational risk factors."""
        risk_factors = []
        contributing_factors = []

        # Analyze system performance indicators
        system_data = processed_data.get("system_data", {})
        self._assess_system_performance(system_data, risk_factors, contributing_factors)

        # Analyze process efficiency
        process_data = processed_data.get("process_data", {})
        self._assess_process_efficiency(
            process_data, risk_factors, contributing_factors
        )

        # Analyze compliance indicators
        compliance_data = processed_data.get("compliance_data", {})
        self._assess_compliance_risk(
            compliance_data, risk_factors, contributing_factors
        )

        # Calculate composite score
        risk_score = self._calculate_risk_score(risk_factors)
        risk_level = self._determine_risk_level(risk_score, risk_tolerance)
        confidence = self._calculate_confidence(
            processed_data.get("data_quality", 0.7), len(risk_factors)
        )

        return RiskAssessmentResult(
            risk_type="operational",
            score=risk_score,
            confidence=confidence,
            factors=contributing_factors,
            severity=risk_level,
        )

    def _assess_system_performance(
        self,
        system_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess system performance indicators."""
        for field, value in system_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # System downtime
                if "downtime" in field_lower and value > 5:
                    risk_increase = min(value / 100, 0.8)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 2.0,
                            "factor": "system_downtime",
                        }
                    )
                    contributing_factors.append("system_downtime")

                # Error rates
                elif "error" in field_lower and "rate" in field_lower and value > 0.05:
                    risk_increase = min(value * 10, 0.7)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.8,
                            "factor": "high_error_rate",
                        }
                    )
                    contributing_factors.append("high_error_rate")

    def _assess_process_efficiency(
        self,
        process_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess process efficiency indicators."""
        for field, value in process_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Process delays
                if "delay" in field_lower and value > 10:
                    risk_increase = min(value / 100, 0.6)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.5,
                            "factor": "process_delays",
                        }
                    )
                    contributing_factors.append("process_delays")

                # Resource utilization
                elif "utilization" in field_lower and value > 0.9:
                    risk_increase = min((value - 0.9) * 5, 0.5)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.3,
                            "factor": "resource_overutilization",
                        }
                    )
                    contributing_factors.append("resource_overutilization")

    def _assess_compliance_risk(
        self,
        compliance_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str],
    ) -> None:
        """Assess compliance risk indicators."""
        for field, value in compliance_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Compliance violations
                if "violation" in field_lower and value > 0:
                    risk_increase = min(value * 0.2, 0.8)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 2.5,
                            "factor": "compliance_violations",
                        }
                    )
                    contributing_factors.append("compliance_violations")

                # Audit findings
                elif "audit" in field_lower and "finding" in field_lower and value > 2:
                    risk_increase = min(value / 20, 0.6)
                    risk_factors.append(
                        {
                            "score": risk_increase,
                            "weight": 1.7,
                            "factor": "audit_findings",
                        }
                    )
                    contributing_factors.append("audit_findings")

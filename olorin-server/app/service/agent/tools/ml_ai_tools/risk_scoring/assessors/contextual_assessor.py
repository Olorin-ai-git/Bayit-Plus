"""
Contextual Risk Assessor

Specialized module for assessing contextual risk factors.
"""

from typing import Any, Dict, List
from .base_assessor import BaseRiskAssessor
from ..core.input_schema import RiskAssessmentResult


class ContextualRiskAssessor(BaseRiskAssessor):
    """Contextual risk assessment implementation."""

    def assess(self, processed_data: Dict[str, Any], risk_tolerance: str) -> RiskAssessmentResult:
        """Assess contextual risk factors."""
        risk_factors = []
        contributing_factors = []

        # Analyze geographic context
        geographic_data = processed_data.get("geographic_data", {})
        self._assess_geographic_risk(geographic_data, risk_factors, contributing_factors)

        # Analyze temporal context
        temporal_data = processed_data.get("temporal_data", {})
        self._assess_temporal_risk(temporal_data, risk_factors, contributing_factors)

        # Analyze environmental context
        environmental_data = processed_data.get("environmental_data", {})
        self._assess_environmental_risk(environmental_data, risk_factors, contributing_factors)

        # Calculate composite score
        risk_score = self._calculate_risk_score(risk_factors)
        risk_level = self._determine_risk_level(risk_score, risk_tolerance)
        confidence = self._calculate_confidence(
            processed_data.get("data_quality", 0.7),
            len(risk_factors)
        )

        return RiskAssessmentResult(
            risk_type="contextual",
            score=risk_score,
            confidence=confidence,
            factors=contributing_factors,
            severity=risk_level
        )

    def _assess_geographic_risk(
        self,
        geographic_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str]
    ) -> None:
        """Assess geographic risk indicators."""
        for field, value in geographic_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # High-risk regions
                if "high_risk" in field_lower and value > 0.6:
                    risk_factors.append({
                        "score": value * 0.8,
                        "weight": 1.7,
                        "factor": "high_risk_geography"
                    })
                    contributing_factors.append("high_risk_geography")

                # Location inconsistencies
                elif "location" in field_lower and "inconsistency" in field_lower and value > 0.4:
                    risk_factors.append({
                        "score": value * 0.7,
                        "weight": 1.5,
                        "factor": "location_inconsistency"
                    })
                    contributing_factors.append("location_inconsistency")

    def _assess_temporal_risk(
        self,
        temporal_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str]
    ) -> None:
        """Assess temporal risk indicators."""
        for field, value in temporal_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Time-based anomalies
                if "anomaly" in field_lower and value > 0.5:
                    risk_factors.append({
                        "score": value * 0.6,
                        "weight": 1.3,
                        "factor": "temporal_anomaly"
                    })
                    contributing_factors.append("temporal_anomaly")

                # Peak period activities
                elif "peak" in field_lower and value > 0.8:
                    risk_factors.append({
                        "score": value * 0.4,
                        "weight": 1.1,
                        "factor": "peak_period_activity"
                    })
                    contributing_factors.append("peak_period_activity")

    def _assess_environmental_risk(
        self,
        environmental_data: Dict[str, Any],
        risk_factors: List[Dict[str, Any]],
        contributing_factors: List[str]
    ) -> None:
        """Assess environmental risk indicators."""
        for field, value in environmental_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Market volatility
                if "volatility" in field_lower and value > 0.7:
                    risk_factors.append({
                        "score": value * 0.5,
                        "weight": 1.2,
                        "factor": "market_volatility"
                    })
                    contributing_factors.append("market_volatility")

                # Economic stress indicators
                elif "stress" in field_lower and value > 0.6:
                    risk_factors.append({
                        "score": value * 0.6,
                        "weight": 1.4,
                        "factor": "economic_stress"
                    })
                    contributing_factors.append("economic_stress")
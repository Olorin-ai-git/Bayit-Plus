"""
Fraud Detection Statistical Outlier Analysis

Implements comprehensive outlier detection and analysis.
"""

from typing import Any, Dict, List


class FraudStatisticalOutlierAnalysis:
    """Comprehensive statistical outlier detection and analysis."""

    @staticmethod
    def perform_outlier_analysis(
        transaction_features: Dict[str, Any],
        z_scores: Dict[str, float],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Perform comprehensive outlier analysis."""
        outlier_analysis: Dict[str, Any] = {
            "outliers_detected": [],
            "outlier_fields": [],
            "outlier_score": 0.0,
        }

        threshold = 2.0 if sensitivity_level == "aggressive" else 3.0

        for field, z_score in z_scores.items():
            if z_score > threshold:
                outlier_analysis["outliers_detected"].append(
                    {
                        "field": field,
                        "value": transaction_features.get(field, 0),
                        "z_score": z_score,
                    }
                )
                outlier_analysis["outlier_fields"].append(field)

        if outlier_analysis["outliers_detected"]:
            max_z_score = max(
                outlier["z_score"] for outlier in outlier_analysis["outliers_detected"]
            )
            outlier_analysis["outlier_score"] = min(max_z_score / 5.0, 1.0)

        return outlier_analysis

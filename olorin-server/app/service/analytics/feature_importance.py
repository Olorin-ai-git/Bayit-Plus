"""
Feature Importance Analysis for Fraud Detection.

Implements feature importance tracking and analysis.

Week 7 Phase 3 implementation.
"""

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.service.analytics.feature_statistics import (
    calculate_combined_importance,
    calculate_discriminative_power,
    calculate_statistics,
    is_numeric,
    pearson_correlation,
)

logger = logging.getLogger(__name__)


class FeatureImportanceAnalyzer:
    """
    Analyzes feature importance for fraud detection model.

    Tracks feature usage, correlations, and predictive power.
    """

    def __init__(self):
        """Initialize feature importance analyzer."""
        self.feature_usage = defaultdict(int)
        self.feature_values = defaultdict(list)
        logger.info("📊 Initialized FeatureImportanceAnalyzer")

    def track_feature_usage(
        self, features: Dict[str, Any], score: float, is_fraud: Optional[bool] = None
    ) -> None:
        """
        Track feature usage and values for importance analysis.

        Args:
            features: Dictionary of feature names and values
            score: Risk score for this transaction
            is_fraud: Whether this is confirmed fraud (if known)
        """
        for feature_name, feature_value in features.items():
            if feature_value is not None and is_numeric(feature_value):
                self.feature_usage[feature_name] += 1
                self.feature_values[feature_name].append(
                    {
                        "value": float(feature_value),
                        "score": score,
                        "is_fraud": is_fraud,
                    }
                )

    def calculate_feature_importance(
        self, min_samples: int = 100
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculate feature importance metrics.

        Args:
            min_samples: Minimum samples required for reliable statistics

        Returns:
            Dictionary of feature importance metrics
        """
        importance_scores = {}

        for feature_name, values in self.feature_values.items():
            if len(values) < min_samples:
                logger.debug(
                    f"Skipping {feature_name}: insufficient samples ({len(values)})"
                )
                continue

            # Extract value lists
            feature_vals = [v["value"] for v in values]
            scores = [v["score"] for v in values]
            fraud_vals = [v["value"] for v in values if v.get("is_fraud") is True]
            non_fraud_vals = [v["value"] for v in values if v.get("is_fraud") is False]

            # Calculate metrics
            correlation = pearson_correlation(feature_vals, scores)
            disc_power = calculate_discriminative_power(fraud_vals, non_fraud_vals)
            stats = calculate_statistics(feature_vals)

            importance_scores[feature_name] = {
                "usage_count": self.feature_usage[feature_name],
                "sample_count": len(values),
                "correlation_with_score": correlation,
                "discriminative_power": disc_power,
                "statistics": stats,
                "importance_score": calculate_combined_importance(
                    correlation, disc_power, len(values)
                ),
            }

        # Sort by importance score
        sorted_features = sorted(
            importance_scores.items(),
            key=lambda x: x[1]["importance_score"],
            reverse=True,
        )

        logger.info(
            f"📊 Calculated importance for {len(sorted_features)} features "
            f"(top: {sorted_features[0][0] if sorted_features else 'none'})"
        )

        return dict(sorted_features)

    def get_feature_correlations(
        self, threshold: float = 0.8
    ) -> List[Tuple[str, str, float]]:
        """
        Find highly correlated feature pairs.

        Args:
            threshold: Correlation threshold for flagging

        Returns:
            List of (feature1, feature2, correlation) tuples
        """
        correlations = []
        feature_names = list(self.feature_values.keys())

        for i, feat1 in enumerate(feature_names):
            for feat2 in feature_names[i + 1 :]:
                if (
                    len(self.feature_values[feat1]) < 50
                    or len(self.feature_values[feat2]) < 50
                ):
                    continue

                corr = self._calculate_feature_correlation(feat1, feat2)
                if abs(corr) >= threshold:
                    correlations.append((feat1, feat2, corr))

        correlations.sort(key=lambda x: abs(x[2]), reverse=True)

        if correlations:
            logger.info(
                f"📊 Found {len(correlations)} highly correlated feature pairs (threshold={threshold})"
            )

        return correlations

    def _calculate_feature_correlation(self, feat1: str, feat2: str) -> float:
        """Calculate correlation between two features."""
        vals1_dict = {i: v["value"] for i, v in enumerate(self.feature_values[feat1])}
        vals2_dict = {i: v["value"] for i, v in enumerate(self.feature_values[feat2])}

        common_indices = set(vals1_dict.keys()) & set(vals2_dict.keys())
        if len(common_indices) < 2:
            return 0.0

        vals1 = [vals1_dict[i] for i in sorted(common_indices)]
        vals2 = [vals2_dict[i] for i in sorted(common_indices)]

        return pearson_correlation(vals1, vals2)

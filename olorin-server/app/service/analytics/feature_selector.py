"""
Feature Selection for Fraud Detection.

Implements feature selection strategies:
1. Importance-based selection
2. Correlation-based redundancy removal
3. Performance-based selection
4. Domain-knowledge based filtering

Week 7 Phase 3 implementation.
"""

import logging
from typing import Dict, Any, List, Set, Optional

from app.service.analytics.feature_groups import categorize_features

logger = logging.getLogger(__name__)


class FeatureSelector:
    """
    Selects optimal feature subset for fraud detection.

    Balances predictive power, redundancy, and computational cost.
    """

    def __init__(
        self,
        importance_threshold: float = 0.1,
        correlation_threshold: float = 0.85,
        min_samples_threshold: int = 100
    ):
        """
        Initialize feature selector.

        Args:
            importance_threshold: Minimum importance score to keep feature
            correlation_threshold: Max correlation to avoid redundancy
            min_samples_threshold: Minimum samples for reliable selection
        """
        self.importance_threshold = importance_threshold
        self.correlation_threshold = correlation_threshold
        self.min_samples_threshold = min_samples_threshold

        self.selected_features: Set[str] = set()
        self.rejected_features: Dict[str, str] = {}

        logger.info(
            f"📊 Initialized FeatureSelector (importance≥{importance_threshold}, "
            f"correlation<{correlation_threshold})"
        )

    def select_features(
        self,
        feature_importance: Dict[str, Dict[str, Any]],
        feature_correlations: List[tuple[str, str, float]],
        essential_features: Optional[Set[str]] = None
    ) -> Dict[str, Any]:
        """
        Select optimal feature subset.

        Args:
            feature_importance: Feature importance scores from analyzer
            feature_correlations: List of correlated feature pairs
            essential_features: Features that must be included

        Returns:
            Dictionary with selected features and selection metadata
        """
        essential_features = essential_features or set()

        # Step 1: Filter by importance threshold
        important_features = self._filter_by_importance(
            feature_importance,
            essential_features
        )

        # Step 2: Remove redundant features based on correlation
        non_redundant_features = self._remove_redundant_features(
            important_features,
            feature_correlations,
            feature_importance,
            essential_features
        )

        # Step 3: Filter by sample count
        final_features = self._filter_by_samples(
            non_redundant_features,
            feature_importance,
            essential_features
        )

        self.selected_features = final_features

        selection_stats = {
            "total_features_analyzed": len(feature_importance),
            "features_selected": len(final_features),
            "features_rejected": len(self.rejected_features),
            "selection_rate": len(final_features) / len(feature_importance) if feature_importance else 0,
            "selected_feature_list": sorted(list(final_features)),
            "rejection_reasons": self.rejected_features
        }

        logger.info(
            f"✅ Feature selection complete: {len(final_features)}/{len(feature_importance)} features selected "
            f"({selection_stats['selection_rate']*100:.1f}%)"
        )

        return selection_stats

    def _filter_by_importance(
        self,
        feature_importance: Dict[str, Dict[str, Any]],
        essential_features: Set[str]
    ) -> Set[str]:
        """Filter features by importance threshold."""
        important = set()

        for feature_name, metrics in feature_importance.items():
            importance_score = metrics.get("importance_score", 0.0)

            if feature_name in essential_features:
                important.add(feature_name)
            elif importance_score >= self.importance_threshold:
                important.add(feature_name)
            else:
                self.rejected_features[feature_name] = f"low_importance:{importance_score:.3f}"

        logger.debug(f"Importance filter: {len(important)} features passed")
        return important

    def _remove_redundant_features(
        self,
        features: Set[str],
        correlations: List[tuple[str, str, float]],
        feature_importance: Dict[str, Dict[str, Any]],
        essential_features: Set[str]
    ) -> Set[str]:
        """Remove redundant highly correlated features."""
        non_redundant = features.copy()

        for feat1, feat2, corr in correlations:
            if abs(corr) < self.correlation_threshold:
                continue

            if feat1 not in non_redundant or feat2 not in non_redundant:
                continue

            if feat1 in essential_features:
                feature_to_remove = feat2
            elif feat2 in essential_features:
                feature_to_remove = feat1
            else:
                imp1 = feature_importance.get(feat1, {}).get("importance_score", 0.0)
                imp2 = feature_importance.get(feat2, {}).get("importance_score", 0.0)
                feature_to_remove = feat1 if imp1 < imp2 else feat2

            if feature_to_remove in non_redundant and feature_to_remove not in essential_features:
                non_redundant.remove(feature_to_remove)
                self.rejected_features[feature_to_remove] = f"redundant_with:{feat1 if feature_to_remove == feat2 else feat2}:{abs(corr):.3f}"

        logger.debug(f"Correlation filter: {len(non_redundant)} features passed")
        return non_redundant

    def _filter_by_samples(
        self,
        features: Set[str],
        feature_importance: Dict[str, Dict[str, Any]],
        essential_features: Set[str]
    ) -> Set[str]:
        """Filter features by minimum sample count."""
        sufficient_samples = set()

        for feature_name in features:
            sample_count = feature_importance.get(feature_name, {}).get("sample_count", 0)

            if feature_name in essential_features:
                sufficient_samples.add(feature_name)
            elif sample_count >= self.min_samples_threshold:
                sufficient_samples.add(feature_name)
            else:
                self.rejected_features[feature_name] = f"insufficient_samples:{sample_count}"

        logger.debug(f"Sample count filter: {len(sufficient_samples)} features passed")
        return sufficient_samples

    def get_feature_groups(self) -> Dict[str, List[str]]:
        """Group selected features by category."""
        return categorize_features(self.selected_features)

    def is_selected(self, feature_name: str) -> bool:
        """Check if a feature is selected."""
        return feature_name in self.selected_features

    def get_rejection_reason(self, feature_name: str) -> Optional[str]:
        """Get rejection reason for a feature."""
        return self.rejected_features.get(feature_name)

"""
Pattern-Based Risk Adjustments for Fraud Detection.

Orchestrates 6 high-impact pattern detection types:
1. Card Testing (+20%)
2. Geo-Impossibility (+25%)
3. BIN Attack (+15%)
4. Time-of-Day Anomaly (+10%)
5. New Device + High Amount (+12%)
6. Cross-Entity Linking (+18%)

Week 6 Phase 2 implementation.
"""

import logging
from typing import Dict, Any, List, Optional

from app.service.analytics.pattern_detectors_transaction import (
    detect_card_testing,
    detect_geo_impossibility,
    detect_bin_attack
)
from app.service.analytics.pattern_detectors_behavioral import (
    detect_time_of_day_anomaly,
    detect_new_device_high_amount,
    detect_cross_entity_linking
)

logger = logging.getLogger(__name__)


class PatternAdjustmentEngine:
    """
    Pattern-based risk adjustment engine.

    Detects 6 high-impact fraud patterns and returns risk adjustments.
    """

    def __init__(self):
        """Initialize pattern adjustment engine."""
        logger.info("📊 Initializing PatternAdjustmentEngine (6 pattern types)")

    def detect_all_patterns(
        self,
        transaction: Dict[str, Any],
        historical_transactions: Optional[List[Dict[str, Any]]] = None,
        advanced_features: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect all pattern types for a transaction.

        Args:
            transaction: Current transaction
            historical_transactions: Historical transactions for the entity
            advanced_features: Advanced features from velocity/geo analysis

        Returns:
            List of detected patterns with risk adjustments
        """
        patterns = []

        # Pattern 1: Card Testing
        card_testing = detect_card_testing(transaction, historical_transactions)
        if card_testing:
            patterns.append(card_testing)

        # Pattern 2: Geo-Impossibility
        geo_impossibility = detect_geo_impossibility(transaction, historical_transactions)
        if geo_impossibility:
            patterns.append(geo_impossibility)

        # Pattern 3: BIN Attack
        bin_attack = detect_bin_attack(transaction, historical_transactions)
        if bin_attack:
            patterns.append(bin_attack)

        # Pattern 4: Time-of-Day Anomaly
        time_anomaly = detect_time_of_day_anomaly(transaction)
        if time_anomaly:
            patterns.append(time_anomaly)

        # Pattern 5: New Device + High Amount
        new_device_high = detect_new_device_high_amount(
            transaction,
            historical_transactions
        )
        if new_device_high:
            patterns.append(new_device_high)

        # Pattern 6: Cross-Entity Linking
        cross_entity = detect_cross_entity_linking(
            transaction,
            historical_transactions,
            advanced_features
        )
        if cross_entity:
            patterns.append(cross_entity)

        if patterns:
            pattern_names = [p["pattern_name"] for p in patterns]
            total_adjustment = sum(p["risk_adjustment"] for p in patterns)
            logger.info(
                f"✅ Detected {len(patterns)} patterns: {', '.join(pattern_names)} "
                f"(total adjustment: +{total_adjustment*100:.0f}%)"
            )

        return patterns

    def apply_pattern_adjustments(
        self,
        base_score: float,
        patterns: List[Dict[str, Any]]
    ) -> tuple[float, List[str]]:
        """
        Apply pattern-based risk adjustments to a base score.

        Args:
            base_score: Base transaction risk score (0.0-1.0)
            patterns: List of detected patterns with risk_adjustments

        Returns:
            Tuple of (adjusted_score, applied_patterns)
        """
        if not patterns:
            return base_score, []

        adjusted_score = base_score
        applied_patterns = []

        for pattern in patterns:
            pattern_name = pattern.get("pattern_name", "unknown")
            risk_adjustment = pattern.get("risk_adjustment", 0.0)

            if risk_adjustment > 0:
                adjusted_score += risk_adjustment
                applied_patterns.append(pattern_name)

        # Cap at 1.0 (100% risk)
        adjusted_score = min(1.0, adjusted_score)

        return adjusted_score, applied_patterns

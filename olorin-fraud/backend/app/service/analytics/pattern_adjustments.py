"""
Pattern-Based Risk Adjustments for Fraud Detection.

Orchestrates 8 high-impact pattern detection types:
1. Card Testing (+20%)
2. Geo-Impossibility (+25%)
3. BIN Attack (+15%)
4. Time-of-Day Anomaly (+10%)
5. New Device + High Amount (+12%)
6. Cross-Entity Linking (+12%, reduced from +18%)
7. Transaction Chaining
8. Refund/Chargeback Spike

CRITICAL: Pattern adjustments are now CAPPED at MAX_PATTERN_ADJUSTMENT (15%)
to prevent score inflation that was causing 100% false positive rates.
"""

import logging
import os
from typing import Any, Dict, List, Optional

# Maximum total pattern adjustment to prevent score inflation
# Without this cap, multiple patterns could push any score above threshold
MAX_PATTERN_ADJUSTMENT = float(os.getenv("MAX_PATTERN_ADJUSTMENT", "0.15"))

# Minimum base score required before applying pattern adjustments
# Prevents boosting already-low-risk transactions
MIN_BASE_SCORE_FOR_PATTERNS = float(os.getenv("MIN_BASE_SCORE_FOR_PATTERNS", "0.35"))

from app.service.analytics.pattern_detectors_behavioral import (
    detect_cross_entity_linking,
    detect_new_device_high_amount,
    detect_time_of_day_anomaly,
)
from app.service.analytics.pattern_detectors_transaction import (
    detect_bin_attack,
    detect_card_testing,
    detect_geo_impossibility,
)
from app.service.analytics.pattern_detectors_advanced import (
    detect_refund_chargeback_spike,
    detect_transaction_chaining,
)

logger = logging.getLogger(__name__)


class PatternAdjustmentEngine:
    """
    Pattern-based risk adjustment engine.

    Detects 8 high-impact fraud patterns and returns risk adjustments.
    """

    def __init__(self):
        """Initialize pattern adjustment engine."""
        logger.info("📊 Initializing PatternAdjustmentEngine (8 pattern types)")

    def detect_all_patterns(
        self,
        transaction: Dict[str, Any],
        historical_transactions: Optional[List[Dict[str, Any]]] = None,
        advanced_features: Optional[Dict[str, Any]] = None,
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
        geo_impossibility = detect_geo_impossibility(
            transaction, historical_transactions
        )
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
            transaction, historical_transactions
        )
        if new_device_high:
            patterns.append(new_device_high)

        # Pattern 6: Cross-Entity Linking
        cross_entity = detect_cross_entity_linking(
            transaction, historical_transactions, advanced_features
        )
        if cross_entity:
            patterns.append(cross_entity)
        
        # Pattern 7: Transaction Chaining
        transaction_chaining = detect_transaction_chaining(
            transaction, historical_transactions
        )
        if transaction_chaining:
            patterns.append(transaction_chaining)
        
        # Pattern 8: Refund/Chargeback Spike
        refund_chargeback = detect_refund_chargeback_spike(
            transaction, historical_transactions
        )
        if refund_chargeback:
            patterns.append(refund_chargeback)

        if patterns:
            pattern_names = [p["pattern_name"] for p in patterns]
            total_adjustment = sum(p["risk_adjustment"] for p in patterns)
            logger.info(
                f"✅ Detected {len(patterns)} patterns: {', '.join(pattern_names)} "
                f"(total adjustment: +{total_adjustment*100:.0f}%)"
            )

        return patterns

    def apply_pattern_adjustments(
        self, base_score: float, patterns: List[Dict[str, Any]]
    ) -> tuple[float, List[str]]:
        """
        Apply pattern-based risk adjustments to a base score.

        CRITICAL FIXES applied:
        1. Only apply adjustments if base_score >= MIN_BASE_SCORE_FOR_PATTERNS (0.35)
           This prevents boosting low-risk transactions above threshold.
        2. Cap total adjustment at MAX_PATTERN_ADJUSTMENT (0.15 = 15%)
           This prevents multiple patterns from inflating scores excessively.

        Args:
            base_score: Base transaction risk score (0.0-1.0)
            patterns: List of detected patterns with risk_adjustments

        Returns:
            Tuple of (adjusted_score, applied_patterns)
        """
        if not patterns:
            return base_score, []

        # FIX #3: Conditional pattern application
        # Only boost if there's already some underlying risk signal
        if base_score < MIN_BASE_SCORE_FOR_PATTERNS:
            logger.debug(
                f"Skipping pattern adjustments: base_score {base_score:.3f} < "
                f"min threshold {MIN_BASE_SCORE_FOR_PATTERNS}"
            )
            return base_score, []

        applied_patterns = []
        total_adjustment = 0.0

        for pattern in patterns:
            pattern_name = pattern.get("pattern_name", "unknown")
            risk_adjustment = pattern.get("risk_adjustment", 0.0)

            if risk_adjustment > 0:
                total_adjustment += risk_adjustment
                applied_patterns.append(pattern_name)

        # FIX #2: Cap total pattern adjustment to prevent score inflation
        capped_adjustment = min(total_adjustment, MAX_PATTERN_ADJUSTMENT)

        if capped_adjustment < total_adjustment:
            logger.info(
                f"Pattern adjustment capped: {total_adjustment*100:.0f}% → "
                f"{capped_adjustment*100:.0f}% (max: {MAX_PATTERN_ADJUSTMENT*100:.0f}%)"
            )

        adjusted_score = base_score + capped_adjustment

        # Cap at 1.0 (100% risk)
        adjusted_score = min(1.0, adjusted_score)

        return adjusted_score, applied_patterns

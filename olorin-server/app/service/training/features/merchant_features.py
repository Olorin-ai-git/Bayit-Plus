"""
Merchant Features Extractor
Feature: 026-llm-training-pipeline

Extracts merchant benchmark and cross-merchant pattern features for fraud detection.
"""

from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.features.feature_models import MerchantFeatures

logger = get_bridge_logger(__name__)


class MerchantFeatureExtractor:
    """Extracts merchant-based features from transaction data."""

    def __init__(self, peer_window_days: int):
        """
        Initialize merchant feature extractor.

        Args:
            peer_window_days: Window for peer comparison calculations
        """
        self._peer_window_days = peer_window_days

    def extract(
        self,
        transactions: List[Dict[str, Any]],
        merchant_benchmarks: Optional[Dict[str, Any]] = None,
    ) -> MerchantFeatures:
        """
        Extract merchant features from transaction list.

        Args:
            transactions: List of transaction dicts
            merchant_benchmarks: Optional pre-computed merchant benchmarks

        Returns:
            MerchantFeatures with calculated values
        """
        if not transactions:
            return MerchantFeatures()

        entity_avg_tx = self._calculate_entity_avg_tx(transactions)
        deviation = self._calculate_deviation(
            entity_avg_tx, merchant_benchmarks
        )
        risk_tier = self._calculate_risk_tier(merchant_benchmarks)
        cross_pattern = self._calculate_cross_merchant_score(transactions)
        fraud_rate = self._get_merchant_fraud_rate(merchant_benchmarks)

        return MerchantFeatures(
            deviation_from_merchant_avg_tx=deviation,
            merchant_risk_tier=risk_tier,
            cross_merchant_pattern_score=cross_pattern,
            merchant_fraud_rate=fraud_rate,
        )

    def _calculate_entity_avg_tx(
        self, transactions: List[Dict[str, Any]]
    ) -> float:
        """Calculate average transaction value for entity."""
        amounts = []
        for tx in transactions:
            amount = tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY")
            if amount is not None:
                amounts.append(float(amount))
        if not amounts:
            return 0.0
        return sum(amounts) / len(amounts)

    def _calculate_deviation(
        self,
        entity_avg: float,
        benchmarks: Optional[Dict[str, Any]],
    ) -> float:
        """Calculate deviation from merchant average transaction value."""
        if not benchmarks:
            return 0.0

        merchant_avg = benchmarks.get("avg_tx_value", 0.0)
        merchant_std = benchmarks.get("std_tx_value", 1.0)

        if merchant_std <= 0:
            merchant_std = 1.0

        deviation = (entity_avg - merchant_avg) / merchant_std
        return round(deviation, 4)

    def _calculate_risk_tier(
        self, benchmarks: Optional[Dict[str, Any]]
    ) -> int:
        """
        Calculate merchant risk tier (0-4).

        0: Very Low, 1: Low, 2: Medium, 3: High, 4: Very High
        """
        if not benchmarks:
            return 2

        fraud_rate = benchmarks.get("fraud_rate", 0.0)

        if fraud_rate < 0.001:
            return 0
        elif fraud_rate < 0.005:
            return 1
        elif fraud_rate < 0.01:
            return 2
        elif fraud_rate < 0.05:
            return 3
        else:
            return 4

    def _calculate_cross_merchant_score(
        self, transactions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate cross-merchant pattern score.

        Higher score indicates suspicious cross-merchant activity.
        """
        merchants = set()
        merchant_amounts: Dict[str, List[float]] = {}

        for tx in transactions:
            merchant = tx.get("MERCHANT_NAME")
            amount = tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY")
            if merchant and amount is not None:
                merchants.add(merchant)
                if merchant not in merchant_amounts:
                    merchant_amounts[merchant] = []
                merchant_amounts[merchant].append(float(amount))

        if len(merchants) <= 1:
            return 0.0

        merchant_count = len(merchants)
        tx_count = sum(len(v) for v in merchant_amounts.values())

        spread_ratio = min(1.0, merchant_count / 5.0)
        avg_per_merchant = tx_count / merchant_count if merchant_count > 0 else 0
        concentration_score = min(1.0, avg_per_merchant / 3.0)

        score = (spread_ratio * 0.6) + (concentration_score * 0.4)
        return round(score, 4)

    def _get_merchant_fraud_rate(
        self, benchmarks: Optional[Dict[str, Any]]
    ) -> float:
        """Get historical fraud rate for merchant."""
        if not benchmarks:
            return 0.0
        return round(benchmarks.get("fraud_rate", 0.0), 6)

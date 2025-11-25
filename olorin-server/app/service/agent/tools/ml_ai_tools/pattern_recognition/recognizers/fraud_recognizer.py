"""
Fraud Pattern Recognizer.

Implements sophisticated fraud pattern detection for:
1. Card Testing Patterns (small amounts followed by large amounts)
2. Velocity Burst Patterns (>5 transactions in 5 minutes)
3. Amount Clustering Patterns (near-threshold amounts: $99, $499, $999)
4. Time-of-Day Anomaly Patterns (unusual transaction hours)

Strategy: Aggressive High Recall (target >85% recall, accept 15-20% FPR)
"""

from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Configuration constants for aggressive high-recall strategy
CARD_TESTING_SMALL_THRESHOLD = 5.0  # Amounts <= $5 considered "testing"
CARD_TESTING_LARGE_THRESHOLD = 200.0  # Amounts >= $200 considered "large purchase"
CARD_TESTING_TIME_WINDOW_MINUTES = 10  # Time window for testing pattern

VELOCITY_BURST_COUNT = 5  # >= 5 transactions triggers burst detection
VELOCITY_BURST_WINDOW_MINUTES = 5  # Within 5 minutes

AMOUNT_CLUSTERING_THRESHOLDS = [
    (99, 101),    # $99-$101 range
    (499, 501),   # $499-$501 range
    (999, 1001),  # $999-$1001 range
]
AMOUNT_CLUSTERING_MIN_COUNT = 2  # Minimum occurrences to flag as clustering

TIME_ANOMALY_UNUSUAL_HOURS = [(0, 5), (22, 24)]  # 12am-5am and 10pm-12am
TIME_ANOMALY_MIN_ZSCORE = 1.5  # Z-score threshold (relaxed for high recall)


class FraudPatternRecognizer:
    """Recognizes fraud-specific patterns in transaction data."""

    def recognize(
        self,
        processed_data: Dict[str, Any],
        minimum_support: float,
        historical_patterns: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Recognize fraud patterns in processed transaction data.

        Args:
            processed_data: Preprocessed data with events, sequences, temporal data
            minimum_support: Minimum support threshold (0.0-1.0)
            historical_patterns: Known historical patterns for comparison

        Returns:
            Dictionary with detected fraud patterns, confidence, and anomalies
        """
        try:
            logger.info("🔍 Starting fraud pattern recognition (aggressive high-recall strategy)")

            # Extract transaction events
            events = processed_data.get("events", [])
            if not events:
                logger.warning("No transaction events found for fraud pattern recognition")
                return self._empty_result(minimum_support)

            logger.info(f"📊 Analyzing {len(events)} transaction events for fraud patterns")

            # Detect all 4 fraud patterns
            card_testing_patterns = self._detect_card_testing(events)
            velocity_burst_patterns = self._detect_velocity_bursts(events)
            amount_clustering_patterns = self._detect_amount_clustering(events)
            time_anomaly_patterns = self._detect_time_anomalies(events)

            # Aggregate all patterns
            all_patterns = []
            all_patterns.extend(card_testing_patterns)
            all_patterns.extend(velocity_burst_patterns)
            all_patterns.extend(amount_clustering_patterns)
            all_patterns.extend(time_anomaly_patterns)

            # Calculate overall confidence and support
            total_events = len(events)
            flagged_events = sum(p.get("affected_count", 0) for p in all_patterns)
            support = min(1.0, flagged_events / total_events) if total_events > 0 else 0.0

            # Confidence calculation (aggressive: higher confidence for any detection)
            confidence = self._calculate_confidence(all_patterns, total_events)

            # Build result
            result = {
                "success": True,
                "patterns": all_patterns,
                "method": "fraud_pattern_recognition",
                "support_threshold": minimum_support,
                "actual_support": support,
                "confidence": confidence,
                "total_events_analyzed": total_events,
                "total_patterns_detected": len(all_patterns),
                "pattern_breakdown": {
                    "card_testing": len(card_testing_patterns),
                    "velocity_burst": len(velocity_burst_patterns),
                    "amount_clustering": len(amount_clustering_patterns),
                    "time_anomaly": len(time_anomaly_patterns)
                }
            }

            logger.info(
                f"✅ Fraud pattern recognition complete: {len(all_patterns)} patterns detected "
                f"(support: {support:.3f}, confidence: {confidence:.3f})"
            )

            return result

        except Exception as e:
            logger.error(f"❌ Fraud pattern recognition failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "patterns": [],
                "method": "fraud_pattern_recognition",
                "support_threshold": minimum_support
            }

    def _detect_card_testing(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect card testing patterns: small amounts followed by large amounts.

        Pattern: Amount <= $5 followed by amount >= $200 within 10 minutes.
        """
        patterns = []

        # Sort events by timestamp
        sorted_events = self._sort_by_timestamp(events)

        for i in range(len(sorted_events) - 1):
            current = sorted_events[i]
            current_amount = self._extract_amount(current)
            current_time = self._extract_timestamp(current)

            if current_amount is None or current_time is None:
                continue

            # Check if current is a small "testing" transaction
            if current_amount <= CARD_TESTING_SMALL_THRESHOLD:
                # Look ahead for large purchase within time window
                for j in range(i + 1, len(sorted_events)):
                    next_event = sorted_events[j]
                    next_amount = self._extract_amount(next_event)
                    next_time = self._extract_timestamp(next_event)

                    if next_amount is None or next_time is None:
                        continue

                    time_diff = (next_time - current_time).total_seconds() / 60

                    # Stop looking if beyond time window
                    if time_diff > CARD_TESTING_TIME_WINDOW_MINUTES:
                        break

                    # Check if large purchase
                    if next_amount >= CARD_TESTING_LARGE_THRESHOLD:
                        patterns.append({
                            "pattern_type": "card_testing",
                            "pattern_name": "Card Testing Sequence",
                            "description": f"Small test amount (${current_amount:.2f}) followed by large purchase (${next_amount:.2f}) within {time_diff:.1f} minutes",
                            "confidence": 0.85,  # High confidence for clear pattern
                            "risk_adjustment": 0.20,  # +20% risk boost
                            "affected_count": 2,
                            "evidence": {
                                "test_amount": current_amount,
                                "large_amount": next_amount,
                                "time_between_minutes": time_diff,
                                "test_transaction": self._extract_tx_id(current),
                                "large_transaction": self._extract_tx_id(next_event)
                            }
                        })
                        logger.debug(
                            f"🚨 Card testing detected: ${current_amount:.2f} → ${next_amount:.2f} "
                            f"in {time_diff:.1f} min"
                        )

        return patterns

    def _detect_velocity_bursts(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect velocity burst patterns: >= 5 transactions within 5 minutes.
        """
        patterns = []

        # Sort events by timestamp
        sorted_events = self._sort_by_timestamp(events)

        # Use sliding window
        for i in range(len(sorted_events)):
            window_start_time = self._extract_timestamp(sorted_events[i])
            if window_start_time is None:
                continue

            # Count transactions in 5-minute window
            burst_txns = []
            for j in range(i, len(sorted_events)):
                event_time = self._extract_timestamp(sorted_events[j])
                if event_time is None:
                    continue

                time_diff = (event_time - window_start_time).total_seconds() / 60

                if time_diff <= VELOCITY_BURST_WINDOW_MINUTES:
                    burst_txns.append(sorted_events[j])
                else:
                    break  # Beyond window

            # Check if burst detected
            if len(burst_txns) >= VELOCITY_BURST_COUNT:
                # Calculate total amount in burst
                burst_amounts = [self._extract_amount(e) for e in burst_txns]
                burst_amounts = [a for a in burst_amounts if a is not None]
                total_amount = sum(burst_amounts) if burst_amounts else 0

                patterns.append({
                    "pattern_type": "velocity_burst",
                    "pattern_name": "Transaction Velocity Burst",
                    "description": f"{len(burst_txns)} transactions within {VELOCITY_BURST_WINDOW_MINUTES} minutes (total: ${total_amount:.2f})",
                    "confidence": 0.80,  # High confidence
                    "risk_adjustment": 0.10,  # +10% risk boost
                    "affected_count": len(burst_txns),
                    "evidence": {
                        "transaction_count": len(burst_txns),
                        "time_window_minutes": VELOCITY_BURST_WINDOW_MINUTES,
                        "total_amount": total_amount,
                        "avg_amount": total_amount / len(burst_txns) if burst_txns else 0,
                        "transaction_ids": [self._extract_tx_id(e) for e in burst_txns[:5]]  # First 5
                    }
                })
                logger.debug(
                    f"🚨 Velocity burst detected: {len(burst_txns)} txns in "
                    f"{VELOCITY_BURST_WINDOW_MINUTES} min, total ${total_amount:.2f}"
                )
                break  # Only report first burst to avoid overlaps

        return patterns

    def _detect_amount_clustering(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect amount clustering patterns: multiple near-threshold amounts.

        Thresholds: $99-$101, $499-$501, $999-$1001
        """
        patterns = []

        # Group amounts by threshold ranges
        for min_amt, max_amt in AMOUNT_CLUSTERING_THRESHOLDS:
            clustered_txns = []

            for event in events:
                amount = self._extract_amount(event)
                if amount is not None and min_amt <= amount <= max_amt:
                    clustered_txns.append(event)

            # Check if clustering detected
            if len(clustered_txns) >= AMOUNT_CLUSTERING_MIN_COUNT:
                amounts = [self._extract_amount(e) for e in clustered_txns]
                amounts = [a for a in amounts if a is not None]

                patterns.append({
                    "pattern_type": "amount_clustering",
                    "pattern_name": f"Amount Clustering (${min_amt}-${max_amt})",
                    "description": f"{len(clustered_txns)} transactions clustered around ${(min_amt + max_amt) / 2:.0f} threshold",
                    "confidence": 0.75,  # Good confidence for threshold avoidance
                    "risk_adjustment": 0.15,  # +15% risk boost
                    "affected_count": len(clustered_txns),
                    "evidence": {
                        "threshold_range": f"${min_amt}-${max_amt}",
                        "transaction_count": len(clustered_txns),
                        "amounts": amounts[:10],  # First 10 amounts
                        "avg_amount": statistics.mean(amounts) if amounts else 0,
                        "transaction_ids": [self._extract_tx_id(e) for e in clustered_txns[:5]]
                    }
                })
                logger.debug(
                    f"🚨 Amount clustering detected: {len(clustered_txns)} txns "
                    f"around ${(min_amt + max_amt) / 2:.0f} threshold"
                )

        return patterns

    def _detect_time_anomalies(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect time-of-day anomaly patterns: transactions at unusual hours.

        Unusual hours: 12am-5am, 10pm-12am
        """
        patterns = []

        # Extract hours of day
        hours_of_day = []
        unusual_hour_txns = []

        for event in events:
            timestamp = self._extract_timestamp(event)
            if timestamp is None:
                continue

            hour = timestamp.hour
            hours_of_day.append(hour)

            # Check if in unusual hour ranges
            for start_hour, end_hour in TIME_ANOMALY_UNUSUAL_HOURS:
                if start_hour <= hour < end_hour:
                    unusual_hour_txns.append(event)
                    break

        # Calculate z-score for unusual hours (if enough data)
        if len(hours_of_day) >= 5 and unusual_hour_txns:
            try:
                mean_hour = statistics.mean(hours_of_day)
                stdev_hour = statistics.stdev(hours_of_day) if len(hours_of_day) > 1 else 1

                unusual_hour_values = [timestamp.hour for event in unusual_hour_txns
                                      if (timestamp := self._extract_timestamp(event)) is not None]

                if unusual_hour_values:
                    avg_unusual_hour = statistics.mean(unusual_hour_values)
                    z_score = abs((avg_unusual_hour - mean_hour) / stdev_hour) if stdev_hour > 0 else 0

                    # Check if anomalous (relaxed threshold for high recall)
                    if z_score >= TIME_ANOMALY_MIN_ZSCORE or len(unusual_hour_txns) / len(events) >= 0.3:
                        patterns.append({
                            "pattern_type": "time_anomaly",
                            "pattern_name": "Time-of-Day Anomaly",
                            "description": f"{len(unusual_hour_txns)} transactions during unusual hours (12am-5am, 10pm-12am)",
                            "confidence": 0.70,  # Moderate confidence (time can vary)
                            "risk_adjustment": 0.10,  # +10% risk boost
                            "affected_count": len(unusual_hour_txns),
                            "evidence": {
                                "unusual_hour_count": len(unusual_hour_txns),
                                "unusual_hour_percentage": len(unusual_hour_txns) / len(events) * 100,
                                "z_score": z_score,
                                "avg_hour": mean_hour,
                                "unusual_hours": unusual_hour_values[:10],
                                "transaction_ids": [self._extract_tx_id(e) for e in unusual_hour_txns[:5]]
                            }
                        })
                        logger.debug(
                            f"🚨 Time anomaly detected: {len(unusual_hour_txns)} txns "
                            f"during unusual hours (z-score: {z_score:.2f})"
                        )
            except Exception as e:
                logger.debug(f"Time anomaly z-score calculation failed: {e}")

        return patterns

    def _calculate_confidence(self, patterns: List[Dict[str, Any]], total_events: int) -> float:
        """
        Calculate overall confidence based on detected patterns.

        Aggressive strategy: Higher confidence when patterns are found.
        """
        if not patterns:
            return 0.0

        # Weight by pattern confidence and affected count
        weighted_sum = 0.0
        total_weight = 0.0

        for pattern in patterns:
            pattern_confidence = pattern.get("confidence", 0.5)
            affected_count = pattern.get("affected_count", 1)
            weight = affected_count / total_events if total_events > 0 else 0.1

            weighted_sum += pattern_confidence * weight
            total_weight += weight

        # Base confidence from weighted average
        base_confidence = weighted_sum / total_weight if total_weight > 0 else 0.5

        # Boost confidence if multiple pattern types detected (ensemble effect)
        pattern_types = set(p.get("pattern_type") for p in patterns)
        if len(pattern_types) >= 2:
            base_confidence = min(1.0, base_confidence * 1.1)  # 10% boost
        if len(pattern_types) >= 3:
            base_confidence = min(1.0, base_confidence * 1.15)  # 15% boost total

        return round(base_confidence, 3)

    def _sort_by_timestamp(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort events by timestamp."""
        events_with_time = []

        for event in events:
            timestamp = self._extract_timestamp(event)
            if timestamp is not None:
                events_with_time.append((timestamp, event))

        events_with_time.sort(key=lambda x: x[0])
        return [event for _, event in events_with_time]

    def _extract_amount(self, event: Dict[str, Any]) -> Optional[float]:
        """Extract transaction amount from event."""
        # Try multiple field names
        for field in ["PAID_AMOUNT_VALUE_IN_CURRENCY", "paid_amount_value_in_currency",
                     "amount", "AMOUNT", "transaction_amount", "value"]:
            if field in event:
                try:
                    return float(event[field])
                except (ValueError, TypeError):
                    continue
        return None

    def _extract_timestamp(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Extract timestamp from event."""
        # Try multiple field names
        for field in ["TX_DATETIME", "tx_datetime", "timestamp", "TIMESTAMP",
                     "transaction_time", "created_at"]:
            if field in event:
                try:
                    value = event[field]
                    if isinstance(value, datetime):
                        return value
                    elif isinstance(value, str):
                        # Try parsing ISO format
                        return datetime.fromisoformat(value.replace('Z', '+00:00'))
                except Exception:
                    continue
        return None

    def _extract_tx_id(self, event: Dict[str, Any]) -> str:
        """Extract transaction ID from event."""
        for field in ["TX_ID_KEY", "tx_id_key", "transaction_id", "id", "txn_id"]:
            if field in event:
                return str(event[field])
        return "unknown"

    def _empty_result(self, minimum_support: float) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            "success": True,
            "patterns": [],
            "method": "fraud_pattern_recognition",
            "support_threshold": minimum_support,
            "actual_support": 0.0,
            "confidence": 0.0,
            "total_events_analyzed": 0,
            "total_patterns_detected": 0
        }


# Alias for backward compatibility
BehavioralPatternRecognizer = FraudPatternRecognizer
TemporalPatternRecognizer = FraudPatternRecognizer
FrequencyPatternRecognizer = FraudPatternRecognizer
NetworkPatternRecognizer = FraudPatternRecognizer
TextualPatternRecognizer = FraudPatternRecognizer

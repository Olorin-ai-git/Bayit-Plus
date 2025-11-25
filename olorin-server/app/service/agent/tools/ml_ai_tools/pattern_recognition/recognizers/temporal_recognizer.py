"""
Temporal Pattern Recognizer for Fraud Detection.

Implements time-based pattern detection:
1. Time series anomaly detection (spikes/drops in transaction volume/amounts)
2. Transaction cadence analysis (regular vs irregular patterns)
3. Time-to-first-transaction analysis (new account velocity)

Strategy: Aggressive high-recall (target >85% recall, accept 15-20% FPR)
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

# Temporal Pattern Constants (Aggressive Strategy)
TIME_SERIES_WINDOW_HOURS = 24  # Analysis window
TIME_SERIES_BUCKET_HOURS = 2   # Bucket size for time series
CADENCE_MIN_TRANSACTIONS = 3   # Minimum transactions to detect cadence
CADENCE_IRREGULARITY_THRESHOLD = 1.5  # Z-score for irregular cadence (relaxed)
FIRST_TX_THRESHOLD_HOURS = 2   # New account immediate transaction threshold
FIRST_TX_HIGH_AMOUNT_PERCENTILE = 0.60  # P60 threshold for high amounts (relaxed)

# Risk Adjustments
TIME_SERIES_ANOMALY_RISK = 0.12  # +12% risk adjustment
IRREGULAR_CADENCE_RISK = 0.10    # +10% risk adjustment
FIRST_TX_VELOCITY_RISK = 0.15    # +15% risk adjustment


class TemporalPatternRecognizer:
    """
    Temporal Pattern Recognizer - Detects time-based fraud patterns.

    Patterns Detected:
    1. Time Series Anomalies: Sudden spikes/drops in transaction volume/amounts
    2. Transaction Cadence: Irregular transaction timing patterns
    3. Time-to-First-Transaction: New accounts with immediate suspicious activity
    """

    def __init__(self):
        """Initialize the temporal pattern recognizer."""
        logger.info("🕒 Initializing TemporalPatternRecognizer (aggressive high-recall strategy)")

    def recognize(
        self,
        processed_data: Dict[str, Any],
        minimum_support: float = 0.1,
        historical_patterns: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Recognize temporal patterns in transaction data.

        Args:
            processed_data: Dictionary containing transaction events
            minimum_support: Minimum support threshold (0.0-1.0)
            historical_patterns: Optional historical pattern data for comparison

        Returns:
            Dictionary containing detected patterns and confidence scores
        """
        try:
            logger.info("🕒 Starting temporal pattern recognition")

            events = processed_data.get("events", [])
            if not events:
                logger.warning("⚠️ No events provided for temporal pattern recognition")
                return self._empty_result()

            logger.info(f"🔍 Analyzing {len(events)} events for temporal patterns")

            # Detect all temporal patterns
            time_series_patterns = self._detect_time_series_anomalies(events)
            cadence_patterns = self._detect_irregular_cadence(events)
            first_tx_patterns = self._detect_first_transaction_velocity(events, historical_patterns)

            # Combine all patterns
            all_patterns = time_series_patterns + cadence_patterns + first_tx_patterns

            # Calculate ensemble confidence
            confidence = self._calculate_confidence(all_patterns, len(events))

            # Pattern breakdown by type
            pattern_breakdown = {
                "time_series_anomaly": len(time_series_patterns),
                "irregular_cadence": len(cadence_patterns),
                "first_transaction_velocity": len(first_tx_patterns)
            }

            logger.info(f"✅ Temporal pattern recognition complete: {len(all_patterns)} patterns detected")
            logger.info(f"📊 Pattern breakdown: {pattern_breakdown}")

            return {
                "success": True,
                "patterns": all_patterns,
                "total_patterns_detected": len(all_patterns),
                "confidence": confidence,
                "pattern_breakdown": pattern_breakdown,
                "minimum_support": minimum_support
            }

        except Exception as e:
            logger.error(f"❌ Error in temporal pattern recognition: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e), "patterns": []}

    def _detect_time_series_anomalies(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect time series anomalies (spikes/drops in volume or amounts).

        Strategy: Bucket transactions by time windows, detect z-score anomalies
        """
        if len(events) < 3:
            return []

        patterns = []

        try:
            # Sort events by timestamp
            sorted_events = sorted(
                [e for e in events if self._extract_timestamp(e)],
                key=lambda x: self._extract_timestamp(x)
            )

            if len(sorted_events) < 3:
                return []

            # Create time buckets
            buckets = self._create_time_buckets(sorted_events, TIME_SERIES_BUCKET_HOURS)

            if len(buckets) < 2:
                return []

            # Calculate volume and amount statistics per bucket
            bucket_volumes = [len(txs) for txs in buckets.values()]
            bucket_amounts = [
                sum(self._extract_amount(tx) or 0 for tx in txs)
                for txs in buckets.values()
            ]

            # Detect volume anomalies
            volume_anomalies = self._detect_statistical_anomalies(
                bucket_volumes,
                threshold=CADENCE_IRREGULARITY_THRESHOLD
            )

            # Detect amount anomalies
            amount_anomalies = self._detect_statistical_anomalies(
                bucket_amounts,
                threshold=CADENCE_IRREGULARITY_THRESHOLD
            )

            # Create pattern if anomalies detected
            if volume_anomalies or amount_anomalies:
                bucket_times = list(buckets.keys())

                pattern = {
                    "pattern_type": "time_series_anomaly",
                    "pattern_name": "Time Series Anomaly",
                    "description": "Detected unusual spikes or drops in transaction volume or amounts over time",
                    "confidence": 0.75 if (volume_anomalies and amount_anomalies) else 0.65,
                    "risk_adjustment": TIME_SERIES_ANOMALY_RISK,
                    "affected_count": len(sorted_events),
                    "evidence": {
                        "volume_anomalies": volume_anomalies,
                        "amount_anomalies": amount_anomalies,
                        "bucket_count": len(buckets),
                        "bucket_size_hours": TIME_SERIES_BUCKET_HOURS,
                        "anomaly_timestamps": [bucket_times[i] for i in volume_anomalies[:3]]
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 Time series anomaly detected: {len(volume_anomalies)} volume, {len(amount_anomalies)} amount")

        except Exception as e:
            logger.error(f"❌ Error detecting time series anomalies: {str(e)}")

        return patterns

    def _detect_irregular_cadence(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect irregular transaction cadence (timing patterns).

        Strategy: Analyze inter-transaction intervals for irregularity
        """
        if len(events) < CADENCE_MIN_TRANSACTIONS:
            return []

        patterns = []

        try:
            # Sort events by timestamp
            sorted_events = sorted(
                [e for e in events if self._extract_timestamp(e)],
                key=lambda x: self._extract_timestamp(x)
            )

            if len(sorted_events) < CADENCE_MIN_TRANSACTIONS:
                return []

            # Calculate inter-transaction intervals (in minutes)
            intervals = []
            for i in range(1, len(sorted_events)):
                prev_ts = self._extract_timestamp(sorted_events[i-1])
                curr_ts = self._extract_timestamp(sorted_events[i])
                if prev_ts and curr_ts:
                    interval_minutes = (curr_ts - prev_ts).total_seconds() / 60
                    intervals.append(interval_minutes)

            if len(intervals) < 2:
                return []

            # Calculate coefficient of variation (std/mean) for irregularity
            mean_interval = statistics.mean(intervals)
            std_interval = statistics.stdev(intervals) if len(intervals) > 1 else 0

            # Avoid division by zero
            if mean_interval == 0:
                return []

            cv = std_interval / mean_interval

            # Detect irregularity (high CV indicates irregular cadence)
            # Relaxed threshold: CV > 1.5 is considered irregular
            if cv > CADENCE_IRREGULARITY_THRESHOLD:
                # Check for burst patterns (many short intervals mixed with long ones)
                short_intervals = sum(1 for i in intervals if i < mean_interval / 2)
                long_intervals = sum(1 for i in intervals if i > mean_interval * 2)

                pattern = {
                    "pattern_type": "irregular_cadence",
                    "pattern_name": "Irregular Transaction Cadence",
                    "description": "Detected highly irregular transaction timing pattern",
                    "confidence": min(0.85, 0.60 + (cv - CADENCE_IRREGULARITY_THRESHOLD) * 0.10),
                    "risk_adjustment": IRREGULAR_CADENCE_RISK,
                    "affected_count": len(sorted_events),
                    "evidence": {
                        "coefficient_of_variation": round(cv, 2),
                        "mean_interval_minutes": round(mean_interval, 2),
                        "std_interval_minutes": round(std_interval, 2),
                        "short_interval_count": short_intervals,
                        "long_interval_count": long_intervals,
                        "total_intervals": len(intervals)
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 Irregular cadence detected: CV={cv:.2f}, mean={mean_interval:.2f}min")

        except Exception as e:
            logger.error(f"❌ Error detecting irregular cadence: {str(e)}")

        return patterns

    def _detect_first_transaction_velocity(
        self,
        events: List[Dict[str, Any]],
        historical_patterns: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect suspicious time-to-first-transaction patterns.

        Strategy: New accounts with immediate high-value transactions
        """
        patterns = []

        try:
            # Sort events by timestamp
            sorted_events = sorted(
                [e for e in events if self._extract_timestamp(e)],
                key=lambda x: self._extract_timestamp(x)
            )

            if not sorted_events:
                return []

            first_event = sorted_events[0]
            first_ts = self._extract_timestamp(first_event)
            first_amount = self._extract_amount(first_event)

            if not first_ts or first_amount is None:
                return []

            # Check if this is a "new account" scenario
            # Use historical patterns to determine account age, or assume all events are recent
            account_creation_time = historical_patterns.get("account_creation_time") if historical_patterns else None

            if account_creation_time:
                time_to_first_tx = (first_ts - account_creation_time).total_seconds() / 3600  # hours
            else:
                # Assume very short time if no historical data
                time_to_first_tx = 0.5  # Default: 30 minutes

            # Calculate amount percentile among all events
            all_amounts = [self._extract_amount(e) for e in sorted_events if self._extract_amount(e) is not None]
            if not all_amounts:
                return []

            amount_percentile = sum(1 for a in all_amounts if a <= first_amount) / len(all_amounts)

            # Detect suspicious first transaction: quick + high amount (relaxed thresholds)
            if time_to_first_tx <= FIRST_TX_THRESHOLD_HOURS and amount_percentile >= FIRST_TX_HIGH_AMOUNT_PERCENTILE:
                pattern = {
                    "pattern_type": "first_transaction_velocity",
                    "pattern_name": "Suspicious First Transaction Velocity",
                    "description": "New account with immediate high-value transaction",
                    "confidence": 0.70 + (amount_percentile - FIRST_TX_HIGH_AMOUNT_PERCENTILE) * 0.5,
                    "risk_adjustment": FIRST_TX_VELOCITY_RISK,
                    "affected_count": 1,
                    "evidence": {
                        "time_to_first_tx_hours": round(time_to_first_tx, 2),
                        "first_transaction_amount": first_amount,
                        "amount_percentile": round(amount_percentile, 2),
                        "threshold_hours": FIRST_TX_THRESHOLD_HOURS,
                        "first_transaction_id": first_event.get("TX_ID_KEY") or first_event.get("transaction_id")
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 First transaction velocity detected: {time_to_first_tx:.2f}h, P{amount_percentile*100:.0f} amount")

        except Exception as e:
            logger.error(f"❌ Error detecting first transaction velocity: {str(e)}")

        return patterns

    def _create_time_buckets(
        self,
        events: List[Dict[str, Any]],
        bucket_hours: int
    ) -> Dict[datetime, List[Dict[str, Any]]]:
        """Create time buckets for events."""
        buckets = defaultdict(list)

        if not events:
            return buckets

        first_ts = self._extract_timestamp(events[0])
        if not first_ts:
            return buckets

        for event in events:
            ts = self._extract_timestamp(event)
            if not ts:
                continue

            # Calculate bucket key (rounded down to bucket_hours)
            hours_since_start = (ts - first_ts).total_seconds() / 3600
            bucket_index = int(hours_since_start // bucket_hours)
            bucket_time = first_ts + timedelta(hours=bucket_index * bucket_hours)

            buckets[bucket_time].append(event)

        return buckets

    def _detect_statistical_anomalies(
        self,
        values: List[float],
        threshold: float = 1.5
    ) -> List[int]:
        """Detect anomalies using z-score analysis."""
        if len(values) < 2:
            return []

        try:
            mean_val = statistics.mean(values)
            std_val = statistics.stdev(values) if len(values) > 1 else 0

            if std_val == 0:
                return []

            anomalies = []
            for i, val in enumerate(values):
                z_score = abs((val - mean_val) / std_val)
                if z_score > threshold:
                    anomalies.append(i)

            return anomalies

        except Exception as e:
            logger.error(f"❌ Error in statistical anomaly detection: {str(e)}")
            return []

    def _calculate_confidence(self, patterns: List[Dict[str, Any]], total_events: int) -> float:
        """
        Calculate overall confidence score with ensemble boosting.

        Multiple pattern types increase confidence (ensemble effect).
        """
        if not patterns:
            return 0.0

        # Base confidence: weighted average of individual pattern confidences
        base_confidence = sum(p["confidence"] for p in patterns) / len(patterns)

        # Ensemble boost: multiple pattern types detected
        unique_types = len(set(p["pattern_type"] for p in patterns))
        ensemble_boost = min(0.15, unique_types * 0.05)  # Up to +15% boost

        # Affected transaction ratio boost
        max_affected = max(p["affected_count"] for p in patterns)
        coverage_boost = min(0.10, (max_affected / total_events) * 0.10)  # Up to +10% boost

        final_confidence = min(1.0, base_confidence + ensemble_boost + coverage_boost)

        return round(final_confidence, 2)

    def _extract_amount(self, event: Dict[str, Any]) -> Optional[float]:
        """Extract transaction amount from event."""
        amount_fields = [
            "PAID_AMOUNT_VALUE_IN_CURRENCY",
            "amount",
            "transaction_amount",
            "value",
            "total"
        ]

        for field in amount_fields:
            if field in event:
                try:
                    return float(event[field])
                except (ValueError, TypeError):
                    continue

        return None

    def _extract_timestamp(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Extract timestamp from event."""
        timestamp_fields = [
            "TX_DATETIME",
            "timestamp",
            "created_at",
            "transaction_time",
            "event_time"
        ]

        for field in timestamp_fields:
            if field in event:
                ts = event[field]
                if isinstance(ts, datetime):
                    return ts
                elif isinstance(ts, str):
                    try:
                        # Try ISO format
                        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    except ValueError:
                        continue

        return None

    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            "success": True,
            "patterns": [],
            "total_patterns_detected": 0,
            "confidence": 0.0,
            "pattern_breakdown": {
                "time_series_anomaly": 0,
                "irregular_cadence": 0,
                "first_transaction_velocity": 0
            }
        }

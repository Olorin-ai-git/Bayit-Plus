"""
Behavioral Pattern Recognizer.

Implements behavioral pattern detection for:
1. Session Behavior Anomalies (device/browser changes mid-session)
2. Purchase Behavior Deviation (category shift, amount deviation)
3. Multi-Entity Clustering (shared device/IP across accounts)
4. Account Takeover Indicators (sudden profile changes + transactions)

Strategy: Aggressive High Recall (target >85% recall, accept 15-20% FPR)
"""

import statistics
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Configuration constants for aggressive high-recall strategy
SESSION_DEVICE_CHANGE_THRESHOLD = 2  # Device changes in single session
SESSION_BROWSER_CHANGE_THRESHOLD = 2  # Browser changes in single session
SESSION_TIME_WINDOW_MINUTES = 60  # Session window

PURCHASE_CATEGORY_SHIFT_MIN_CATEGORIES = 3  # Minimum new categories to flag
PURCHASE_AMOUNT_DEVIATION_ZSCORE = 1.5  # Z-score threshold (relaxed)

MULTI_ENTITY_SHARED_DEVICE_THRESHOLD = 3  # >= 3 emails on same device
MULTI_ENTITY_SHARED_IP_THRESHOLD = 5  # >= 5 devices from same IP (household filter)

ATO_PROFILE_CHANGE_FIELDS = ["email", "device_id", "user_agent", "ip"]
ATO_RAPID_TRANSACTION_MINUTES = 30  # Transactions within 30 min of profile change


class BehavioralPatternRecognizer:
    """Recognizes behavioral patterns in user/entity data."""

    def recognize(
        self,
        processed_data: Dict[str, Any],
        minimum_support: float,
        historical_patterns: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Recognize behavioral patterns in processed data.

        Args:
            processed_data: Preprocessed data with events, sequences, behaviors
            minimum_support: Minimum support threshold (0.0-1.0)
            historical_patterns: Known historical patterns for comparison

        Returns:
            Dictionary with detected behavioral patterns, confidence, and anomalies
        """
        try:
            logger.info(
                "🔍 Starting behavioral pattern recognition (aggressive high-recall strategy)"
            )

            # Extract events and behavioral data
            events = processed_data.get("events", [])
            behaviors = processed_data.get("behaviors", [])

            if not events:
                logger.warning("No events found for behavioral pattern recognition")
                return self._empty_result(minimum_support)

            logger.info(f"📊 Analyzing {len(events)} events for behavioral patterns")

            # Detect all 4 behavioral patterns
            session_anomaly_patterns = self._detect_session_anomalies(events)
            purchase_deviation_patterns = self._detect_purchase_deviations(
                events, historical_patterns
            )
            multi_entity_patterns = self._detect_multi_entity_clustering(events)
            ato_patterns = self._detect_account_takeover_indicators(events)

            # Aggregate all patterns
            all_patterns = []
            all_patterns.extend(session_anomaly_patterns)
            all_patterns.extend(purchase_deviation_patterns)
            all_patterns.extend(multi_entity_patterns)
            all_patterns.extend(ato_patterns)

            # Calculate overall confidence and support
            total_events = len(events)
            flagged_events = sum(p.get("affected_count", 0) for p in all_patterns)
            support = (
                min(1.0, flagged_events / total_events) if total_events > 0 else 0.0
            )

            # Confidence calculation
            confidence = self._calculate_confidence(all_patterns, total_events)

            # Build result
            result = {
                "success": True,
                "patterns": all_patterns,
                "method": "behavioral_pattern_recognition",
                "support_threshold": minimum_support,
                "actual_support": support,
                "confidence": confidence,
                "total_events_analyzed": total_events,
                "total_patterns_detected": len(all_patterns),
                "pattern_breakdown": {
                    "session_anomaly": len(session_anomaly_patterns),
                    "purchase_deviation": len(purchase_deviation_patterns),
                    "multi_entity": len(multi_entity_patterns),
                    "account_takeover": len(ato_patterns),
                },
            }

            logger.info(
                f"✅ Behavioral pattern recognition complete: {len(all_patterns)} patterns detected "
                f"(support: {support:.3f}, confidence: {confidence:.3f})"
            )

            return result

        except Exception as e:
            logger.error(
                f"❌ Behavioral pattern recognition failed: {e}", exc_info=True
            )
            return {
                "success": False,
                "error": str(e),
                "patterns": [],
                "method": "behavioral_pattern_recognition",
                "support_threshold": minimum_support,
            }

    def _detect_session_anomalies(
        self, events: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect session behavior anomalies: device/browser changes mid-session.
        """
        patterns = []

        # Group events by session (using time windows)
        sorted_events = self._sort_by_timestamp(events)
        sessions = self._group_into_sessions(sorted_events, SESSION_TIME_WINDOW_MINUTES)

        for session_events in sessions:
            if len(session_events) < 2:
                continue

            # Track device and user agent changes within session
            devices = set()
            user_agents = set()

            for event in session_events:
                device = self._extract_device_id(event)
                user_agent = self._extract_user_agent(event)

                if device:
                    devices.add(device)
                if user_agent:
                    user_agents.add(user_agent)

            # Check for anomalies
            device_changes = len(devices) - 1
            browser_changes = len(user_agents) - 1

            if (
                device_changes >= SESSION_DEVICE_CHANGE_THRESHOLD
                or browser_changes >= SESSION_BROWSER_CHANGE_THRESHOLD
            ):

                patterns.append(
                    {
                        "pattern_type": "session_anomaly",
                        "pattern_name": "Session Behavior Anomaly",
                        "description": f"Session with {device_changes} device changes and {browser_changes} browser changes",
                        "confidence": 0.80,  # High confidence for mid-session changes
                        "risk_adjustment": 0.15,  # +15% risk boost
                        "affected_count": len(session_events),
                        "evidence": {
                            "device_changes": device_changes,
                            "browser_changes": browser_changes,
                            "unique_devices": list(devices)[:5],
                            "unique_user_agents": list(user_agents)[:3],
                            "session_duration_minutes": self._calculate_session_duration(
                                session_events
                            ),
                            "transaction_ids": [
                                self._extract_tx_id(e) for e in session_events[:5]
                            ],
                        },
                    }
                )
                logger.debug(
                    f"🚨 Session anomaly detected: {device_changes} device changes, "
                    f"{browser_changes} browser changes"
                )

        return patterns

    def _detect_purchase_deviations(
        self,
        events: List[Dict[str, Any]],
        historical_patterns: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Detect purchase behavior deviations: category shift, amount deviation.
        """
        patterns = []

        # Extract merchant categories and amounts
        categories = []
        amounts = []

        for event in events:
            merchant = self._extract_merchant(event)
            amount = self._extract_amount(event)

            if merchant:
                categories.append(merchant)
            if amount is not None:
                amounts.append(amount)

        # 1. Category shift detection
        if categories:
            category_counts = Counter(categories)
            unique_categories = len(category_counts)

            # Check if many new categories (indicates behavior shift)
            if unique_categories >= PURCHASE_CATEGORY_SHIFT_MIN_CATEGORIES:
                # Check against historical if available
                is_deviation = True
                new_merchants = set(categories)
                if historical_patterns and "common_merchants" in historical_patterns:
                    common_merchants = set(historical_patterns["common_merchants"])
                    new_merchants = set(categories) - common_merchants
                    is_deviation = (
                        len(new_merchants) >= PURCHASE_CATEGORY_SHIFT_MIN_CATEGORIES
                    )

                if is_deviation:
                    patterns.append(
                        {
                            "pattern_type": "purchase_deviation",
                            "pattern_name": "Purchase Category Shift",
                            "description": f"Unusual merchant diversity: {unique_categories} different merchants",
                            "confidence": 0.70,  # Moderate confidence
                            "risk_adjustment": 0.12,  # +12% risk boost
                            "affected_count": len(categories),
                            "evidence": {
                                "unique_categories": unique_categories,
                                "top_merchants": [
                                    m for m, _ in category_counts.most_common(5)
                                ],
                                "new_merchants_count": len(new_merchants),
                            },
                        }
                    )
                    logger.debug(
                        f"🚨 Category shift detected: {unique_categories} unique merchants"
                    )

        # 2. Amount deviation detection
        if len(amounts) >= 5:  # Need sufficient data for z-score
            try:
                mean_amount = statistics.mean(amounts)
                stdev_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0

                if stdev_amount > 0:
                    # Check for outlier amounts
                    outliers = []
                    for i, amount in enumerate(amounts):
                        z_score = abs((amount - mean_amount) / stdev_amount)
                        if z_score >= PURCHASE_AMOUNT_DEVIATION_ZSCORE:
                            outliers.append((i, amount, z_score))

                    if outliers:
                        patterns.append(
                            {
                                "pattern_type": "purchase_deviation",
                                "pattern_name": "Purchase Amount Deviation",
                                "description": f"{len(outliers)} transactions with unusual amounts (z-score ≥ {PURCHASE_AMOUNT_DEVIATION_ZSCORE})",
                                "confidence": 0.75,  # Good confidence for statistical deviation
                                "risk_adjustment": 0.10,  # +10% risk boost
                                "affected_count": len(outliers),
                                "evidence": {
                                    "outlier_count": len(outliers),
                                    "mean_amount": mean_amount,
                                    "stdev_amount": stdev_amount,
                                    "outlier_amounts": [
                                        amt for _, amt, _ in outliers[:5]
                                    ],
                                    "outlier_zscores": [z for _, _, z in outliers[:5]],
                                },
                            }
                        )
                        logger.debug(
                            f"🚨 Amount deviation detected: {len(outliers)} outlier transactions"
                        )
            except Exception as e:
                logger.debug(f"Amount deviation calculation failed: {e}")

        return patterns

    def _detect_multi_entity_clustering(
        self, events: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect multi-entity clustering: shared device/IP across accounts.
        """
        patterns = []

        # Group by device and IP
        device_to_emails = defaultdict(set)
        ip_to_devices = defaultdict(set)

        for event in events:
            email = self._extract_email(event)
            device = self._extract_device_id(event)
            ip = self._extract_ip(event)

            if device and email:
                device_to_emails[device].add(email)
            if ip and device:
                ip_to_devices[ip].add(device)

        # 1. Shared device detection
        for device, emails in device_to_emails.items():
            if len(emails) >= MULTI_ENTITY_SHARED_DEVICE_THRESHOLD:
                patterns.append(
                    {
                        "pattern_type": "multi_entity",
                        "pattern_name": "Shared Device Clustering",
                        "description": f"Device shared across {len(emails)} different accounts",
                        "confidence": 0.85,  # High confidence for device sharing
                        "risk_adjustment": 0.18,  # +18% risk boost (serious indicator)
                        "affected_count": len(emails),
                        "evidence": {
                            "device_id": device,
                            "email_count": len(emails),
                            "emails": list(emails)[:5],  # First 5 emails
                        },
                    }
                )
                logger.debug(
                    f"🚨 Shared device detected: {len(emails)} accounts on device {device}"
                )

        # 2. Shared IP detection (with household filter)
        for ip, devices in ip_to_devices.items():
            if len(devices) >= MULTI_ENTITY_SHARED_IP_THRESHOLD:
                # This could be household or fraud ring
                # Use conservative threshold to avoid false positives for families
                patterns.append(
                    {
                        "pattern_type": "multi_entity",
                        "pattern_name": "Shared IP Clustering",
                        "description": f"IP address with {len(devices)} different devices (potential fraud ring or household)",
                        "confidence": 0.65,  # Lower confidence (could be legitimate household)
                        "risk_adjustment": 0.10,  # +10% risk boost (moderate)
                        "affected_count": len(devices),
                        "evidence": {
                            "ip_address": ip,
                            "device_count": len(devices),
                            "devices": list(devices)[:5],
                        },
                    }
                )
                logger.debug(
                    f"🚨 Shared IP detected: {len(devices)} devices from IP {ip}"
                )

        return patterns

    def _detect_account_takeover_indicators(
        self, events: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect account takeover indicators: sudden profile changes + transactions.
        """
        patterns = []

        # Sort events chronologically
        sorted_events = self._sort_by_timestamp(events)

        # Track profile changes
        for i in range(len(sorted_events) - 1):
            current = sorted_events[i]
            next_event = sorted_events[i + 1]

            current_time = self._extract_timestamp(current)
            next_time = self._extract_timestamp(next_event)

            if current_time is None or next_time is None:
                continue

            # Check for profile field changes
            changes = []
            for field in ATO_PROFILE_CHANGE_FIELDS:
                current_val = self._extract_field(current, field)
                next_val = self._extract_field(next_event, field)

                if current_val and next_val and current_val != next_val:
                    changes.append(field)

            # Check if transaction follows profile change within time window
            if changes:
                time_diff = (next_time - current_time).total_seconds() / 60

                if time_diff <= ATO_RAPID_TRANSACTION_MINUTES:
                    patterns.append(
                        {
                            "pattern_type": "account_takeover",
                            "pattern_name": "Account Takeover Indicator",
                            "description": f"Profile changes ({', '.join(changes)}) followed by transaction within {time_diff:.1f} minutes",
                            "confidence": 0.75,  # Good confidence for ATO pattern
                            "risk_adjustment": 0.20,  # +20% risk boost (serious threat)
                            "affected_count": 2,
                            "evidence": {
                                "changed_fields": changes,
                                "time_to_transaction_minutes": time_diff,
                                "profile_change_transaction": self._extract_tx_id(
                                    current
                                ),
                                "following_transaction": self._extract_tx_id(
                                    next_event
                                ),
                            },
                        }
                    )
                    logger.debug(
                        f"🚨 ATO indicator detected: {', '.join(changes)} changed, "
                        f"transaction in {time_diff:.1f} min"
                    )

        return patterns

    def _group_into_sessions(
        self, sorted_events: List[Dict[str, Any]], window_minutes: int
    ) -> List[List[Dict[str, Any]]]:
        """Group events into sessions based on time windows."""
        if not sorted_events:
            return []

        sessions = []
        current_session = [sorted_events[0]]
        session_start = self._extract_timestamp(sorted_events[0])

        for event in sorted_events[1:]:
            event_time = self._extract_timestamp(event)

            if event_time is None or session_start is None:
                continue

            time_diff = (event_time - session_start).total_seconds() / 60

            if time_diff <= window_minutes:
                current_session.append(event)
            else:
                # Start new session
                if current_session:
                    sessions.append(current_session)
                current_session = [event]
                session_start = event_time

        # Add last session
        if current_session:
            sessions.append(current_session)

        return sessions

    def _calculate_session_duration(
        self, session_events: List[Dict[str, Any]]
    ) -> float:
        """Calculate session duration in minutes."""
        if len(session_events) < 2:
            return 0.0

        timestamps = [self._extract_timestamp(e) for e in session_events]
        timestamps = [t for t in timestamps if t is not None]

        if len(timestamps) < 2:
            return 0.0

        return (max(timestamps) - min(timestamps)).total_seconds() / 60

    def _calculate_confidence(
        self, patterns: List[Dict[str, Any]], total_events: int
    ) -> float:
        """Calculate overall confidence based on detected patterns."""
        if not patterns:
            return 0.0

        weighted_sum = 0.0
        total_weight = 0.0

        for pattern in patterns:
            pattern_confidence = pattern.get("confidence", 0.5)
            affected_count = pattern.get("affected_count", 1)
            weight = affected_count / total_events if total_events > 0 else 0.1

            weighted_sum += pattern_confidence * weight
            total_weight += weight

        base_confidence = weighted_sum / total_weight if total_weight > 0 else 0.5

        # Boost for multiple pattern types
        pattern_types = set(p.get("pattern_type") for p in patterns)
        if len(pattern_types) >= 2:
            base_confidence = min(1.0, base_confidence * 1.1)
        if len(pattern_types) >= 3:
            base_confidence = min(1.0, base_confidence * 1.15)

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

    # Field extraction helpers
    def _extract_amount(self, event: Dict[str, Any]) -> Optional[float]:
        """Extract transaction amount."""
        for field in [
            "PAID_AMOUNT_VALUE_IN_CURRENCY",
            "paid_amount_value_in_currency",
            "amount",
            "AMOUNT",
        ]:
            if field in event:
                try:
                    return float(event[field])
                except (ValueError, TypeError):
                    continue
        return None

    def _extract_timestamp(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Extract timestamp."""
        for field in [
            "TX_DATETIME",
            "tx_datetime",
            "timestamp",
            "TIMESTAMP",
            "created_at",
        ]:
            if field in event:
                try:
                    value = event[field]
                    if isinstance(value, datetime):
                        return value
                    elif isinstance(value, str):
                        return datetime.fromisoformat(value.replace("Z", "+00:00"))
                except Exception:
                    continue
        return None

    def _extract_tx_id(self, event: Dict[str, Any]) -> str:
        """Extract transaction ID."""
        for field in ["TX_ID_KEY", "tx_id_key", "transaction_id", "id"]:
            if field in event:
                return str(event[field])
        return "unknown"

    def _extract_device_id(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract device ID."""
        for field in ["DEVICE_ID", "device_id", "device"]:
            if field in event:
                return str(event[field])
        return None

    def _extract_user_agent(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract user agent."""
        for field in ["USER_AGENT", "user_agent", "browser"]:
            if field in event:
                return str(event[field])
        return None

    def _extract_email(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract email."""
        for field in ["EMAIL", "email", "user_email"]:
            if field in event:
                return str(event[field])
        return None

    def _extract_ip(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract IP address."""
        for field in ["IP", "ip", "ip_address", "IP_ADDRESS"]:
            if field in event:
                return str(event[field])
        return None

    def _extract_merchant(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract merchant/category."""
        for field in [
            "MERCHANT_NAME",
            "merchant_name",
            "MERCHANT_ID",
            "merchant",
            "category",
        ]:
            if field in event:
                return str(event[field])
        return None

    def _extract_field(self, event: Dict[str, Any], field_name: str) -> Optional[str]:
        """Extract any field by name."""
        field_variants = [field_name, field_name.upper(), field_name.lower()]
        for variant in field_variants:
            if variant in event:
                return str(event[variant])
        return None

    def _empty_result(self, minimum_support: float) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            "success": True,
            "patterns": [],
            "method": "behavioral_pattern_recognition",
            "support_threshold": minimum_support,
            "actual_support": 0.0,
            "confidence": 0.0,
            "total_events_analyzed": 0,
            "total_patterns_detected": 0,
        }

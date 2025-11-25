"""
Frequency Pattern Recognizer for Fraud Detection.

Implements frequency-based pattern detection:
1. Entity frequency analysis (unusual frequency of entity appearances)
2. BIN attack detection (same BIN, multiple cards)
3. Merchant concentration detection (high concentration at specific merchants)

Strategy: Aggressive high-recall (target >85% recall, accept 15-20% FPR)
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)

# Frequency Pattern Constants (Aggressive Strategy)
ENTITY_FREQUENCY_THRESHOLD = 5      # Minimum frequency to trigger (relaxed)
BIN_ATTACK_MIN_CARDS = 4            # Minimum different cards with same BIN
BIN_ATTACK_TIME_WINDOW_HOURS = 24  # Time window for BIN attack detection
MERCHANT_CONCENTRATION_THRESHOLD = 0.60  # 60% of transactions at one merchant (relaxed)
MERCHANT_CONCENTRATION_MIN_TXS = 3  # Minimum transactions to detect concentration

# Risk Adjustments
ENTITY_FREQUENCY_RISK = 0.12    # +12% risk adjustment
BIN_ATTACK_RISK = 0.15          # +15% risk adjustment
MERCHANT_CONCENTRATION_RISK = 0.10  # +10% risk adjustment


class FrequencyPatternRecognizer:
    """
    Frequency Pattern Recognizer - Detects frequency-based fraud patterns.

    Patterns Detected:
    1. Entity Frequency Analysis: Unusual frequency of entities (email, device, IP)
    2. BIN Attack: Same BIN with multiple different card numbers
    3. Merchant Concentration: High transaction concentration at specific merchants
    """

    def __init__(self):
        """Initialize the frequency pattern recognizer."""
        logger.info("📊 Initializing FrequencyPatternRecognizer (aggressive high-recall strategy)")

    def recognize(
        self,
        processed_data: Dict[str, Any],
        minimum_support: float = 0.1,
        historical_patterns: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Recognize frequency patterns in transaction data.

        Args:
            processed_data: Dictionary containing transaction events
            minimum_support: Minimum support threshold (0.0-1.0)
            historical_patterns: Optional historical pattern data for comparison

        Returns:
            Dictionary containing detected patterns and confidence scores
        """
        try:
            logger.info("📊 Starting frequency pattern recognition")

            events = processed_data.get("events", [])
            if not events:
                logger.warning("⚠️ No events provided for frequency pattern recognition")
                return self._empty_result()

            logger.info(f"🔍 Analyzing {len(events)} events for frequency patterns")

            # Detect all frequency patterns
            entity_patterns = self._detect_entity_frequency(events)
            bin_patterns = self._detect_bin_attacks(events)
            merchant_patterns = self._detect_merchant_concentration(events)

            # Combine all patterns
            all_patterns = entity_patterns + bin_patterns + merchant_patterns

            # Calculate ensemble confidence
            confidence = self._calculate_confidence(all_patterns, len(events))

            # Pattern breakdown by type
            pattern_breakdown = {
                "entity_frequency": len(entity_patterns),
                "bin_attack": len(bin_patterns),
                "merchant_concentration": len(merchant_patterns)
            }

            logger.info(f"✅ Frequency pattern recognition complete: {len(all_patterns)} patterns detected")
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
            logger.error(f"❌ Error in frequency pattern recognition: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e), "patterns": []}

    def _detect_entity_frequency(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect entity frequency anomalies.

        Strategy: Identify entities (email, device, IP) appearing unusually frequently
        """
        patterns = []

        try:
            # Track frequency of different entity types
            email_counter = Counter()
            device_counter = Counter()
            ip_counter = Counter()

            for event in events:
                email = self._extract_email(event)
                device_id = self._extract_device_id(event)
                ip = self._extract_ip(event)

                if email:
                    email_counter[email] += 1
                if device_id:
                    device_counter[device_id] += 1
                if ip:
                    ip_counter[ip] += 1

            # Detect high-frequency entities (relaxed threshold for high recall)
            high_freq_entities = []

            for entity_type, counter in [("email", email_counter), ("device_id", device_counter), ("ip_address", ip_counter)]:
                for entity, count in counter.items():
                    if count >= ENTITY_FREQUENCY_THRESHOLD:
                        frequency_ratio = count / len(events)
                        high_freq_entities.append({
                            "entity_type": entity_type,
                            "entity_value": entity,
                            "frequency": count,
                            "frequency_ratio": round(frequency_ratio, 2)
                        })

            # Create pattern if high-frequency entities detected
            if high_freq_entities:
                # Sort by frequency
                high_freq_entities.sort(key=lambda x: x["frequency"], reverse=True)

                pattern = {
                    "pattern_type": "entity_frequency",
                    "pattern_name": "Entity Frequency Anomaly",
                    "description": "Detected entities appearing with unusually high frequency",
                    "confidence": min(0.85, 0.65 + len(high_freq_entities) * 0.05),
                    "risk_adjustment": ENTITY_FREQUENCY_RISK,
                    "affected_count": sum(e["frequency"] for e in high_freq_entities),
                    "evidence": {
                        "high_frequency_entities": high_freq_entities[:5],  # Top 5
                        "total_high_freq_entities": len(high_freq_entities),
                        "threshold": ENTITY_FREQUENCY_THRESHOLD
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 Entity frequency anomaly detected: {len(high_freq_entities)} high-frequency entities")

        except Exception as e:
            logger.error(f"❌ Error detecting entity frequency: {str(e)}")

        return patterns

    def _detect_bin_attacks(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect BIN attacks (same BIN, multiple cards).

        Strategy: Group by BIN and check for multiple different card numbers
        """
        if len(events) < BIN_ATTACK_MIN_CARDS:
            return []

        patterns = []

        try:
            # Sort events by timestamp for time window analysis
            sorted_events = sorted(
                [e for e in events if self._extract_timestamp(e) and self._extract_card_info(e)],
                key=lambda x: self._extract_timestamp(x)
            )

            if len(sorted_events) < BIN_ATTACK_MIN_CARDS:
                return []

            # Track BIN usage within time window
            for i in range(len(sorted_events) - BIN_ATTACK_MIN_CARDS + 1):
                window_start = self._extract_timestamp(sorted_events[i])
                window_events = []

                for j in range(i, len(sorted_events)):
                    event_ts = self._extract_timestamp(sorted_events[j])
                    time_diff_hours = (event_ts - window_start).total_seconds() / 3600

                    if time_diff_hours <= BIN_ATTACK_TIME_WINDOW_HOURS:
                        window_events.append(sorted_events[j])
                    else:
                        break

                if len(window_events) < BIN_ATTACK_MIN_CARDS:
                    continue

                # Group by BIN
                bin_cards = defaultdict(set)

                for event in window_events:
                    card_info = self._extract_card_info(event)
                    if card_info and "bin" in card_info and "last4" in card_info:
                        bin_num = card_info["bin"]
                        last4 = card_info["last4"]
                        bin_cards[bin_num].add(last4)

                # Detect BIN attack: same BIN with multiple cards
                for bin_num, last4_set in bin_cards.items():
                    if len(last4_set) >= BIN_ATTACK_MIN_CARDS:
                        pattern = {
                            "pattern_type": "bin_attack",
                            "pattern_name": "BIN Attack Detection",
                            "description": "Multiple different cards with same BIN detected",
                            "confidence": min(0.90, 0.70 + (len(last4_set) - BIN_ATTACK_MIN_CARDS) * 0.05),
                            "risk_adjustment": BIN_ATTACK_RISK,
                            "affected_count": len([e for e in window_events if self._extract_card_info(e) and self._extract_card_info(e).get("bin") == bin_num]),
                            "evidence": {
                                "bin": bin_num,
                                "unique_card_count": len(last4_set),
                                "threshold": BIN_ATTACK_MIN_CARDS,
                                "time_window_hours": BIN_ATTACK_TIME_WINDOW_HOURS,
                                "sample_last4": list(last4_set)[:5]
                            }
                        }
                        patterns.append(pattern)
                        logger.info(f"🔴 BIN attack detected: BIN {bin_num} with {len(last4_set)} different cards")
                        break  # Only detect once per dataset

                if patterns:
                    break  # Found BIN attack, stop searching

        except Exception as e:
            logger.error(f"❌ Error detecting BIN attacks: {str(e)}")

        return patterns

    def _detect_merchant_concentration(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect merchant concentration patterns.

        Strategy: High concentration of transactions at specific merchants
        """
        if len(events) < MERCHANT_CONCENTRATION_MIN_TXS:
            return []

        patterns = []

        try:
            # Track merchant frequency
            merchant_counter = Counter()

            for event in events:
                merchant_id = self._extract_merchant_id(event)
                if merchant_id:
                    merchant_counter[merchant_id] += 1

            if not merchant_counter:
                return []

            # Detect high concentration at specific merchants (relaxed threshold)
            total_txs = len(events)
            concentrated_merchants = []

            for merchant_id, count in merchant_counter.items():
                concentration_ratio = count / total_txs

                if concentration_ratio >= MERCHANT_CONCENTRATION_THRESHOLD and count >= MERCHANT_CONCENTRATION_MIN_TXS:
                    # Extract merchant name if available
                    merchant_name = None
                    for event in events:
                        if self._extract_merchant_id(event) == merchant_id:
                            merchant_name = self._extract_merchant_name(event)
                            if merchant_name:
                                break

                    concentrated_merchants.append({
                        "merchant_id": merchant_id,
                        "merchant_name": merchant_name or "Unknown",
                        "transaction_count": count,
                        "concentration_ratio": round(concentration_ratio, 2)
                    })

            # Create pattern if concentration detected
            if concentrated_merchants:
                concentrated_merchants.sort(key=lambda x: x["concentration_ratio"], reverse=True)

                pattern = {
                    "pattern_type": "merchant_concentration",
                    "pattern_name": "Merchant Concentration",
                    "description": "High concentration of transactions at specific merchants",
                    "confidence": min(0.85, 0.60 + concentrated_merchants[0]["concentration_ratio"] * 0.3),
                    "risk_adjustment": MERCHANT_CONCENTRATION_RISK,
                    "affected_count": sum(m["transaction_count"] for m in concentrated_merchants),
                    "evidence": {
                        "concentrated_merchants": concentrated_merchants[:3],  # Top 3
                        "total_merchants": len(merchant_counter),
                        "concentration_threshold": MERCHANT_CONCENTRATION_THRESHOLD
                    }
                }
                patterns.append(pattern)
                logger.info(f"🔴 Merchant concentration detected: {len(concentrated_merchants)} concentrated merchants")

        except Exception as e:
            logger.error(f"❌ Error detecting merchant concentration: {str(e)}")

        return patterns

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

    def _extract_email(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract email from event."""
        email_fields = [
            "EMAIL_ADDRESS",
            "email",
            "user_email",
            "customer_email",
            "billing_email"
        ]

        for field in email_fields:
            if field in event and event[field]:
                return str(event[field]).lower()

        return None

    def _extract_device_id(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract device ID from event."""
        device_fields = [
            "DEVICE_ID",
            "device_id",
            "device_fingerprint",
            "fingerprint_id",
            "user_agent_hash"
        ]

        for field in device_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_ip(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract IP address from event."""
        ip_fields = [
            "IP_ADDRESS",
            "ip_address",
            "ip",
            "client_ip",
            "remote_addr"
        ]

        for field in ip_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_card_info(self, event: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """Extract card BIN and last4 from event."""
        # Try structured card info
        if "card_info" in event and isinstance(event["card_info"], dict):
            card_info = event["card_info"]
            bin_num = card_info.get("bin") or card_info.get("card_bin")
            last4 = card_info.get("last4") or card_info.get("last_four")

            if bin_num and last4:
                return {"bin": str(bin_num), "last4": str(last4)}

        # Try separate BIN and last4 fields
        bin_fields = ["CARD_BIN", "card_bin", "bin", "BIN"]
        last4_fields = ["CARD_LAST4", "card_last4", "last4", "last_four"]

        bin_num, last4 = None, None

        for field in bin_fields:
            if field in event and event[field]:
                bin_num = str(event[field])
                break

        for field in last4_fields:
            if field in event and event[field]:
                last4 = str(event[field])
                break

        if bin_num and last4:
            return {"bin": bin_num, "last4": last4}

        return None

    def _extract_merchant_id(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract merchant ID from event."""
        merchant_fields = [
            "MERCHANT_ID",
            "merchant_id",
            "merchant",
            "store_id",
            "seller_id"
        ]

        for field in merchant_fields:
            if field in event and event[field]:
                return str(event[field])

        return None

    def _extract_merchant_name(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract merchant name from event."""
        name_fields = [
            "MERCHANT_NAME",
            "merchant_name",
            "store_name",
            "seller_name",
            "business_name"
        ]

        for field in name_fields:
            if field in event and event[field]:
                return str(event[field])

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
                "entity_frequency": 0,
                "bin_attack": 0,
                "merchant_concentration": 0
            }
        }

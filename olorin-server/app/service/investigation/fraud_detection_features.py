"""
Fraud detection features WITHOUT using MODEL_SCORE.
These features detect fraud based on behavioral patterns only.

Supports LLM-based reasoning mode via LLM_REASONING_ENABLED env variable.
Feature: 026-llm-training-pipeline
"""

import hashlib
import logging
import os
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.config.threshold_config import get_risk_threshold

logger = logging.getLogger(__name__)


def _is_llm_reasoning_enabled() -> bool:
    """Check if LLM reasoning mode is enabled via environment variable."""
    return os.getenv("LLM_REASONING_ENABLED", "false").lower() == "true"


class FraudDetectionFeatures:
    """
    Calculate fraud risk features without using MODEL_SCORE.
    Focus on velocity, repetition, concentration, and anomaly patterns.
    """

    def __init__(self):
        # CRITICAL FIX: Use configured threshold instead of hardcoded value
        # Previous hardcoded 0.20 caused 99% false positive rate by ignoring config
        self.base_threshold = get_risk_threshold()
        self.progressive_thresholds = {
            "high_volume": self.base_threshold,  # 10+ transactions
            "medium_volume": self.base_threshold * 0.85,  # 5-9 transactions
            "low_volume": self.base_threshold * 0.70,  # 2-4 transactions
        }
        logger.info(
            f"FraudDetectionFeatures initialized with threshold: {self.base_threshold}"
        )
        self.merchant_risk_multipliers = {
            # High-risk merchants (known for fraud)
            "coinflow": 0.85,  # Lower threshold (easier to flag)
            "eneba": 0.85,
            "g2a": 0.85,
            "kinguin": 0.85,
            # Medium-risk merchants
            "steam": 0.95,
            "epic": 0.95,
            # Low-risk merchants (utilities, subscriptions)
            "netflix": 1.15,  # Higher threshold (harder to flag)
            "spotify": 1.15,
            "amazon": 1.10,
            "apple": 1.10,
        }
        
        # Mapping of country codes to currencies for mismatch detection
        self.country_currency_map = {
            "US": "USD", "GB": "GBP", "EU": "EUR", "DE": "EUR", "FR": "EUR",
            "ES": "EUR", "IT": "EUR", "NL": "EUR", "CA": "CAD", "AU": "AUD",
            "JP": "JPY", "CN": "CNY", "IN": "INR", "BR": "BRL", "MX": "MXN",
            "RU": "RUB", "ZA": "ZAR", "CH": "CHF", "SE": "SEK", "NO": "NOK"
        }

    @property
    def risk_threshold(self):
        """Backward compatibility for existing code"""
        return self.base_threshold

    def calculate_transaction_features(
        self, transactions: List[Dict[str, Any]], entity_id: str, window_hours: int = 24, is_merchant_investigation: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive fraud features from transactions.
        
        Args:
            transactions: List of transactions
            entity_id: Entity identifier
            window_hours: Time window for burst detection
            is_merchant_investigation: If True, skip single_merchant concentration penalty

        Args:
            transactions: List of transaction records
            entity_id: Entity being analyzed (email, card, etc.)
            window_hours: Time window for velocity calculations

        Returns:
            Dictionary of calculated features and risk scores
        """
        if not transactions:
            return {
                "risk_score": 0.0,
                "risk_level": "low",
                "features": {},
                "anomalies": [],
            }

        # Sort transactions by time
        sorted_txs = sorted(
            transactions, key=lambda x: x.get("TX_DATETIME", x.get("tx_datetime", ""))
        )

        # Calculate all features
        velocity_features = self._calculate_velocity_features(sorted_txs, window_hours)
        repetition_features = self._calculate_repetition_features(sorted_txs)
        concentration_features = self._calculate_concentration_features(sorted_txs)
        temporal_features = self._calculate_temporal_features(sorted_txs)
        amount_features = self._calculate_amount_features(sorted_txs)
        
        # New Feature Groups
        payment_features = self._calculate_payment_features(sorted_txs)
        geo_features = self._calculate_geo_features(sorted_txs)
        identity_features = self._calculate_identity_features(sorted_txs)

        # Combine all features
        all_features = {
            **velocity_features,
            **repetition_features,
            **concentration_features,
            **temporal_features,
            **amount_features,
            **payment_features,
            **geo_features,
            **identity_features,
            "is_merchant_investigation": 1.0 if is_merchant_investigation else 0.0,  # Pass context
        }

        # Calculate composite risk score WITHOUT MODEL_SCORE
        risk_score = self._calculate_composite_risk_score(all_features, is_merchant_investigation)

        # Detect anomalies
        anomalies = self._detect_anomalies(all_features)

        return {
            "risk_score": risk_score,
            "risk_level": self._get_risk_level(risk_score),
            "features": all_features,
            "anomalies": anomalies,
            "threshold": self.risk_threshold,
            "is_fraud": risk_score >= self.risk_threshold,
        }

    def _calculate_velocity_features(
        self, transactions: List[Dict], window_hours: int
    ) -> Dict[str, float]:
        """Calculate transaction velocity features."""
        features = {}

        if not transactions:
            return features

        # Get timestamps
        timestamps = []
        for tx in transactions:
            tx_time = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if tx_time:
                if isinstance(tx_time, str):
                    timestamps.append(datetime.fromisoformat(tx_time[:19]))
                else:
                    timestamps.append(tx_time)

        if not timestamps:
            return features

        # Overall velocity
        first_time = min(timestamps)
        last_time = max(timestamps)
        time_span_hours = max((last_time - first_time).total_seconds() / 3600, 0.1)

        features["tx_count"] = len(transactions)
        features["tx_per_hour"] = len(transactions) / time_span_hours

        # Burst detection - transactions in short windows
        burst_windows = [1, 3, 6, 12, 24]  # hours
        for window in burst_windows:
            burst_count = self._count_transactions_in_window(timestamps, window)
            features[f"max_tx_in_{window}h"] = burst_count
            features[f"burst_score_{window}h"] = burst_count / max(window, 1)

        # Time between transactions
        if len(timestamps) > 1:
            intervals = [
                (timestamps[i + 1] - timestamps[i]).total_seconds() / 60
                for i in range(len(timestamps) - 1)
            ]
            features["min_interval_minutes"] = min(intervals)
            features["avg_interval_minutes"] = sum(intervals) / len(intervals)

            # Rapid succession flag
            features["rapid_succession"] = 1.0 if min(intervals) < 5 else 0.0

        return features

    def _calculate_repetition_features(
        self, transactions: List[Dict]
    ) -> Dict[str, float]:
        """Calculate repetition and pattern features."""
        features = {}

        if not transactions:
            return features

        # Amount repetition
        amounts = [float(tx.get("AMOUNT", tx.get("amount", 0))) for tx in transactions]
        amount_counts = Counter(amounts)

        features["unique_amounts"] = len(amount_counts)
        features["amount_diversity"] = (
            len(amount_counts) / len(amounts) if amounts else 0
        )

        # Most repeated amount
        if amount_counts:
            most_common_amount, count = amount_counts.most_common(1)[0]
            features["max_repeated_amount_count"] = count
            features["max_repeated_amount_ratio"] = count / len(amounts)
            features["has_repeated_amounts"] = 1.0 if count > 2 else 0.0

        # Merchant repetition
        merchants = [tx.get("MERCHANT", tx.get("merchant", "")) for tx in transactions]
        merchant_counts = Counter(merchants)

        features["unique_merchants"] = len(merchant_counts)
        features["merchant_diversity"] = (
            len(merchant_counts) / len(merchants) if merchants else 0
        )

        if merchant_counts:
            most_common_merchant, count = merchant_counts.most_common(1)[0]
            features["max_merchant_concentration"] = count / len(merchants)
            features["single_merchant"] = 1.0 if len(merchant_counts) == 1 else 0.0

        return features

    def _calculate_concentration_features(
        self, transactions: List[Dict]
    ) -> Dict[str, float]:
        """Calculate concentration features for IPs, devices, etc."""
        features = {}

        if not transactions:
            return features

        # IP concentration
        ips = [
            tx.get("IP", tx.get("ip", ""))
            for tx in transactions
            if tx.get("IP") or tx.get("ip")
        ]
        if ips:
            ip_counts = Counter(ips)
            features["unique_ips"] = len(ip_counts)
            features["ip_diversity"] = len(ip_counts) / len(ips)

            most_common_ip, count = ip_counts.most_common(1)[0]
            features["max_ip_concentration"] = count / len(ips)
            features["single_ip"] = 1.0 if len(ip_counts) == 1 else 0.0
            features["tx_per_ip"] = len(ips) / len(ip_counts)

        # Device concentration
        devices = [
            tx.get("DEVICE_ID", tx.get("device_id", ""))
            for tx in transactions
            if tx.get("DEVICE_ID") or tx.get("device_id")
        ]
        if devices:
            device_counts = Counter(devices)
            features["unique_devices"] = len(device_counts)
            features["device_diversity"] = len(device_counts) / len(devices)

            most_common_device, count = device_counts.most_common(1)[0]
            features["max_device_concentration"] = count / len(devices)
            features["single_device"] = 1.0 if len(device_counts) == 1 else 0.0
            features["tx_per_device"] = len(devices) / len(device_counts)

        # Country concentration
        countries = [
            tx.get("IP_COUNTRY_CODE", tx.get("country", ""))
            for tx in transactions
            if tx.get("IP_COUNTRY_CODE") or tx.get("country")
        ]
        if countries:
            country_counts = Counter(countries)
            features["unique_countries"] = len(country_counts)
            features["international"] = 1.0 if len(country_counts) > 1 else 0.0

        return features

    def _calculate_temporal_features(
        self, transactions: List[Dict]
    ) -> Dict[str, float]:
        """Calculate time-based pattern features."""
        features = {}

        if not transactions:
            return features

        # Extract timestamps
        timestamps = []
        for tx in transactions:
            tx_time = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            if tx_time:
                if isinstance(tx_time, str):
                    timestamps.append(datetime.fromisoformat(tx_time[:19]))
                else:
                    timestamps.append(tx_time)

        if not timestamps:
            return features

        # Time of day analysis
        hours = [ts.hour for ts in timestamps]
        hour_counts = Counter(hours)

        features["unique_hours"] = len(hour_counts)
        features["hour_concentration"] = (
            max(hour_counts.values()) / len(hours) if hours else 0
        )

        # Night time transactions (10 PM - 6 AM)
        night_txs = sum(1 for h in hours if h >= 22 or h < 6)
        features["night_time_ratio"] = night_txs / len(hours) if hours else 0

        # Weekend transactions
        weekend_txs = sum(1 for ts in timestamps if ts.weekday() >= 5)
        features["weekend_ratio"] = weekend_txs / len(timestamps) if timestamps else 0

        # Time span
        if len(timestamps) > 1:
            time_span = max(timestamps) - min(timestamps)
            features["time_span_hours"] = time_span.total_seconds() / 3600
            features["time_span_days"] = time_span.days

            # Check if all in single day
            dates = set(ts.date() for ts in timestamps)
            features["single_day"] = 1.0 if len(dates) == 1 else 0.0

        return features

    def _calculate_amount_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate amount-based features."""
        features = {}

        if not transactions:
            return features

        # CRITICAL: Use GMV for USD-normalized amounts, not PAID_AMOUNT_VALUE_IN_CURRENCY (local currency)
        amounts = [
            float(
                tx.get(
                    "AMOUNT",
                    tx.get("amount", tx.get("GMV", tx.get("gmv", 0))),
                )
            )
            for tx in transactions
        ]

        if not amounts:
            return features

        features["total_amount"] = sum(amounts)
        features["avg_amount"] = sum(amounts) / len(amounts)
        features["max_amount"] = max(amounts)
        features["min_amount"] = min(amounts)

        # Amount variance
        if len(amounts) > 1:
            avg = features["avg_amount"]
            variance = sum((a - avg) ** 2 for a in amounts) / len(amounts)
            features["amount_variance"] = variance
            features["amount_std"] = variance**0.5

            # Coefficient of variation
            features["amount_cv"] = features["amount_std"] / avg if avg > 0 else 0

        # Round number detection
        round_amounts = sum(1 for a in amounts if a == int(a))
        features["round_amount_ratio"] = round_amounts / len(amounts)

        # Small amount flag
        features["small_amounts"] = 1.0 if features["avg_amount"] < 50 else 0.0

        return features
        
    def _calculate_payment_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate payment instrument risk features."""
        features = {}
        if not transactions: return features
        
        # Prepaid Card Risk
        prepaid_count = sum(1 for tx in transactions if str(tx.get("IS_CARD_PREPAID", "")).lower() in ("true", "1", "yes"))
        features["prepaid_ratio"] = prepaid_count / len(transactions)
        
        # AVS Failure
        # Common AVS codes for failure: N (No Match), R (Retry), U (Unavailable), E (Error)
        # Matches: Y (Full), A (Address), Z (Zip), M (International Match)
        avs_failures = 0
        for tx in transactions:
            avs = str(tx.get("AVS_RESULT", "")).upper()
            if avs in ("N", "R", "U", "E"):
                avs_failures += 1
        features["avs_failure_ratio"] = avs_failures / len(transactions)
        
        # Card Type Mix (Debit vs Credit)
        credit_count = sum(1 for tx in transactions if "CREDIT" in str(tx.get("CARD_TYPE", "")).upper())
        features["credit_card_ratio"] = credit_count / len(transactions)
        
        return features

    def _calculate_geo_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate geographic risk features."""
        features = {}
        if not transactions: return features
        
        country_mismatches = 0
        currency_mismatches = 0
        
        for tx in transactions:
            # 1. BIN Country vs IP Country
            bin_country = str(tx.get("BIN_COUNTRY_CODE", "")).upper()
            ip_country = str(tx.get("IP_COUNTRY_CODE", "")).upper()
            
            if bin_country and ip_country and bin_country != ip_country:
                country_mismatches += 1
                
            # 2. Currency vs IP Country
            currency = str(tx.get("PAID_AMOUNT_CURRENCY", "")).upper()
            if currency and ip_country:
                expected_currency = self.country_currency_map.get(ip_country)
                # If we know the expected currency and it doesn't match, or generic EUR mismatch
                if expected_currency and currency != expected_currency:
                    # Allow EUR cross-border within EU (simplified)
                    if not (currency == "EUR" and ip_country in ["DE", "FR", "ES", "IT", "NL", "IE", "BE"]):
                        currency_mismatches += 1
                        
        features["country_mismatch_ratio"] = country_mismatches / len(transactions)
        features["currency_mismatch_ratio"] = currency_mismatches / len(transactions)
        
        return features
        
    def _calculate_identity_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate identity and communication risk features."""
        features = {}
        if not transactions: return features
        
        disposable_email_count = sum(1 for tx in transactions if str(tx.get("IS_DISPOSABLE_EMAIL", "")).lower() in ("true", "1", "yes"))
        features["disposable_email_ratio"] = disposable_email_count / len(transactions)
        
        # High MaxMind Score
        high_risk_score_count = 0
        for tx in transactions:
            try:
                score = float(tx.get("MAXMIND_RISK_SCORE") or 0)
                if score > 20: # Assuming 0-100 scale, >20 is elevated
                    high_risk_score_count += 1
            except: pass
        features["high_external_risk_ratio"] = high_risk_score_count / len(transactions)
        
        return features

    def _count_transactions_in_window(
        self, timestamps: List[datetime], window_hours: int
    ) -> int:
        """Count maximum transactions in any sliding window."""
        if not timestamps or len(timestamps) <= 1:
            return len(timestamps)

        max_count = 0
        window_delta = timedelta(hours=window_hours)

        for i, start_time in enumerate(timestamps):
            end_time = start_time + window_delta
            count = sum(1 for ts in timestamps if start_time <= ts <= end_time)
            max_count = max(max_count, count)

        return max_count

    def _calculate_composite_risk_score(self, features: Dict[str, float], is_merchant_investigation: bool = False) -> float:
        """
        Calculate composite risk score WITHOUT using MODEL_SCORE.
        Based entirely on behavioral patterns.

        CALIBRATED VERSION: More selective scoring to reduce false positives.
        Focus on ANOMALIES, not just volume.

        Supports LLM-based reasoning mode via LLM_REASONING_ENABLED env variable.
        Feature: 026-llm-training-pipeline

        Args:
            features: Calculated features
            is_merchant_investigation: If True, skip single_merchant concentration penalty
        """
        # Check if LLM reasoning mode is enabled
        if _is_llm_reasoning_enabled():
            return self._calculate_llm_risk_score(features, is_merchant_investigation)

        # Original rule-based scoring
        risk_score = 0.0

        # Transaction volume risk (15% weight - REDUCED)
        volume_risk = 0.0
        tx_count = features.get("tx_count", 0)
        if tx_count > 50:
            volume_risk += 1.0  # Extremely high volume
        elif tx_count > 30:
            volume_risk += 0.7
        elif tx_count > 20:
            volume_risk += 0.4
        elif tx_count > 10:
            volume_risk += 0.2
        # Removed low-volume scoring (2-6 transactions is normal)

        # Velocity/burst detection (HIGH RISK SIGNAL)
        if features.get("tx_per_hour", 0) > 5:  # Increased threshold
            volume_risk += 0.6
        if features.get("burst_score_3h", 0) > 5:  # Increased threshold
            volume_risk += 0.7
        if features.get("rapid_succession", 0) > 0:
            volume_risk += 0.5

        risk_score += min(volume_risk, 1.0) * 0.15 

        # Concentration risk (15% weight - REDUCED)
        concentration_risk = 0.0
        # CRITICAL: Skip single_merchant penalty when investigating a merchant entity
        if not is_merchant_investigation:
            if features.get("single_merchant", 0) > 0 and tx_count > 10:
                concentration_risk += 0.4
        if features.get("single_device", 0) > 0 and tx_count > 10:  # Increased from 3
            concentration_risk += 0.3 
        elif features.get("tx_per_device", 0) > 8:  # Increased from 3
            concentration_risk += 0.2

        if features.get("single_ip", 0) > 0 and tx_count > 10:  # Increased from 3
            concentration_risk += 0.2 
        elif features.get("tx_per_ip", 0) > 8:  # Increased from 3
            concentration_risk += 0.15

        # Low diversity is suspicious ONLY with high volume
        if features.get("merchant_diversity", 1) < 0.2 and tx_count > 20:  # Much stricter
            concentration_risk += 0.2

        risk_score += min(concentration_risk, 1.0) * 0.15

        # Repetition risk (20% weight - INCREASED)
        repetition_risk = 0.0
        if features.get("max_repeated_amount_ratio", 0) > 0.7:  # Stricter threshold
            repetition_risk += 0.8
        elif features.get("max_repeated_amount_ratio", 0) > 0.5:
            repetition_risk += 0.5
        
        if features.get("has_repeated_amounts", 0) > 0 and features.get("max_repeated_amount_ratio", 0) > 0.6:
            repetition_risk += 0.4
        
        if features.get("amount_diversity", 1) < 0.2 and tx_count > 10:  # Stricter
            repetition_risk += 0.4
        
        risk_score += min(repetition_risk, 1.0) * 0.20

        # Amount pattern risk (15% weight)
        amount_risk = 0.0
        if features.get("amount_cv", 0) < 0.05 and tx_count > 10:  # Stricter
            amount_risk += 0.7  # Very similar amounts = strong signal
        elif features.get("amount_cv", 0) < 0.1 and tx_count > 5:
            amount_risk += 0.4
        
        if features.get("round_amount_ratio", 0) > 0.9:  # Stricter
            amount_risk += 0.5
        
        if features.get("total_amount", 0) > 1000 and tx_count > 15:  # Stricter thresholds
            amount_risk += 0.3
        
        risk_score += min(amount_risk, 1.0) * 0.15

        # Temporal risk (5% weight)
        temporal_risk = 0.0
        if features.get("single_day", 0) > 0 and tx_count > 10:  # Stricter
            temporal_risk += 0.6
        if features.get("night_time_ratio", 0) > 0.7:  # Stricter
            temporal_risk += 0.5
        if features.get("time_span_hours", 24) < 2 and tx_count > 8:  # Stricter
            temporal_risk += 0.4
        risk_score += min(temporal_risk, 1.0) * 0.05
        
        # Payment & Geo Risk (10% weight - 2024-12-27 FURTHER REDUCED)
        # VERY CONSERVATIVE: These signals have extremely high FP rates
        # Most mismatch signals are common in global/cross-border commerce
        advanced_risk = 0.0

        # Country/Currency Mismatch (Common in global commerce - minimal weight)
        if features.get("country_mismatch_ratio", 0) > 0.5:
            advanced_risk += 0.10  # REDUCED from 0.35 - very common legitimately
        elif features.get("country_mismatch_ratio", 0) > 0.2:
            advanced_risk += 0.05  # REDUCED from 0.15

        if features.get("currency_mismatch_ratio", 0) > 0.5:
            advanced_risk += 0.10  # REDUCED from 0.25

        # Prepaid Cards (Many legitimate use cases - privacy-conscious users)
        if features.get("prepaid_ratio", 0) > 0.8:
            advanced_risk += 0.05  # REDUCED from 0.20 - gift cards are normal
        elif features.get("prepaid_ratio", 0) > 0.4:
            advanced_risk += 0.03  # REDUCED from 0.10

        # AVS Failures (Unreliable internationally - minimal weight)
        if features.get("avs_failure_ratio", 0) > 0.3:
            advanced_risk += 0.05  # REDUCED from 0.25 - many int'l false positives

        # Disposable Emails (Stronger signal, keep moderate weight)
        if features.get("disposable_email_ratio", 0) > 0.2:
            advanced_risk += 0.15  # REDUCED from 0.30 but still meaningful

        # External Risk Scores (Validation signal)
        if features.get("high_external_risk_ratio", 0) > 0.2:
            advanced_risk += 0.10  # REDUCED from 0.25

        # Cap advanced_risk component and reduce weight
        risk_score += min(advanced_risk, 0.40) * 0.10  # REDUCED from 0.80 * 0.20

        # Ensure score is between 0 and 1
        return min(max(risk_score, 0.0), 1.0)

    def _calculate_llm_risk_score(
        self, features: Dict[str, float], is_merchant_investigation: bool = False
    ) -> float:
        """
        Calculate risk score using LLM reasoning.
        Feature: 026-llm-training-pipeline

        This method uses the LLM reasoning engine to analyze features
        and produce a risk score with explanatory reasoning.

        Args:
            features: Calculated features
            is_merchant_investigation: If True, indicates merchant investigation

        Returns:
            Risk score between 0.0 and 1.0
        """
        import asyncio

        try:
            from app.service.training import get_reasoning_engine

            engine = get_reasoning_engine()

            # Build feature dict for LLM analysis
            llm_features = {
                "total_transactions": int(features.get("tx_count", 0)),
                "total_gmv": features.get("total_amount", 0),
                "tx_per_day_avg": features.get("tx_per_hour", 0) * 24,
                "tx_per_day_max": features.get("max_tx_in_24h", 0),
                "fraud_ratio": features.get("fraud_ratio", 0),
                "ip_count": int(features.get("unique_ips", 0)),
                "device_count": int(features.get("unique_devices", 0)),
                "country_count": int(features.get("unique_countries", 0)),
                "frequency_anomaly_score": features.get("burst_score_3h", 0),
                "geo_dispersion_score": features.get("geo_dispersion", 0),
                "is_merchant_investigation": is_merchant_investigation,
            }

            # Run async analysis - handle both sync and async contexts
            try:
                # Check if there's already a running event loop
                loop = asyncio.get_running_loop()
                # If we're already in an async context, use create_task
                # Note: We can't await here since we're in a sync function
                # So we'll use run_coroutine_threadsafe or nest_asyncio
                logger.warning(
                    "⚠️ Detected running event loop - LLM analysis requires sync context"
                )
                # Fall back to rule-based scoring in async context
                return self._fallback_rule_based_score(features, is_merchant_investigation)
            except RuntimeError:
                # No running loop - we can create our own
                loop = asyncio.new_event_loop()
                try:
                    assessment = loop.run_until_complete(
                        engine.analyze_entity(
                            entity_type="email",
                            entity_value="analysis",
                            features=llm_features,
                            merchant_name=None,
                        )
                    )
                finally:
                    loop.close()

            if assessment.error:
                logger.warning(f"LLM analysis failed: {assessment.error}")
                return self._fallback_rule_based_score(features, is_merchant_investigation)

            logger.debug(
                f"LLM risk score: {assessment.risk_score:.3f} "
                f"(confidence: {assessment.confidence:.2f})"
            )
            return assessment.risk_score

        except ImportError as e:
            logger.warning(f"Training module not available: {e}")
            return self._fallback_rule_based_score(features, is_merchant_investigation)
        except Exception as e:
            logger.error(f"LLM risk score calculation failed: {e}")
            return self._fallback_rule_based_score(features, is_merchant_investigation)

    def _fallback_rule_based_score(
        self, features: Dict[str, float], is_merchant_investigation: bool
    ) -> float:
        """Fallback to rule-based scoring when LLM fails."""
        # Simplified rule-based score for fallback
        risk = 0.0
        tx_count = features.get("tx_count", 0)
        if tx_count > 30:
            risk += 0.3
        if features.get("burst_score_3h", 0) > 3:
            risk += 0.2
        if features.get("max_repeated_amount_ratio", 0) > 0.5:
            risk += 0.2
        if features.get("country_mismatch_ratio", 0) > 0.3:
            risk += 0.3
        return min(risk, 1.0)

    def _detect_anomalies(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Detect specific anomaly patterns."""
        anomalies = []

        # Burst pattern
        if features.get("burst_score_3h", 0) > 3:
            anomalies.append(
                {
                    "type": "burst_pattern",
                    "severity": "high",
                    "description": f"{features.get('max_tx_in_3h', 0)} transactions in 3 hours",
                    "risk_contribution": 0.15,
                }
            )

        # Repeated amounts
        if features.get("max_repeated_amount_ratio", 0) > 0.5:
            anomalies.append(
                {
                    "type": "repeated_amounts",
                    "severity": "high",
                    "description": f"{features.get('max_repeated_amount_count', 0)} identical amounts",
                    "risk_contribution": 0.10,
                }
            )

        # Single source concentration
        if (
            features.get("single_ip", 0) > 0
            and features.get("single_device", 0) > 0
            and features.get("tx_count", 0) > 5
        ):
            anomalies.append(
                {
                    "type": "single_source",
                    "severity": "high",
                    "description": "All transactions from single IP/device",
                    "risk_contribution": 0.15,
                }
            )
            
        # Geo Mismatch
        if features.get("country_mismatch_ratio", 0) > 0.3:
            anomalies.append({
                "type": "geo_mismatch",
                "severity": "critical",
                "description": f"{features.get('country_mismatch_ratio', 0)*100:.1f}% transactions have BIN/IP country mismatch",
                "risk_contribution": 0.20
            })
            
        # Prepaid Card Concentration
        if features.get("prepaid_ratio", 0) > 0.5:
            anomalies.append({
                "type": "prepaid_concentration",
                "severity": "high",
                "description": f"{features.get('prepaid_ratio', 0)*100:.1f}% transactions use prepaid cards",
                "risk_contribution": 0.15
            })

        # Rapid succession
        if features.get("min_interval_minutes", float("inf")) < 5:
            anomalies.append(
                {
                    "type": "rapid_succession",
                    "severity": "medium",
                    "description": f"Transactions {features.get('min_interval_minutes', 0):.1f} minutes apart",
                    "risk_contribution": 0.08,
                }
            )

        return anomalies

    def _get_risk_level(self, risk_score: float) -> str:
        """Categorize risk level."""
        if risk_score >= 0.7:
            return "critical"
        elif risk_score >= 0.5:
            return "high"
        elif risk_score >= self.risk_threshold:
            return "medium"
        elif risk_score >= 0.2:
            return "low"
        else:
            return "minimal"

    def calculate_per_transaction_risk(
        self, transaction: Dict[str, Any], historical_transactions: List[Dict[str, Any]], is_merchant_investigation: bool = False
    ) -> float:
        """
        Calculate risk score for a single transaction based on historical context.
        Does NOT use MODEL_SCORE.
        
        MERCHANT INVESTIGATION MODE:
        When investigating a merchant, use OUTLIER DETECTION instead of pattern matching.
        Compare each transaction against the merchant's baseline to find anomalies.
        
        Args:
            transaction: Transaction to score
            historical_transactions: All merchant transactions (for merchant investigations)
            is_merchant_investigation: If True, use outlier detection scoring
        """
        # DEBUG: Log first call
        if not hasattr(self, '_per_tx_risk_logged'):
            logger.info(f"[PER_TX_RISK] Called with is_merchant_investigation={is_merchant_investigation}, "
                       f"historical_txs={len(historical_transactions)}")
            self._per_tx_risk_logged = True
        
        if not historical_transactions:
            logger.warning(f"[PER_TX_RISK] No historical transactions, returning 0.0")
            return 0.0
        
        # MERCHANT INVESTIGATION: Use enhanced outlier-based scoring
        if is_merchant_investigation:
            if not hasattr(self, '_merchant_mode_logged'):
                logger.info("[MERCHANT_MODE] Using enhanced outlier detection for merchant investigation")
                self._merchant_mode_logged = True
            return self._calculate_merchant_transaction_outlier_score(
                transaction, historical_transactions
            )

        # ENTITY INVESTIGATION (email/IP/device): Use pattern-based scoring
        # Get recent transactions (last 24 hours before this transaction)
        tx_time = transaction.get("TX_DATETIME") or transaction.get("tx_datetime")
        if not tx_time:
            return 0.0

        if isinstance(tx_time, str):
            tx_datetime = datetime.fromisoformat(tx_time[:19])
        else:
            tx_datetime = tx_time

        window_start = tx_datetime - timedelta(hours=24)

        recent_txs = []
        for htx in historical_transactions:
            htx_time = htx.get("TX_DATETIME") or htx.get("tx_datetime")
            if htx_time:
                if isinstance(htx_time, str):
                    htx_datetime = datetime.fromisoformat(htx_time[:19])
                else:
                    htx_datetime = htx_time

                if window_start <= htx_datetime <= tx_datetime:
                    recent_txs.append(htx)

        # Include current transaction
        recent_txs.append(transaction)

        # Calculate features for this window
        window_features = self.calculate_transaction_features(recent_txs, "", 24, is_merchant_investigation)

        return window_features["risk_score"]
    
    def _calculate_merchant_transaction_outlier_score(
        self, transaction: Dict[str, Any], all_merchant_transactions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate outlier score for a transaction within a merchant's baseline.
        
        IMPROVED BALANCED APPROACH:
        - Lower thresholds to catch more subtle fraud
        - Merchant-specific adjustments for known patterns
        - Graduated scoring for proportional risk
        
        Returns score 0.0-1.0 where 1.0 = highly anomalous
        """
        import statistics
        
        # Extract transaction amount
        # CRITICAL: Use GMV for USD-normalized amounts, not PAID_AMOUNT_VALUE_IN_CURRENCY (local currency)
        tx_amount = transaction.get("GMV") or transaction.get("gmv") or 0
        tx_id = transaction.get("TX_ID_KEY") or transaction.get("tx_id_key") or "unknown"
        merchant = transaction.get("MERCHANT_NAME") or transaction.get("merchant_name") or "unknown"

        if tx_amount == 0:
            # Check other risk signals even if amount is 0
            base_score = 0.0
        else:
            # Get all amounts for baseline
            amounts = []
            for tx in all_merchant_transactions:
                amt = tx.get("GMV") or tx.get("gmv")
                if amt and amt > 0:
                    amounts.append(float(amt))
            
            if len(amounts) < 10:
                base_score = 0.0  # Not enough data for baseline
            else:
                # Calculate robust statistics using IQR method
                amounts_sorted = sorted(amounts)
                n = len(amounts_sorted)
                
                q1 = amounts_sorted[n // 4]
                q2 = amounts_sorted[n // 2]  # median
                q3 = amounts_sorted[3 * n // 4]
                iqr = q3 - q1
                
                mean_amount = statistics.mean(amounts)
                stdev_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0
                
                # DUAL METHOD: Use both IQR and Z-score for robust detection
                # RECALIBRATED: Raised thresholds for crypto/fintech where large txs are normal

                # Method 1: IQR-based outlier detection (CONSERVATIVE for e-commerce)
                iqr_score = 0.0
                if iqr > 0:
                    # Raised multipliers - large transactions are normal in crypto
                    extreme_upper = q3 + 5.0 * iqr  # Raised from 3.0
                    extreme_lower = q1 - 5.0 * iqr
                    upper_fence = q3 + 3.0 * iqr    # Raised from 1.5
                    lower_fence = q1 - 3.0 * iqr
                    moderate_upper = q3 + 2.0 * iqr  # NEW intermediate level
                    moderate_lower = q1 - 2.0 * iqr

                    if tx_amount > extreme_upper or tx_amount < extreme_lower:
                        iqr_score = 0.70  # CAPPED at 0.70 (was 1.0) - outlier alone isn't fraud
                    elif tx_amount > upper_fence or tx_amount < lower_fence:
                        iqr_score = 0.45  # Reduced from 0.6
                    elif tx_amount > moderate_upper or tx_amount < moderate_lower:
                        iqr_score = 0.25  # Reduced
                    # Removed mild outlier detection (too noisy)

                # Method 2: Z-score based detection (CONSERVATIVE for non-normal distributions)
                z_score_value = 0.0
                z_based_score = 0.0
                if stdev_amount > 0:
                    z_score_value = abs((tx_amount - mean_amount) / stdev_amount)

                    # CONSERVATIVE: Raised thresholds - crypto/fintech data is skewed
                    if z_score_value > 4.5:  # Very extreme
                        z_based_score = 0.70  # CAPPED at 0.70 (was 1.0)
                    elif z_score_value > 4.0:  # 99.99%
                        z_based_score = 0.55
                    elif z_score_value > 3.5:  # 99.95%
                        z_based_score = 0.40
                    elif z_score_value > 3.0:  # 99.7%
                        z_based_score = 0.30  # Reduced from 1.0!
                    elif z_score_value > 2.5:  # 98.8%
                        z_based_score = 0.20  # Reduced from 0.7
                    elif z_score_value > 2.0:  # 97.7%
                        z_based_score = 0.10  # Reduced from 0.5
                    # Removed z < 2.0 scoring (too noisy)

                # Combine both methods (take maximum for sensitivity)
                # CAPPED: base_score can never exceed 0.70 from outlier detection alone
                base_score = min(max(iqr_score, z_based_score), 0.70)
        
        # --- ENHANCED SIGNAL INTEGRATION ---
        # Add risk from new feature categories (Payment, Geo, Identity)
        # V3 RECALIBRATION: Very conservative - most signals have high FP rates

        additional_risk = 0.0

        # 1. Geo Mismatch - ONLY count if strong mismatch (not just different countries)
        bin_country = str(transaction.get("BIN_COUNTRY_CODE", "")).upper()
        ip_country = str(transaction.get("IP_COUNTRY_CODE", "")).upper()
        # Only penalize if BOTH are known and different - single missing is normal
        if bin_country and ip_country and len(bin_country) == 2 and len(ip_country) == 2:
            if bin_country != ip_country:
                additional_risk += 0.08  # Reduced from 0.15 - very common legitimately

        # 2. Prepaid Card - Common legitimate use, minimal signal
        if str(transaction.get("IS_CARD_PREPAID", "")).lower() in ("true", "1", "yes"):
            additional_risk += 0.05  # Reduced from 0.10 - privacy-conscious users

        # 3. AVS Failure - Very unreliable internationally, minimal weight
        avs = str(transaction.get("AVS_RESULT", "")).upper()
        if avs in ("N", "R", "U", "E"):
            additional_risk += 0.05  # Reduced from 0.12 - too noisy

        # 4. Disposable Email - Strongest signal, keep moderate weight
        if str(transaction.get("IS_DISPOSABLE_EMAIL", "")).lower() in ("true", "1", "yes"):
            additional_risk += 0.15  # Reduced from 0.20

        # 5. High External Score (MaxMind) - Only trust very high scores
        try:
            ext_score = float(transaction.get("MAXMIND_RISK_SCORE") or 0)
            if ext_score > 70: additional_risk += 0.10  # Only very high (raised from 50)
            elif ext_score > 50: additional_risk += 0.05  # Raised threshold
        except: pass

        # Cap additional_risk AGGRESSIVELY to prevent accumulation
        additional_risk = min(additional_risk, 0.25)  # Reduced from 0.40

        # Combine Amount Score + Additional Risk using geometric mean (more conservative)
        # Geometric mean requires BOTH signals to be high to produce high score
        if base_score > 0 and additional_risk > 0:
            final_score = (base_score * (base_score + additional_risk)) ** 0.5
        else:
            final_score = base_score * 0.9  # Slight penalty for no additional signals

        # HARD CAP: No transaction score can exceed 0.85 without LLM confirmation
        # This ensures the 0.80 threshold has meaning
        final_score = min(final_score, 0.85)

        # MERCHANT-SPECIFIC ADJUSTMENTS - DISABLED for now (too aggressive)
        # These were causing score inflation
        # merchant_lower = merchant.lower()
        # from app.service.investigation.merchant_fraud_profiles import get_merchant_profiles
        # (merchant adjustments removed)

        # Log outliers
        if final_score > 0.5:
             if not hasattr(self, '_logged_outlier_count'):
                self._logged_outlier_count = 0
             if self._logged_outlier_count < 10:
                logger.info(
                    f"[ENHANCED_RISK] TX {tx_id}: Base(Amount)={base_score:.2f}, "
                    f"Addl(Signals)={additional_risk:.2f}, "
                    f"Final={final_score:.2f} "
                    f"[Signals: GeoMismatch={'YES' if bin_country and ip_country and bin_country!=ip_country else 'NO'}, "
                    f"Prepaid={'YES' if str(transaction.get('IS_CARD_PREPAID','')).lower() in ('true','1') else 'NO'}]"
                )
                self._logged_outlier_count += 1
        
        return final_score
    
    def _get_tx_datetime(self, tx: Dict[str, Any]) -> Optional[datetime]:
        """Helper to extract and parse transaction datetime."""
        tx_time = tx.get("TX_DATETIME") or tx.get("tx_datetime")
        if not tx_time:
            return None
        
        if isinstance(tx_time, str):
            try:
                return datetime.fromisoformat(tx_time[:19])
            except:
                return None
        return tx_time

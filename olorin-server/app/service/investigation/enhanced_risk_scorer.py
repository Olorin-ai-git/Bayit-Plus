"""
Enhanced risk scorer that uses behavioral features instead of MODEL_SCORE.
This integrates with the existing investigation system.
Includes merchant-specific fraud profiles based on empirical analysis.
"""

import logging
import os
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from collections import Counter

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.service.investigation.fraud_detection_features import FraudDetectionFeatures
from app.service.investigation.merchant_fraud_profiles import get_merchant_profiles

logger = logging.getLogger(__name__)


class EnhancedRiskScorer:
    """
    Enhanced risk scoring that doesn't use MODEL_SCORE.
    Replaces the existing risk calculation with behavioral pattern analysis.
    Includes progressive thresholds and merchant-specific adjustments.
    
    NEW: Merchant-specific fraud profiles (Eneba, Atlantis Games, Coinflow, Paybis)
    NEW: Isolation Forest for unsupervised anomaly detection.
    NEW: Benford's Law analysis for synthetic data detection.
    """

    def __init__(self):
        self.feature_calculator = FraudDetectionFeatures()
        self.merchant_profiles = get_merchant_profiles()
        self.base_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.20"))

        # Progressive thresholds based on transaction volume
        self.progressive_thresholds = {
            "high_volume": self.base_threshold,  # 10+ transactions
            "medium_volume": self.base_threshold * 0.85,  # 5-9 transactions  (0.17)
            "low_volume": self.base_threshold * 0.70,  # 2-4 transactions (0.14)
        }

        # Merchant-specific risk multipliers
        self.merchant_risk_multipliers = (
            self.feature_calculator.merchant_risk_multipliers
        )

        logger.info(f"🎯 Enhanced Risk Scorer initialized")
        logger.info(f"   Base threshold: {self.base_threshold}")
        logger.info(f"   Progressive thresholds: {self.progressive_thresholds}")

    @property
    def risk_threshold(self):
        """Backward compatibility"""
        return self.base_threshold

    def _get_progressive_threshold(
        self, tx_count: int, merchant_name: str = None
    ) -> Tuple[float, str]:
        """
        Get adaptive threshold based on transaction volume and merchant.

        Returns:
            Tuple of (threshold, adjustment_reason)
        """
        # Determine base threshold by volume
        if tx_count >= 10:
            threshold = self.progressive_thresholds["high_volume"]
            reason = f"high_volume ({tx_count} tx)"
        elif tx_count >= 5:
            threshold = self.progressive_thresholds["medium_volume"]
            reason = f"medium_volume ({tx_count} tx)"
        else:
            threshold = self.progressive_thresholds["low_volume"]
            reason = f"low_volume ({tx_count} tx)"

        # Apply merchant-specific multiplier
        if merchant_name:
            merchant_lower = merchant_name.lower()
            for merchant_key, multiplier in self.merchant_risk_multipliers.items():
                if merchant_key in merchant_lower:
                    original_threshold = threshold
                    threshold = threshold * multiplier
                    if multiplier < 1.0:
                        reason = (
                            f"high_risk_merchant ({merchant_name}, {threshold:.2f})"
                        )
                    else:
                        reason = f"low_risk_merchant ({merchant_name}, {threshold:.2f})"
                    logger.debug(
                        f"   Merchant adjustment: {merchant_name} → {original_threshold:.2f} * {multiplier} = {threshold:.2f}"
                    )
                    break

        # Ensure threshold stays reasonable
        threshold = max(0.10, min(threshold, 0.30))
        return threshold, reason

    def _train_isolation_forest(self, transactions: List[Dict[str, Any]]) -> Tuple[Optional[IsolationForest], Optional[StandardScaler], List[List[float]]]:
        """
        Train Isolation Forest model on transaction features.
        Returns trained model, scaler, and feature matrix.
        """
        if len(transactions) < 20: # Need sufficient data for IF
            return None, None, []
            
        features = []
        for tx in transactions:
            # Extract numerical features for anomaly detection
            amount = float(tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or tx.get("amount") or 0)
            
            # Time features
            tx_time = tx.get("TX_DATETIME") or tx.get("tx_datetime")
            hour = 0
            weekday = 0
            if tx_time:
                try:
                    if isinstance(tx_time, str):
                        dt = datetime.fromisoformat(tx_time[:19])
                    else:
                        dt = tx_time
                    hour = dt.hour
                    weekday = dt.weekday()
                except: pass
                
            # Boolean/Categorical features as numeric
            is_prepaid = 1.0 if str(tx.get("IS_CARD_PREPAID", "")).lower() in ("true", "1") else 0.0
            is_international = 1.0 if str(tx.get("BIN_COUNTRY_CODE", "")) != str(tx.get("IP_COUNTRY_CODE", "")) else 0.0
            
            # Feature vector: [Amount, Hour, Weekday, IsPrepaid, IsInternational]
            features.append([amount, hour, weekday, is_prepaid, is_international])
            
        if not features:
            return None, None, []
            
        X = np.array(features)
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train Isolation Forest
        # contamination='auto' lets algorithm determine outlier proportion
        clf = IsolationForest(random_state=42, contamination=0.05, n_estimators=100)
        clf.fit(X_scaled)
        
        return clf, scaler, features

    def _score_isolation_forest(self, clf: IsolationForest, scaler: StandardScaler, feature_vector: List[float]) -> float:
        """
        Score a single transaction using trained Isolation Forest.
        Returns anomaly score 0.0 (normal) to 1.0 (highly anomalous).
        """
        if not clf or not scaler:
            return 0.0
            
        # Scale input
        X_new = scaler.transform([feature_vector])
        
        # decision_function returns anomaly score. Lower is more anomalous.
        # Range is roughly -0.5 to 0.5. Negative is outlier.
        raw_score = clf.decision_function(X_new)[0]
        
        # Normalize to 0.0-1.0 probability of anomaly
        # Typically negative scores are anomalies. 
        # Map: 0.5 (very normal) -> 0.0 risk
        #      0.0 (borderline) -> 0.5 risk
        #     -0.5 (very anomalous) -> 1.0 risk
        
        prob_score = 0.5 - raw_score
        return max(0.0, min(prob_score, 1.0))

    def _check_benfords_law(self, transactions: List[Dict[str, Any]]) -> float:
        """
        Check if transaction amounts violate Benford's Law.
        Returns risk score 0.0 (natural) to 1.0 (highly artificial).
        """
        if len(transactions) < 50: # Need sufficient sample size
            return 0.0
            
        amounts = [float(tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or tx.get("amount") or 0) for tx in transactions]
        # Skip if too few unique amounts (likely fixed pricing model, e.g. subscriptions)
        unique_amounts = len(set(amounts))
        if unique_amounts < 10:
            logger.info(f"ℹ️ Benford's Law skipped: Only {unique_amounts} unique amounts (likely fixed pricing)")
            return 0.0

        first_digits = []
        for amt in amounts:
            if amt > 0:
                first_digit = int(str(amt).replace('.', '').lstrip('0')[0])
                first_digits.append(first_digit)
                
        if not first_digits:
            return 0.0
            
        counts = Counter(first_digits)
        total = len(first_digits)
        
        # Benford's Law probabilities for digits 1-9
        benford_probs = {
            1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097, 
            5: 0.079, 6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046
        }
        
        chi_square = 0.0
        for d in range(1, 10):
            observed = counts.get(d, 0)
            expected = total * benford_probs[d]
            chi_square += ((observed - expected) ** 2) / expected
            
        # Critical value for 8 degrees of freedom at p=0.01 is ~20.09
        # Normalize score: <15 is normal(0), >25 is high risk(1.0)
        risk = max(0.0, min((chi_square - 15) / 10, 1.0))
        
        if risk > 0.5:
            logger.info(f"🚨 Benford's Law Violation Detected! Score: {risk:.2f} (Chi2: {chi_square:.2f})")
            
        return risk

    def calculate_entity_risk(
        self,
        transactions: List[Dict[str, Any]],
        entity_id: str,
        entity_type: str = "email",
        is_merchant_investigation: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculate overall risk for an entity based on all transactions.
        Includes progressive thresholds, merchant adjustments, and whitelist checking.
        
        Now includes ML-based anomaly detection (Isolation Forest) and Benford's Law.

        Args:
            transactions: List of transaction records
            entity_id: Entity identifier (email, card, etc.)
            entity_type: Type of entity

        Returns:
            Risk assessment with score, features, and per-transaction scores
        """
        if not transactions:
            logger.warning(f"No transactions provided for entity {entity_id}")
            return {
                "entity_id": entity_id,
                "entity_type": entity_type,
                "overall_risk_score": 0.0,
                "risk_level": "minimal",
                "transaction_count": 0,
                "transaction_scores": {},
                "features": {},
                "anomalies": [],
                "risk_threshold": self.base_threshold,
                "threshold_adjustment": "none",
            }

        # CRITICAL: Detect if this is a merchant investigation
        if not is_merchant_investigation:  # Only auto-detect if not explicitly set
            is_merchant_investigation = entity_type.lower() in ["merchant", "merchant_name"]
        
        logger.info(
            f"📊 Calculating enhanced risk for {entity_type}:{entity_id} with {len(transactions)} transactions "
            f"(is_merchant_investigation={is_merchant_investigation})"
        )

        # Calculate overall features (Heuristic)
        overall_assessment = self.feature_calculator.calculate_transaction_features(
            transactions, entity_id, window_hours=24, is_merchant_investigation=is_merchant_investigation
        )

        # Get most common merchant
        merchants = [
            tx.get("MERCHANT") or tx.get("MERCHANT_NAME")
            for tx in transactions
            if tx.get("MERCHANT") or tx.get("MERCHANT_NAME")
        ]
        merchant_counts = Counter(merchants)
        primary_merchant = merchant_counts.most_common(1)[0][0] if merchant_counts else None

        # Get progressive threshold
        tx_count = len(transactions)
        adaptive_threshold, threshold_reason = self._get_progressive_threshold(
            tx_count, primary_merchant
        )
        
        # Apply merchant-specific threshold adjustment
        if primary_merchant:
            merchant_adjustment = self.merchant_profiles.get_threshold_adjustment(primary_merchant)
            if merchant_adjustment != 1.0:
                original_threshold = adaptive_threshold
                adaptive_threshold = adaptive_threshold * merchant_adjustment
                logger.info(
                    f"   🎯 Merchant threshold adjustment for {primary_merchant}: "
                    f"{original_threshold:.3f} → {adaptive_threshold:.3f} (×{merchant_adjustment})"
                )

        # Train Isolation Forest (ML Model)
        clf, scaler, feature_vectors = self._train_isolation_forest(transactions)
        if clf:
            logger.info(f"🤖 Isolation Forest trained on {len(transactions)} transactions")
            
        # Check Benford's Law (Statistical Model)
        benford_risk = self._check_benfords_law(transactions)

        # Calculate per-transaction scores
        transaction_scores = {}
        high_risk_count = 0

        for i, tx in enumerate(transactions):
            tx_id = (
                tx.get("TX_ID_KEY")
                or tx.get("tx_id_key")
                or tx.get("TX_ID")
                or tx.get("tx_id")
                or str(hash(str(tx)))
            )

            # 1. Heuristic Score (Rule-based)
            heuristic_risk = self.feature_calculator.calculate_per_transaction_risk(
                tx, transactions, is_merchant_investigation=is_merchant_investigation
            )
            
            # 2. ML Score (Isolation Forest)
            ml_risk = 0.0
            if clf and i < len(feature_vectors):
                ml_risk = self._score_isolation_forest(clf, scaler, feature_vectors[i])
                
            # 3. Combine Scores (Weighted Average)
            # ML provides anomaly detection, Heuristics provide expert knowledge
            if clf:
                # If ML is available, give it 40% weight
                combined_risk = (heuristic_risk * 0.6) + (ml_risk * 0.4)
                
                # Boost if both agree (both high)
                if heuristic_risk > 0.5 and ml_risk > 0.5:
                    combined_risk += 0.1
            else:
                combined_risk = heuristic_risk
                
            # 4. Add Entity-Level Risk (Benford's Law)
            if benford_risk > 0.5:
                combined_risk = min(combined_risk + 0.1, 1.0)
            
            # Apply merchant-specific adjustments (Legacy)
            if primary_merchant:
                adjusted_risk = self.merchant_profiles.apply_merchant_adjustments(
                    combined_risk, tx, transactions, primary_merchant
                )
                combined_risk = adjusted_risk

            transaction_scores[tx_id] = combined_risk

            if combined_risk >= adaptive_threshold:
                high_risk_count += 1

        # Log score distribution for debugging
        if transaction_scores:
            scores_list = list(transaction_scores.values())
            scores_list.sort()
            avg_score = sum(scores_list) / len(scores_list)
            min_score = min(scores_list)
            max_score = max(scores_list)
            median_score = scores_list[len(scores_list) // 2]
            
            logger.info(
                f"📊 SCORE DISTRIBUTION: min={min_score:.3f}, median={median_score:.3f}, "
                f"avg={avg_score:.3f}, max={max_score:.3f}"
            )
            
        # Determine overall risk score
        risk_score = overall_assessment["risk_score"]
        
        # Boost overall risk if Benford's Law violated
        if benford_risk > 0.5:
            # Don't override completely, just boost significantly
            risk_score = min(risk_score + 0.3, 1.0)
            overall_assessment["anomalies"].append({
                "type": "statistical_anomaly",
                "description": f"Benford's Law violation (Score: {benford_risk:.2f}) - potential synthetic data",
                "severity": "high"
            })

        is_fraud = risk_score >= adaptive_threshold
        
        # Prepare response
        result = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "overall_risk_score": risk_score,
            "risk_level": overall_assessment["risk_level"],
            "transaction_count": tx_count,
            "high_risk_transaction_count": high_risk_count,
            "transaction_scores": transaction_scores,
            "features": overall_assessment["features"],
            "anomalies": overall_assessment["anomalies"],
            "risk_threshold": adaptive_threshold,
            "is_fraud": is_fraud,
            "primary_merchant": primary_merchant,
        }

        return result

    def _is_borderline_fraud(
        self, features: Dict[str, float], anomalies: List[Dict]
    ) -> bool:
        """
        Apply strict rules for borderline cases (scores just below threshold).
        """
        # High transaction count with any concentration
        if features.get("tx_count", 0) > 8:
            if (
                features.get("single_merchant", 0) > 0
                or features.get("single_device", 0) > 0
                or features.get("single_ip", 0) > 0
            ):
                return True

        # Multiple anomalies detected
        if len(anomalies) >= 3:
            return True

        # Very high burst score
        if features.get("burst_score_3h", 0) > 4:
            return True

        return False

    def _is_whitelisted_pattern(
        self, features: Dict[str, float], primary_merchant: str = None
    ) -> bool:
        """
        Check if this matches a known legitimate pattern (reduce false positives).
        """
        tx_count = features.get("tx_count", 0)

        # Single transaction - very unlikely to be fraud
        if tx_count == 1:
            return True
            
        return False

    def _log_feature_importance(self, features: Dict[str, float]):
        """Log the most important features contributing to risk."""
        # Key risk indicators
        risk_indicators = [
            ("tx_per_hour", "Velocity"),
            ("burst_score_3h", "Burst Pattern"),
            ("max_repeated_amount_ratio", "Repeated Amounts"),
            ("single_ip", "Single IP"),
            ("country_mismatch_ratio", "Geo Mismatch"),
            ("prepaid_ratio", "Prepaid Cards"),
        ]

        logger.debug("📈 Key Risk Indicators:")
        for feature_name, label in risk_indicators:
            if feature_name in features:
                value = features[feature_name]
                if value > 0:
                    logger.debug(f"   {label}: {value:.3f}")

    def enhance_investigation_results(
        self, investigation_results: Dict[str, Any], transactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Enhance existing investigation results with behavioral risk scores.

        Args:
            investigation_results: Original investigation results
            transactions: Transaction data

        Returns:
            Enhanced investigation results
        """
        entity_id = investigation_results.get("entity_id", "")
        entity_type = investigation_results.get("entity_type", "email")

        # Calculate enhanced risk
        risk_assessment = self.calculate_entity_risk(
            transactions, entity_id, entity_type
        )

        # Merge with original results
        enhanced_results = {**investigation_results}

        # Replace or add risk scores
        enhanced_results["enhanced_risk_score"] = risk_assessment["overall_risk_score"]
        enhanced_results["behavioral_risk_level"] = risk_assessment["risk_level"]
        enhanced_results["behavioral_features"] = risk_assessment["features"]
        enhanced_results["detected_anomalies"] = risk_assessment["anomalies"]

        # Update transaction scores
        if "transaction_scores" not in enhanced_results:
            enhanced_results["transaction_scores"] = {}

        enhanced_results["transaction_scores"].update(
            risk_assessment["transaction_scores"]
        )

        # Update overall risk if enhanced score is higher
        original_risk = enhanced_results.get("overall_risk_score", 0)
        if risk_assessment["overall_risk_score"] > original_risk:
            enhanced_results["overall_risk_score"] = risk_assessment[
                "overall_risk_score"
            ]
            logger.info(
                f"🔄 Risk score updated: {original_risk:.3f} → {risk_assessment['overall_risk_score']:.3f}"
            )

        return enhanced_results

    def should_flag_as_fraud(self, risk_score: float) -> bool:
        """
        Determine if a risk score indicates fraud.

        Args:
            risk_score: Calculated risk score

        Returns:
            True if should be flagged as fraud
        """
        return risk_score >= self.risk_threshold

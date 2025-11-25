"""
Enhanced risk scorer that uses behavioral features instead of MODEL_SCORE.
This integrates with the existing investigation system.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.service.investigation.fraud_detection_features import FraudDetectionFeatures

logger = logging.getLogger(__name__)


class EnhancedRiskScorer:
    """
    Enhanced risk scoring that doesn't use MODEL_SCORE.
    Replaces the existing risk calculation with behavioral pattern analysis.
    Includes progressive thresholds and merchant-specific adjustments.
    """

    def __init__(self):
        self.feature_calculator = FraudDetectionFeatures()
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

        # High repetition with volume
        if (
            features.get("max_repeated_amount_ratio", 0) > 0.6
            and features.get("tx_count", 0) > 4
        ):
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

        # Known subscription merchants with low volume
        if primary_merchant:
            merchant_lower = primary_merchant.lower()
            subscription_merchants = [
                "netflix",
                "spotify",
                "apple",
                "amazon prime",
                "hulu",
                "disney",
            ]
            if any(sub in merchant_lower for sub in subscription_merchants):
                if tx_count <= 2:  # Subscription renewal pattern
                    return True

        # Low transaction count with high diversity (normal shopping)
        if tx_count <= 3 and features.get("merchant_diversity", 0) > 0.8:
            return True

        # Regular monthly pattern (not implemented yet - would need time analysis)

        return False

    def calculate_entity_risk(
        self,
        transactions: List[Dict[str, Any]],
        entity_id: str,
        entity_type: str = "email",
    ) -> Dict[str, Any]:
        """
        Calculate overall risk for an entity based on all transactions.
        Includes progressive thresholds, merchant adjustments, and whitelist checking.

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

        logger.info(
            f"📊 Calculating enhanced risk for {entity_type}:{entity_id} with {len(transactions)} transactions"
        )

        # Calculate overall features
        overall_assessment = self.feature_calculator.calculate_transaction_features(
            transactions, entity_id, window_hours=24
        )

        # Get most common merchant
        merchants = [
            tx.get("MERCHANT") or tx.get("MERCHANT_NAME")
            for tx in transactions
            if tx.get("MERCHANT") or tx.get("MERCHANT_NAME")
        ]
        merchant_counts = {}
        for m in merchants:
            if m:
                merchant_counts[m] = merchant_counts.get(m, 0) + 1
        primary_merchant = (
            max(merchant_counts.keys(), key=lambda k: merchant_counts[k])
            if merchant_counts
            else None
        )

        # Get progressive threshold
        tx_count = len(transactions)
        adaptive_threshold, threshold_reason = self._get_progressive_threshold(
            tx_count, primary_merchant
        )

        # Calculate per-transaction scores
        transaction_scores = {}
        high_risk_count = 0

        for tx in transactions:
            tx_id = (
                tx.get("TX_ID_KEY")
                or tx.get("tx_id_key")
                or tx.get("TX_ID")
                or tx.get("tx_id")
                or str(hash(str(tx)))
            )

            # Calculate risk for this transaction in context
            tx_risk = self.feature_calculator.calculate_per_transaction_risk(
                tx, transactions
            )

            transaction_scores[tx_id] = tx_risk

            if tx_risk >= adaptive_threshold:
                high_risk_count += 1

        # Log feature importance
        self._log_feature_importance(overall_assessment["features"])

        # Determine if fraud
        risk_score = overall_assessment["risk_score"]
        is_fraud = risk_score >= adaptive_threshold
        refinement_applied = False
        whitelisted = False

        # Check whitelist first (reduce false positives)
        if is_fraud:
            whitelisted = self._is_whitelisted_pattern(
                overall_assessment["features"], primary_merchant
            )
            if whitelisted:
                is_fraud = False
                logger.info(f"   ✅ Whitelisted: Legitimate pattern detected")

        # Second-stage refinement for borderline cases (increase recall)
        if not is_fraud and 0.10 <= risk_score < adaptive_threshold:
            if self._is_borderline_fraud(
                overall_assessment["features"], overall_assessment["anomalies"]
            ):
                is_fraud = True
                refinement_applied = True
                logger.info(
                    f"   ⚠️ Borderline case flagged as fraud (score: {risk_score:.3f}, threshold: {adaptive_threshold:.3f})"
                )

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
            "base_threshold": self.base_threshold,
            "threshold_adjustment": threshold_reason,
            "is_fraud": is_fraud,
            "refinement_applied": refinement_applied,
            "whitelisted": whitelisted,
            "primary_merchant": primary_merchant,
        }

        # Log summary
        logger.info(f"✅ Risk assessment complete for {entity_id}")
        logger.info(
            f"   Overall risk: {risk_score:.3f} ({overall_assessment['risk_level']})"
        )
        logger.info(f"   Threshold: {adaptive_threshold:.3f} ({threshold_reason})")
        logger.info(f"   High-risk transactions: {high_risk_count}/{tx_count}")
        logger.info(f"   Anomalies detected: {len(overall_assessment['anomalies'])}")
        logger.info(f"   Is Fraud: {is_fraud}")

        if overall_assessment["anomalies"]:
            for anomaly in overall_assessment["anomalies"][:5]:  # Show first 5
                logger.warning(f"   🚨 {anomaly['type']}: {anomaly['description']}")

        return result

    def _log_feature_importance(self, features: Dict[str, float]):
        """Log the most important features contributing to risk."""
        # Key risk indicators
        risk_indicators = [
            ("tx_per_hour", "Velocity"),
            ("burst_score_3h", "Burst Pattern"),
            ("max_repeated_amount_ratio", "Repeated Amounts"),
            ("single_ip", "Single IP"),
            ("single_device", "Single Device"),
            ("rapid_succession", "Rapid Succession"),
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

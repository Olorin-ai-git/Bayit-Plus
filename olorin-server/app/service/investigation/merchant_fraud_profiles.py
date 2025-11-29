"""
Merchant-Specific Fraud Detection Profiles

Based on historical fraud analysis, each merchant has unique fraud characteristics.
This module provides merchant-specific adjustments to improve detection accuracy.

Analysis Date: 2025-11-28
Data Window: 6 months (Dec 2024 - June 2025)
"""

import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MerchantFraudProfiles:
    """
    Merchant-specific fraud detection profiles based on empirical analysis.
    
    Key Findings:
    - Eneba: Fraud amounts 93.2% HIGHER than legitimate ($56 vs $29)
    - Atlantis Games: Fraud amounts 18.9% HIGHER than legitimate ($82 vs $69)
    - Coinflow: Fraud amounts 54.1% HIGHER + strong geographic clustering (45 vs 179 countries)
    - Paybis: Fraud amounts 65.3% LOWER than legitimate ($5K vs $14K) - INVERTED PATTERN
    """
    
    def __init__(self):
        self.profiles = self._load_profiles()
        logger.info(f"📊 Loaded fraud profiles for {len(self.profiles)} merchants")
    
    def _load_profiles(self) -> Dict[str, Dict[str, Any]]:
        """Load merchant-specific fraud profiles"""
        return {
            "eneba": {
                "fraud_amount_pattern": "higher",  # Fraud = higher amounts
                "amount_multiplier": 1.93,  # Fraud avg / Legitimate avg
                "median_multiplier": 1.83,
                "threshold_adjustment": 0.9,  # Lower threshold (more sensitive)
                "high_risk_amount": 50.0,  # Flag transactions > $50
                "geographic_focus": 0.59,  # Fraud uses 59% of countries (136/229)
                "strategy": "Flag transactions >$50 and 2-3x merchant average",
            },
            "atlantis games": {
                "fraud_amount_pattern": "higher",
                "amount_multiplier": 1.19,
                "median_multiplier": 1.65,
                "threshold_adjustment": 1.0,  # Standard threshold
                "high_risk_amount": 100.0,  # Flag transactions > $100
                "geographic_focus": 0.48,  # Fraud uses 48% of countries (107/224)
                "strategy": "Multi-factor: combine amount + velocity + geography",
            },
            "coinflow": {
                "fraud_amount_pattern": "higher",
                "amount_multiplier": 1.54,
                "median_multiplier": 1.93,
                "threshold_adjustment": 0.85,  # Lower threshold
                "high_risk_amount": 100.0,  # Flag transactions > $100
                "geographic_focus": 0.25,  # Fraud uses only 25% of countries (45/179) - STRONGEST SIGNAL
                "strategy": "Strong geographic signal - combine amount + country filtering",
            },
            "paybis": {
                "fraud_amount_pattern": "lower",  # INVERTED! Fraud = LOWER amounts
                "amount_multiplier": 0.35,  # Fraud avg / Legitimate avg (inverted)
                "median_multiplier": 1.25,
                "threshold_adjustment": 1.2,  # Higher threshold (less sensitive to amount)
                "low_risk_amount": 5000.0,  # Flag transactions $100-$5K (unusual for this merchant)
                "high_legit_amount": 10000.0,  # Legitimate transactions often >$10K
                "geographic_focus": 0.40,  # Fraud uses 40% of countries (91/230)
                "strategy": "INVERSE logic - flag small high-velocity transactions, not large amounts",
            },
        }
    
    def get_profile(self, merchant_name: str) -> Optional[Dict[str, Any]]:
        """Get fraud profile for a merchant"""
        if not merchant_name:
            return None
        
        merchant_lower = merchant_name.lower()
        
        # Exact match
        if merchant_lower in self.profiles:
            return self.profiles[merchant_lower]
        
        # Partial match
        for profile_key, profile in self.profiles.items():
            if profile_key in merchant_lower or merchant_lower in profile_key:
                return profile
        
        return None
    
    def calculate_amount_risk_adjustment(
        self, 
        transaction_amount: float,
        merchant_name: str,
        transactions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate risk adjustment based on transaction amount and merchant profile.
        
        Returns:
            Risk adjustment multiplier (0.5 - 2.0)
            - > 1.0 = increases risk
            - < 1.0 = decreases risk
            - 1.0 = no adjustment
        """
        profile = self.get_profile(merchant_name)
        if not profile:
            return 1.0  # No adjustment for unknown merchants
        
        # Calculate merchant average from transaction set
        amounts = [
            tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY", 0) or 0
            for tx in transactions
            if tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") is not None
        ]
        
        if not amounts:
            return 1.0
        
        avg_amount = sum(amounts) / len(amounts)
        
        fraud_pattern = profile.get("fraud_amount_pattern", "higher")
        
        if fraud_pattern == "higher":
            # Standard pattern: Higher amounts = higher risk
            if "high_risk_amount" in profile:
                if transaction_amount > profile["high_risk_amount"]:
                    # Transaction exceeds high-risk threshold
                    multiplier = 1.0 + (transaction_amount / profile["high_risk_amount"] - 1) * 0.3
                    multiplier = min(2.0, multiplier)  # Cap at 2x
                    logger.debug(
                        f"   Amount risk UP for {merchant_name}: ${transaction_amount:.2f} > ${profile['high_risk_amount']:.2f} → {multiplier:.2f}x"
                    )
                    return multiplier
            
            # Check if amount is significantly above average
            if avg_amount > 0 and transaction_amount > avg_amount * 2:
                multiplier = 1.3
                logger.debug(
                    f"   Amount risk UP for {merchant_name}: ${transaction_amount:.2f} >> avg ${avg_amount:.2f} → {multiplier:.2f}x"
                )
                return multiplier
        
        elif fraud_pattern == "lower":
            # INVERTED pattern (Paybis): Lower amounts = higher risk
            low_risk_threshold = profile.get("low_risk_amount", 5000)
            high_legit_threshold = profile.get("high_legit_amount", 10000)
            
            if transaction_amount > high_legit_threshold:
                # Very high amount - likely legitimate for Paybis
                multiplier = 0.6
                logger.debug(
                    f"   Amount risk DOWN for {merchant_name}: ${transaction_amount:.2f} > ${high_legit_threshold:.2f} (high-value legit pattern) → {multiplier:.2f}x"
                )
                return multiplier
            
            elif 100 < transaction_amount < low_risk_threshold:
                # Small to medium amounts - higher risk for Paybis
                multiplier = 1.4
                logger.debug(
                    f"   Amount risk UP for {merchant_name}: ${transaction_amount:.2f} in suspicious range $100-${low_risk_threshold:.2f} → {multiplier:.2f}x"
                )
                return multiplier
        
        return 1.0  # No adjustment
    
    def get_threshold_adjustment(self, merchant_name: str) -> float:
        """
        Get threshold adjustment factor for a merchant.
        
        Returns:
            Multiplier for base threshold (0.5 - 1.5)
        """
        profile = self.get_profile(merchant_name)
        if not profile:
            return 1.0
        
        return profile.get("threshold_adjustment", 1.0)
    
    def apply_merchant_adjustments(
        self,
        base_risk_score: float,
        transaction: Dict[str, Any],
        all_transactions: List[Dict[str, Any]],
        merchant_name: str
    ) -> float:
        """
        Apply all merchant-specific adjustments to a risk score.
        
        Args:
            base_risk_score: Initial risk score (0.0 - 1.0)
            transaction: Current transaction being scored
            all_transactions: All transactions for context
            merchant_name: Merchant name
        
        Returns:
            Adjusted risk score (0.0 - 1.0)
        """
        if not merchant_name:
            return base_risk_score
        
        profile = self.get_profile(merchant_name)
        if not profile:
            return base_risk_score
        
        # Start with base score
        adjusted_score = base_risk_score
        
        # Apply amount-based adjustment
        amount = transaction.get("PAID_AMOUNT_VALUE_IN_CURRENCY", 0) or 0
        if amount > 0:
            amount_adjustment = self.calculate_amount_risk_adjustment(
                amount, merchant_name, all_transactions
            )
            adjusted_score = adjusted_score * amount_adjustment
        
        # Ensure score stays in valid range
        adjusted_score = max(0.0, min(1.0, adjusted_score))
        
        if abs(adjusted_score - base_risk_score) > 0.05:
            logger.debug(
                f"   Merchant adjustment for {merchant_name}: {base_risk_score:.3f} → {adjusted_score:.3f}"
            )
        
        return adjusted_score


# Global instance
_merchant_profiles = None


def get_merchant_profiles() -> MerchantFraudProfiles:
    """Get global merchant profiles instance"""
    global _merchant_profiles
    if _merchant_profiles is None:
        _merchant_profiles = MerchantFraudProfiles()
    return _merchant_profiles



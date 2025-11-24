"""
Unit tests for per-transaction risk scoring functions in risk_agent.py

Tests the per-transaction score calculation functions including:
- Feature extraction and normalization
- Domain score calculation
- Per-transaction score calculation
- Validation and error handling
"""

import pytest
from app.service.agent.orchestration.domain_agents.risk_agent import (
    _validate_transaction_score,
    _extract_transaction_features,
    _count_critical_features,
    _normalize_amount_feature,
    _normalize_merchant_feature,
    _normalize_device_feature,
    _normalize_location_feature,
    _calculate_feature_score,
    _calculate_domain_score,
    _calculate_per_transaction_score,
    _calculate_per_transaction_scores,
)


class TestValidateTransactionScore:
    """Test transaction score validation."""
    
    def test_valid_score_in_range(self):
        """Test that scores in [0.0, 1.0] range are valid."""
        assert _validate_transaction_score(0.0) is True
        assert _validate_transaction_score(0.5) is True
        assert _validate_transaction_score(1.0) is True
        assert _validate_transaction_score(0.75) is True
    
    def test_invalid_score_out_of_range(self):
        """Test that scores outside [0.0, 1.0] range are invalid."""
        assert _validate_transaction_score(-0.1) is False
        assert _validate_transaction_score(1.1) is False
        assert _validate_transaction_score(2.0) is False
    
    def test_invalid_score_type(self):
        """Test that non-numeric scores are invalid."""
        assert _validate_transaction_score("0.5") is False
        assert _validate_transaction_score(None) is False
        assert _validate_transaction_score([]) is False


class TestExtractTransactionFeatures:
    """Test transaction feature extraction."""
    
    def test_extract_all_features(self):
        """Test extraction of all features."""
        tx = {
            "TX_ID_KEY": "tx_123",
            "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.50,
            "MERCHANT_NAME": "TestMerchant",
            "DEVICE_ID": "device_456",
            "IP_COUNTRY_CODE": "US"
        }
        features = _extract_transaction_features(tx)
        
        assert features["amount"] == 100.50
        assert features["merchant"] == "TestMerchant"
        assert features["device"] == "device_456"
        assert features["location"] == "US"
    
    def test_extract_partial_features(self):
        """Test extraction with missing features."""
        tx = {
            "TX_ID_KEY": "tx_123",
            "PAID_AMOUNT_VALUE_IN_CURRENCY": 50.0,
            "MERCHANT_NAME": "TestMerchant"
        }
        features = _extract_transaction_features(tx)
        
        assert features["amount"] == 50.0
        assert features["merchant"] == "TestMerchant"
        assert features["device"] is None
        assert features["location"] is None
    
    def test_extract_no_model_score(self):
        """Test that MODEL_SCORE and NSURE_LAST_DECISION are not extracted."""
        tx = {
            "TX_ID_KEY": "tx_123",
            "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
            "MODEL_SCORE": 0.8,
            "NSURE_LAST_DECISION": "APPROVED"
        }
        features = _extract_transaction_features(tx)
        
        # Should not have MODEL_SCORE or NSURE_LAST_DECISION
        assert "MODEL_SCORE" not in features
        assert "NSURE_LAST_DECISION" not in features


class TestCountCriticalFeatures:
    """Test critical feature counting."""
    
    def test_count_all_features(self):
        """Test counting when all features are present."""
        features = {
            "amount": 100.0,
            "merchant": "TestMerchant",
            "device": "device_123",
            "location": "US"
        }
        assert _count_critical_features(features) == 4
    
    def test_count_partial_features(self):
        """Test counting with some missing features."""
        features = {
            "amount": 100.0,
            "merchant": "TestMerchant",
            "device": None,
            "location": None
        }
        assert _count_critical_features(features) == 2
    
    def test_count_insufficient_features(self):
        """Test counting when insufficient features."""
        features = {
            "amount": 100.0,
            "merchant": None,
            "device": None,
            "location": None
        }
        assert _count_critical_features(features) == 1


class TestNormalizeAmountFeature:
    """Test amount feature normalization."""
    
    def test_normalize_amount(self):
        """Test amount normalization."""
        assert _normalize_amount_feature(50.0, 100.0) == 0.5
        assert _normalize_amount_feature(100.0, 100.0) == 1.0
        assert _normalize_amount_feature(0.0, 100.0) == 0.0
    
    def test_normalize_amount_zero_max(self):
        """Test normalization when max_amount is zero."""
        assert _normalize_amount_feature(50.0, 0.0) == 0.0


class TestNormalizeMerchantFeature:
    """Test merchant feature normalization."""
    
    def test_normalize_merchant_with_entity_mapping(self):
        """Test merchant normalization with entity-specific mapping."""
        domain_findings = {
            "merchant": {
                "merchant_risks": {
                    "TestMerchant": 0.8
                },
                "risk_score": 0.5,
                "confidence": 0.7
            }
        }
        score = _normalize_merchant_feature("TestMerchant", domain_findings)
        assert score == 0.8
    
    def test_normalize_merchant_with_aggregate_fallback(self):
        """Test merchant normalization with aggregate fallback."""
        domain_findings = {
            "merchant": {
                "risk_score": 0.6,
                "confidence": 0.7
            }
        }
        score = _normalize_merchant_feature("UnknownMerchant", domain_findings)
        assert score == 0.6
    
    def test_normalize_merchant_default(self):
        """Test merchant normalization with default fallback."""
        domain_findings = {}
        score = _normalize_merchant_feature("TestMerchant", domain_findings)
        assert score == 0.5  # Default moderate risk


class TestCalculateFeatureScore:
    """Test feature score calculation."""
    
    def test_calculate_feature_score(self):
        """Test feature score calculation."""
        score = _calculate_feature_score(0.8, 0.6, 0.4, 0.2)
        expected = (0.8 + 0.6 + 0.4 + 0.2) / 4.0
        assert abs(score - expected) < 0.001
    
    def test_calculate_feature_score_bounds(self):
        """Test that feature score is bounded to [0, 1]."""
        score = _calculate_feature_score(1.5, 0.0, 0.0, 0.0)
        assert 0.0 <= score <= 1.0


class TestCalculateDomainScore:
    """Test domain score calculation."""
    
    def test_calculate_domain_score_with_entity_mappings(self):
        """Test domain score with entity-specific mappings."""
        tx = {
            "MERCHANT_NAME": "TestMerchant",
            "DEVICE_ID": "device_123",
            "IP_COUNTRY_CODE": "US"
        }
        domain_findings = {
            "merchant": {
                "merchant_risks": {"TestMerchant": 0.8},
                "risk_score": 0.5,
                "confidence": 0.7
            },
            "device": {
                "device_risks": {"device_123": 0.6},
                "risk_score": 0.4,
                "confidence": 0.8
            },
            "location": {
                "risk_score": 0.3,
                "confidence": 0.6
            }
        }
        score = _calculate_domain_score(tx, domain_findings)
        assert 0.0 <= score <= 1.0
    
    def test_calculate_domain_score_with_aggregate_fallback(self):
        """Test domain score with aggregate fallback."""
        tx = {
            "MERCHANT_NAME": "UnknownMerchant",
            "DEVICE_ID": "unknown_device"
        }
        domain_findings = {
            "merchant": {
                "risk_score": 0.5,
                "confidence": 0.7
            },
            "device": {
                "risk_score": 0.6,
                "confidence": 0.8
            }
        }
        score = _calculate_domain_score(tx, domain_findings)
        assert 0.0 <= score <= 1.0


class TestCalculatePerTransactionScore:
    """Test per-transaction score calculation."""
    
    def test_calculate_per_transaction_score(self):
        """Test per-transaction score calculation with correct formula."""
        feature_score = 0.6
        domain_score = 0.4
        tx_score = _calculate_per_transaction_score(feature_score, domain_score)
        
        expected = (0.6 * 0.6) + (0.4 * 0.4)  # 0.6 * feature + 0.4 * domain
        assert abs(tx_score - expected) < 0.001
    
    def test_calculate_per_transaction_score_bounds(self):
        """Test that per-transaction score is bounded to [0, 1]."""
        tx_score = _calculate_per_transaction_score(1.5, 0.0)
        assert 0.0 <= tx_score <= 1.0


class TestCalculatePerTransactionScores:
    """Test per-transaction scores calculation for multiple transactions."""
    
    def test_calculate_per_transaction_scores_basic(self):
        """Test basic per-transaction scores calculation."""
        facts = {
            "results": [
                {
                    "TX_ID_KEY": "tx_1",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
                    "MERCHANT_NAME": "Merchant1",
                    "DEVICE_ID": "device_1",
                    "IP_COUNTRY_CODE": "US"
                },
                {
                    "TX_ID_KEY": "tx_2",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 200.0,
                    "MERCHANT_NAME": "Merchant2",
                    "DEVICE_ID": "device_2",
                    "IP_COUNTRY_CODE": "CA"
                }
            ]
        }
        domain_findings = {
            "merchant": {"risk_score": 0.5, "confidence": 0.7},
            "device": {"risk_score": 0.6, "confidence": 0.8},
            "location": {"risk_score": 0.4, "confidence": 0.6}
        }
        
        scores = _calculate_per_transaction_scores(facts, domain_findings)
        
        assert len(scores) == 2
        assert "tx_1" in scores
        assert "tx_2" in scores
        assert 0.0 <= scores["tx_1"] <= 1.0
        assert 0.0 <= scores["tx_2"] <= 1.0
    
    def test_calculate_per_transaction_scores_insufficient_features(self):
        """Test that transactions with insufficient features are excluded."""
        facts = {
            "results": [
                {
                    "TX_ID_KEY": "tx_1",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0
                    # Missing merchant, device, location
                }
            ]
        }
        domain_findings = {}
        
        scores = _calculate_per_transaction_scores(facts, domain_findings)
        
        # Transaction should be excluded due to insufficient features
        assert len(scores) == 0
    
    def test_calculate_per_transaction_scores_empty_results(self):
        """Test handling of empty results."""
        facts = {"results": []}
        domain_findings = {}
        
        scores = _calculate_per_transaction_scores(facts, domain_findings)
        
        assert len(scores) == 0
    
    def test_calculate_per_transaction_scores_no_model_score(self):
        """Test that MODEL_SCORE and NSURE_LAST_DECISION are not used."""
        facts = {
            "results": [
                {
                    "TX_ID_KEY": "tx_1",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
                    "MERCHANT_NAME": "Merchant1",
                    "DEVICE_ID": "device_1",
                    "IP_COUNTRY_CODE": "US",
                    "MODEL_SCORE": 0.9,  # Should be ignored
                    "NSURE_LAST_DECISION": "APPROVED"  # Should be ignored
                }
            ]
        }
        domain_findings = {
            "merchant": {"risk_score": 0.5, "confidence": 0.7},
            "device": {"risk_score": 0.6, "confidence": 0.8},
            "location": {"risk_score": 0.4, "confidence": 0.6}
        }
        
        scores = _calculate_per_transaction_scores(facts, domain_findings)
        
        # Should still calculate score (not using MODEL_SCORE)
        assert len(scores) == 1
        assert "tx_1" in scores


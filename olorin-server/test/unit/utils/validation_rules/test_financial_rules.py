#!/usr/bin/env python3
"""
Comprehensive Test Suite for FinancialValidationRules

Tests all financial validation scenarios including amounts, currencies, payment methods,
card validation, fraud detection, and risk assessment.

Performance Requirement: Financial validation must complete in <50ms
Security Requirement: Must detect financial fraud patterns
Coverage Target: >90% code coverage
"""

import pytest
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock
from typing import Any, Dict, List, Tuple

from app.utils.validation_rules.financial_rules import FinancialValidationRules


class TestFinancialValidationRules:
    """Test the main FinancialValidationRules class"""

    @pytest.fixture
    def financial_validator(self):
        """Create a fresh financial validator instance for each test"""
        return FinancialValidationRules()

    def test_financial_validator_initialization(self, financial_validator):
        """Test financial validator initializes with all required data"""
        # Check currency precision data is loaded
        assert len(financial_validator.CURRENCY_PRECISION) >= 20, "Should have currency precision data"
        assert 'USD' in financial_validator.CURRENCY_PRECISION
        assert 'EUR' in financial_validator.CURRENCY_PRECISION
        assert 'JPY' in financial_validator.CURRENCY_PRECISION
        
        # Check payment patterns are loaded
        assert len(financial_validator.PAYMENT_PATTERNS) >= 6, "Should have payment patterns"
        assert 'credit_card' in financial_validator.PAYMENT_PATTERNS
        assert 'iban' in financial_validator.PAYMENT_PATTERNS
        assert 'paypal_email' in financial_validator.PAYMENT_PATTERNS
        
        # Check card networks are loaded
        assert len(financial_validator.CARD_NETWORKS) >= 5, "Should have card networks"
        assert 'visa' in financial_validator.CARD_NETWORKS
        assert 'mastercard' in financial_validator.CARD_NETWORKS
        
        # Check risk thresholds are loaded
        assert 'high_value_threshold' in financial_validator.RISK_THRESHOLDS
        assert 'velocity_limits' in financial_validator.RISK_THRESHOLDS
        
        # Check Luhn cache is initialized
        assert hasattr(financial_validator, 'luhn_cache')
        assert isinstance(financial_validator.luhn_cache, dict)


class TestCurrencyAmountValidation:
    """Test currency amount validation functionality"""

    @pytest.fixture
    def financial_validator(self):
        return FinancialValidationRules()

    @pytest.mark.parametrize("amount,currency,expected_valid", [
        ("100.50", "USD", True),
        ("0.00", "USD", True),
        ("999999.99", "USD", True),
        ("50000", "JPY", True),  # JPY has 0 decimal places
        ("100.12", "EUR", True),
        ("0.01", "GBP", True),
        ("1000.00", "CAD", True),
    ])
    def test_validate_currency_amount_valid(self, financial_validator, amount, currency, expected_valid):
        """Test validation of valid currency amounts"""
        is_valid, error = financial_validator.validate_currency_amount(amount, currency)
        assert is_valid == expected_valid, f"Amount {amount} {currency} should be {'valid' if expected_valid else 'invalid'}"
        if expected_valid:
            assert error is None

    @pytest.mark.parametrize("amount,currency,expected_error", [
        ("-100.50", "USD", "Amount cannot be negative"),
        ("100.123", "USD", "Too many decimal places"),  # USD allows only 2 decimal places
        ("100.50", "INVALID", "Unsupported currency"),
        ("50.50", "JPY", "Too many decimal places"),  # JPY allows 0 decimal places
        ("999999999999.99", "USD", "Amount exceeds maximum limit"),
    ])
    def test_validate_currency_amount_invalid(self, financial_validator, amount, currency, expected_error):
        """Test validation of invalid currency amounts"""
        is_valid, error = financial_validator.validate_currency_amount(amount, currency)
        assert is_valid is False, f"Amount {amount} {currency} should be invalid"
        assert expected_error in error

    def test_currency_precision_validation(self, financial_validator):
        """Test currency-specific decimal precision validation"""
        # Test currencies with different precision requirements
        currency_tests = [
            ("100.12", "USD", True),   # USD: 2 decimals allowed
            ("100.123", "USD", False), # USD: 3 decimals not allowed
            ("100", "JPY", True),      # JPY: 0 decimals allowed
            ("100.5", "JPY", False),   # JPY: decimals not allowed
            ("100.12", "EUR", True),   # EUR: 2 decimals allowed
            ("100.1234", "EUR", False),# EUR: 4 decimals not allowed
        ]
        
        for amount, currency, should_be_valid in currency_tests:
            is_valid, error = financial_validator.validate_currency_amount(amount, currency)
            assert is_valid == should_be_valid, f"Precision test failed for {amount} {currency}"

    def test_amount_type_conversion(self, financial_validator):
        """Test amount validation with different input types"""
        test_inputs = [
            (100.50, "USD", True),    # float
            (100, "USD", True),       # int
            ("100.50", "USD", True),  # string
            (Decimal("100.50"), "USD", True),  # Decimal
        ]
        
        for amount, currency, expected_valid in test_inputs:
            is_valid, error = financial_validator.validate_currency_amount(amount, currency)
            assert is_valid == expected_valid, f"Type conversion failed for {type(amount)} {amount}"

    def test_edge_case_amounts(self, financial_validator):
        """Test edge cases for amount validation"""
        edge_cases = [
            ("0", "USD", True),       # Zero amount
            ("0.00", "USD", True),    # Zero with decimals
            ("0.01", "USD", True),    # Minimum non-zero
            ("999999999.99", "USD", False),  # Very large amount
            ("1e-10", "USD", False),  # Scientific notation small
            ("1e10", "USD", False),   # Scientific notation large
        ]
        
        for amount, currency, expected_valid in edge_cases:
            is_valid, error = financial_validator.validate_currency_amount(amount, currency)
            assert is_valid == expected_valid, f"Edge case failed for {amount} {currency}"


class TestPaymentMethodValidation:
    """Test payment method validation functionality"""

    @pytest.fixture
    def financial_validator(self):
        return FinancialValidationRules()

    @pytest.mark.parametrize("payment_method,payment_data,expected_valid", [
        ("credit_card", {"number": "4111111111111111"}, True),  # Valid Visa
        ("credit_card", {"number": "5555555555554444"}, True),  # Valid Mastercard
        ("credit_card", {"number": "378282246310005"}, True),   # Valid Amex
        ("paypal", {"email": "user@paypal.com"}, True),
        ("bank_transfer", {"iban": "GB82WEST12345698765432", "swift": "DEUTDEFF"}, True),
        ("wire", {"routing": "123456789", "account": "1234567890"}, True),
    ])
    def test_validate_payment_method_valid(self, financial_validator, payment_method, payment_data, expected_valid):
        """Test validation of valid payment methods"""
        is_valid, error = financial_validator.validate_payment_method(payment_method, payment_data)
        assert is_valid == expected_valid, f"Payment method {payment_method} should be {'valid' if expected_valid else 'invalid'}"
        if expected_valid:
            assert error is None

    @pytest.mark.parametrize("payment_method,payment_data,expected_error", [
        ("credit_card", {"number": "1234"}, "Invalid credit card number"),
        ("credit_card", {"number": "4111111111111112"}, "Invalid credit card"),  # Invalid Luhn
        ("credit_card", {}, "Missing credit card number"),
        ("paypal", {"email": "invalid-email"}, "Invalid PayPal email"),
        ("paypal", {}, "Missing PayPal email"),
        ("bank_transfer", {"iban": "INVALID"}, "Invalid IBAN format"),
        ("unknown_method", {}, "Unsupported payment method"),
    ])
    def test_validate_payment_method_invalid(self, financial_validator, payment_method, payment_data, expected_error):
        """Test validation of invalid payment methods"""
        is_valid, error = financial_validator.validate_payment_method(payment_method, payment_data)
        assert is_valid is False, f"Payment method {payment_method} should be invalid"
        assert expected_error in error

    def test_credit_card_luhn_validation(self, financial_validator):
        """Test Luhn algorithm validation for credit cards"""
        # Valid credit card numbers (pass Luhn check)
        valid_cards = [
            "4111111111111111",  # Visa
            "5555555555554444",  # Mastercard
            "378282246310005",   # Amex
            "6011111111111117",  # Discover
            "30569309025904",    # Diners Club
        ]
        
        for card_number in valid_cards:
            is_valid, error = financial_validator.validate_payment_method("credit_card", {"number": card_number})
            assert is_valid is True, f"Valid card number should pass Luhn check: {card_number}"
        
        # Invalid credit card numbers (fail Luhn check)
        invalid_cards = [
            "4111111111111112",  # Invalid Visa
            "5555555555554445",  # Invalid Mastercard
            "378282246310006",   # Invalid Amex
        ]
        
        for card_number in invalid_cards:
            is_valid, error = financial_validator.validate_payment_method("credit_card", {"number": card_number})
            assert is_valid is False, f"Invalid card number should fail Luhn check: {card_number}"

    def test_card_network_detection(self, financial_validator):
        """Test credit card network detection"""
        card_network_tests = [
            ("4111111111111111", "visa"),
            ("5555555555554444", "mastercard"),
            ("378282246310005", "amex"),
            ("6011111111111117", "discover"),
            ("30569309025904", "diners"),
        ]
        
        for card_number, expected_network in card_network_tests:
            detected_network = financial_validator._detect_card_network(card_number)
            assert detected_network == expected_network, f"Card {card_number} should be detected as {expected_network}"

    def test_iban_validation(self, financial_validator):
        """Test IBAN validation"""
        valid_ibans = [
            "GB82WEST12345698765432",
            "DE89370400440532013000",
            "FR1420041010050500013M02606",
            "ES9121000418450200051332",
        ]
        
        for iban in valid_ibans:
            is_valid, error = financial_validator.validate_payment_method("bank_transfer", {"iban": iban})
            assert is_valid is True, f"Valid IBAN should pass validation: {iban}"
        
        invalid_ibans = [
            "INVALID",
            "GB82WEST123456987654321234567890",  # Too long
            "XX82WEST12345698765432",  # Invalid country
            "GB12345",  # Too short
        ]
        
        for iban in invalid_ibans:
            is_valid, error = financial_validator.validate_payment_method("bank_transfer", {"iban": iban})
            assert is_valid is False, f"Invalid IBAN should fail validation: {iban}"

    def test_paypal_email_validation(self, financial_validator):
        """Test PayPal email validation"""
        valid_paypal_emails = [
            "user@paypal.com",
            "test.user@gmail.com",
            "payment@business.co.uk",
        ]
        
        for email in valid_paypal_emails:
            is_valid, error = financial_validator.validate_payment_method("paypal", {"email": email})
            assert is_valid is True, f"Valid PayPal email should pass: {email}"
        
        invalid_paypal_emails = [
            "invalid-email",
            "@domain.com",
            "user@",
            "",
        ]
        
        for email in invalid_paypal_emails:
            is_valid, error = financial_validator.validate_payment_method("paypal", {"email": email})
            assert is_valid is False, f"Invalid PayPal email should fail: {email}"


class TestTransactionRiskValidation:
    """Test transaction risk assessment functionality"""

    @pytest.fixture
    def financial_validator(self):
        return FinancialValidationRules()

    def test_validate_transaction_risk_low_risk(self, financial_validator):
        """Test risk validation for low-risk transactions"""
        low_risk_transaction = {
            'amount': '50.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'country': 'US',
            'is_first_transaction': False,
            'user_age_days': 365,
            'transaction_count_24h': 2
        }
        
        is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(low_risk_transaction)
        
        assert is_safe is True, "Low-risk transaction should be safe"
        assert risk_analysis['risk_score'] < 0.3, "Should have low risk score"
        assert risk_analysis['risk_factors'] < 3, "Should have few risk factors"

    def test_validate_transaction_risk_high_risk(self, financial_validator):
        """Test risk validation for high-risk transactions"""
        high_risk_transaction = {
            'amount': '10000.00',  # High amount
            'currency': 'USD',
            'payment_method': 'credit_card',
            'country': 'NG',  # High-risk country
            'is_first_transaction': True,  # First transaction
            'user_age_days': 0,  # New user
            'transaction_count_24h': 15,  # High velocity
            'ip_country': 'RU',  # IP country mismatch
        }
        
        is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(high_risk_transaction)
        
        assert is_safe is False, "High-risk transaction should be flagged"
        assert risk_analysis['risk_score'] > 0.7, "Should have high risk score"
        assert risk_analysis['risk_factors'] >= 4, "Should have multiple risk factors"

    def test_high_value_transaction_detection(self, financial_validator):
        """Test detection of high-value transactions"""
        high_value_amounts = [
            ('6000.00', 'USD'),
            ('5000.00', 'EUR'),
            ('4500.00', 'GBP'),
            ('600000.00', 'JPY'),
        ]
        
        for amount, currency in high_value_amounts:
            transaction = {
                'amount': amount,
                'currency': currency,
                'payment_method': 'credit_card'
            }
            
            is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(transaction)
            assert risk_analysis['high_value_transaction'] is True, f"Should detect high value: {amount} {currency}"

    def test_velocity_limit_detection(self, financial_validator):
        """Test detection of velocity limit violations"""
        high_velocity_transaction = {
            'amount': '100.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'transaction_count_24h': 60,  # Exceeds daily limit
            'transaction_amount_24h': '30000.00',  # Exceeds daily amount
            'transaction_count_1h': 15,  # Exceeds hourly limit
        }
        
        is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(high_velocity_transaction)
        
        assert risk_analysis['velocity_violations'] >= 3, "Should detect multiple velocity violations"
        assert 'daily_count_exceeded' in risk_analysis['velocity_details']
        assert 'daily_amount_exceeded' in risk_analysis['velocity_details']
        assert 'hourly_count_exceeded' in risk_analysis['velocity_details']

    def test_suspicious_amount_patterns(self, financial_validator):
        """Test detection of suspicious amount patterns"""
        suspicious_amounts = ['1.00', '10.00', '100.00', '1000.00', '1.99', '9.99', '99.99']
        
        for amount in suspicious_amounts:
            transaction = {
                'amount': amount,
                'currency': 'USD',
                'payment_method': 'credit_card'
            }
            
            is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(transaction)
            assert risk_analysis.get('suspicious_amount_pattern', False), f"Should detect suspicious amount: {amount}"

    def test_first_transaction_risk_assessment(self, financial_validator):
        """Test risk assessment for first-time transactions"""
        first_transaction = {
            'amount': '500.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'is_first_transaction': True,
            'user_age_days': 0
        }
        
        is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(first_transaction)
        
        assert risk_analysis['first_transaction_risk'] is True, "Should flag first transaction risk"
        assert risk_analysis['new_user_risk'] is True, "Should flag new user risk"

    def test_country_risk_assessment(self, financial_validator):
        """Test country-based risk assessment"""
        # High-risk countries
        high_risk_countries = ['NG', 'PK', 'BD', 'GH', 'KE']
        
        for country in high_risk_countries:
            transaction = {
                'amount': '100.00',
                'currency': 'USD',
                'payment_method': 'credit_card',
                'country': country
            }
            
            is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(transaction)
            assert risk_analysis.get('country_risk', 0) > 0.5, f"Should detect high country risk: {country}"
        
        # Low-risk countries
        low_risk_countries = ['US', 'CA', 'GB', 'DE', 'AU']
        
        for country in low_risk_countries:
            transaction = {
                'amount': '100.00',
                'currency': 'USD',
                'payment_method': 'credit_card',
                'country': country
            }
            
            is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(transaction)
            assert risk_analysis.get('country_risk', 0) < 0.3, f"Should detect low country risk: {country}"

    def test_ip_country_mismatch_detection(self, financial_validator):
        """Test detection of IP country mismatch"""
        mismatch_transaction = {
            'amount': '100.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'country': 'US',
            'ip_country': 'NG'  # Mismatch
        }
        
        is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(mismatch_transaction)
        
        assert risk_analysis['ip_country_mismatch'] is True, "Should detect IP country mismatch"
        assert risk_analysis['geographic_risk'] > 0.5, "Should increase geographic risk"


class TestFraudDetection:
    """Test fraud detection functionality"""

    @pytest.fixture
    def financial_validator(self):
        return FinancialValidationRules()

    def test_detect_card_testing_patterns(self, financial_validator):
        """Test detection of card testing fraud patterns"""
        card_testing_data = {
            'amount': '1.00',  # Common testing amount
            'currency': 'USD',
            'payment_method': 'credit_card',
            'transaction_count_1h': 20,  # High frequency
            'failed_attempts_1h': 15,  # Many failures
            'multiple_cards_used': True
        }
        
        is_fraud, fraud_msg, fraud_analysis = financial_validator.detect_fraud_patterns(card_testing_data)
        
        assert is_fraud is True, "Should detect card testing pattern"
        assert fraud_analysis['card_testing_indicators'] >= 3, "Should have multiple card testing indicators"
        assert 'small_amount' in fraud_analysis['fraud_signals']
        assert 'high_frequency' in fraud_analysis['fraud_signals']

    def test_detect_account_takeover_patterns(self, financial_validator):
        """Test detection of account takeover fraud patterns"""
        takeover_data = {
            'amount': '500.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'ip_changed': True,
            'location_changed': True,
            'new_payment_method': True,
            'login_failed_attempts': 5,
            'password_changed_recently': True
        }
        
        is_fraud, fraud_msg, fraud_analysis = financial_validator.detect_fraud_patterns(takeover_data)
        
        assert is_fraud is True, "Should detect account takeover pattern"
        assert fraud_analysis['account_takeover_indicators'] >= 4, "Should have multiple ATO indicators"

    def test_detect_money_laundering_patterns(self, financial_validator):
        """Test detection of money laundering patterns"""
        laundering_data = {
            'amount': '9999.99',  # Just under reporting threshold
            'currency': 'USD',
            'payment_method': 'wire',
            'round_amount_transactions': 15,  # Many round amounts
            'frequent_small_transactions': True,
            'high_risk_country': True,
            'cash_equivalent_transactions': 10
        }
        
        is_fraud, fraud_msg, fraud_analysis = financial_validator.detect_fraud_patterns(laundering_data)
        
        assert is_fraud is True, "Should detect money laundering pattern"
        assert fraud_analysis['money_laundering_indicators'] >= 3, "Should have multiple ML indicators"

    def test_detect_synthetic_identity_fraud(self, financial_validator):
        """Test detection of synthetic identity fraud"""
        synthetic_data = {
            'amount': '200.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'user_age_days': 30,  # Very new account
            'credit_applications_recent': 5,  # Multiple recent applications
            'inconsistent_personal_info': True,
            'no_credit_history': True,
            'address_verification_failed': True
        }
        
        is_fraud, fraud_msg, fraud_analysis = financial_validator.detect_fraud_patterns(synthetic_data)
        
        assert is_fraud is True, "Should detect synthetic identity fraud"
        assert fraud_analysis['synthetic_identity_indicators'] >= 3, "Should have multiple synthetic identity indicators"

    def test_legitimate_transaction_not_flagged(self, financial_validator):
        """Test that legitimate transactions are not flagged as fraud"""
        legitimate_data = {
            'amount': '150.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'country': 'US',
            'user_age_days': 365,
            'transaction_count_24h': 3,
            'failed_attempts_1h': 0,
            'ip_changed': False,
            'location_changed': False
        }
        
        is_fraud, fraud_msg, fraud_analysis = financial_validator.detect_fraud_patterns(legitimate_data)
        
        assert is_fraud is False, "Legitimate transaction should not be flagged as fraud"
        assert fraud_analysis['fraud_score'] < 0.3, "Should have low fraud score"


class TestPerformanceRequirements:
    """Test performance requirements for financial validation"""

    @pytest.fixture
    def financial_validator(self):
        return FinancialValidationRules()

    def test_currency_validation_performance(self, financial_validator):
        """Test currency validation meets performance requirements"""
        test_amounts = [
            ("100.50", "USD"),
            ("999.99", "EUR"),
            ("50000", "JPY"),
            ("75.25", "GBP"),
            ("200.00", "CAD")
        ] * 20  # 100 validations total
        
        start_time = time.time()
        for amount, currency in test_amounts:
            financial_validator.validate_currency_amount(amount, currency)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Currency validation took {execution_time_ms}ms, should be <50ms"

    def test_payment_method_validation_performance(self, financial_validator):
        """Test payment method validation performance"""
        test_payments = [
            ("credit_card", {"number": "4111111111111111"}),
            ("paypal", {"email": "user@paypal.com"}),
            ("bank_transfer", {"iban": "GB82WEST12345698765432"}),
        ] * 30  # 90 validations total
        
        start_time = time.time()
        for method, data in test_payments:
            financial_validator.validate_payment_method(method, data)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Payment validation took {execution_time_ms}ms, should be <50ms"

    def test_risk_assessment_performance(self, financial_validator):
        """Test risk assessment performance"""
        test_transaction = {
            'amount': '100.00',
            'currency': 'USD',
            'payment_method': 'credit_card',
            'country': 'US',
            'user_age_days': 365,
            'transaction_count_24h': 5
        }
        
        start_time = time.time()
        for _ in range(50):
            financial_validator.validate_transaction_risk(test_transaction)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Risk assessment took {execution_time_ms}ms, should be <50ms"

    def test_luhn_caching_performance(self, financial_validator):
        """Test that Luhn algorithm caching improves performance"""
        test_card = "4111111111111111"
        
        # Cold cache
        start_time = time.time()
        for _ in range(100):
            financial_validator._validate_luhn(test_card)
        cold_time = time.time() - start_time
        
        # Warm cache (same card number)
        start_time = time.time()
        for _ in range(100):
            financial_validator._validate_luhn(test_card)
        warm_time = time.time() - start_time
        
        # Warm cache should be faster or equal
        assert warm_time <= cold_time * 1.1, "Cached Luhn validation should not be significantly slower"


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling for financial validation"""

    @pytest.fixture
    def financial_validator(self):
        return FinancialValidationRules()

    def test_malformed_amount_handling(self, financial_validator):
        """Test handling of malformed amounts"""
        malformed_amounts = [
            None,
            "",
            "not_a_number",
            "100.50.25",  # Multiple decimals
            "100,50",     # Comma separator
            "1e10",       # Scientific notation
            "∞",          # Infinity symbol
            "NaN",        # Not a number
        ]
        
        for amount in malformed_amounts:
            is_valid, error = financial_validator.validate_currency_amount(amount, "USD")
            assert is_valid is False, f"Malformed amount should be invalid: {amount}"
            assert error is not None

    def test_missing_payment_data_handling(self, financial_validator):
        """Test handling of missing payment method data"""
        incomplete_data_sets = [
            ("credit_card", {}),  # Missing number
            ("credit_card", {"number": None}),  # None number
            ("paypal", {}),  # Missing email
            ("bank_transfer", {}),  # Missing IBAN
            ("bank_transfer", {"iban": ""}),  # Empty IBAN
        ]
        
        for method, data in incomplete_data_sets:
            is_valid, error = financial_validator.validate_payment_method(method, data)
            assert is_valid is False, f"Incomplete payment data should be invalid: {method}, {data}"
            assert "Missing" in error or "required" in error.lower()

    def test_unsupported_currency_handling(self, financial_validator):
        """Test handling of unsupported currencies"""
        unsupported_currencies = ["XXX", "ZZZ", "INVALID", "", None, "123"]
        
        for currency in unsupported_currencies:
            try:
                is_valid, error = financial_validator.validate_currency_amount("100.00", currency)
                assert is_valid is False, f"Unsupported currency should be invalid: {currency}"
                assert "Unsupported currency" in error or error is not None
            except Exception as e:
                # Should handle gracefully, not crash
                assert isinstance(e, (TypeError, ValueError, AttributeError))

    def test_extreme_amounts_handling(self, financial_validator):
        """Test handling of extreme amounts"""
        extreme_amounts = [
            "999999999999999999.99",  # Very large
            "0.00000000001",          # Very small
            "-999999999.99",          # Very negative
            "1.23456789012345",       # Many decimals
        ]
        
        for amount in extreme_amounts:
            is_valid, error = financial_validator.validate_currency_amount(amount, "USD")
            # Should handle gracefully, either accepting or rejecting with clear error
            assert isinstance(is_valid, bool)
            if not is_valid:
                assert error is not None and len(error) > 0

    def test_risk_assessment_with_missing_data(self, financial_validator):
        """Test risk assessment with missing transaction data"""
        incomplete_transactions = [
            {},  # Empty transaction
            {"amount": "100.00"},  # Missing currency
            {"currency": "USD"},  # Missing amount
            {"amount": None, "currency": "USD"},  # None values
        ]
        
        for transaction in incomplete_transactions:
            # Should handle gracefully
            try:
                is_safe, risk_msg, risk_analysis = financial_validator.validate_transaction_risk(transaction)
                assert isinstance(is_safe, bool)
                assert isinstance(risk_analysis, dict)
            except Exception as e:
                # If it raises an exception, should be a clear validation error
                assert isinstance(e, (ValueError, KeyError, TypeError))


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=app.utils.validation_rules.financial_rules"])
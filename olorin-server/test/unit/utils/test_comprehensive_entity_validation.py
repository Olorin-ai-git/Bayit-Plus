#!/usr/bin/env python3
"""
Comprehensive Test Suite for ComprehensiveEntityValidator

Tests all validation scenarios, security checks, performance requirements,
and edge cases for the main entity validation system.

Performance Requirement: All validation operations must complete in <100ms
Security Requirement: Must prevent XSS, SQL injection, and malicious input
Coverage Target: >90% code coverage
"""

import pytest
import time
import ipaddress
from decimal import Decimal, InvalidOperation
from datetime import datetime
from unittest.mock import patch, MagicMock
from typing import Any, Dict, List, Tuple

from app.utils.comprehensive_entity_validation import (
    ComprehensiveEntityValidator,
    ValidationError,
    get_entity_validator,
    validate_entity_field,
    validate_entity_data
)
from app.service.agent.multi_entity.entity_manager import EntityType


class TestComprehensiveEntityValidator:
    """Test the main ComprehensiveEntityValidator class"""

    @pytest.fixture
    def validator(self):
        """Create a fresh validator instance for each test"""
        return ComprehensiveEntityValidator()

    def test_validator_initialization(self, validator):
        """Test validator initializes with all required patterns and rules"""
        # Check patterns are compiled
        assert len(validator.PATTERNS) > 30, "Should have 30+ compiled patterns"
        assert 'email' in validator.PATTERNS
        assert 'phone' in validator.PATTERNS
        assert 'ipv4' in validator.PATTERNS
        assert 'no_script_tags' in validator.PATTERNS
        assert 'no_sql_injection' in validator.PATTERNS
        
        # Check enum values are loaded
        assert len(validator.ENUM_VALUES) > 5
        assert 'currency_code' in validator.ENUM_VALUES
        assert 'USD' in validator.ENUM_VALUES['currency_code']
        
        # Check numeric ranges are defined
        assert len(validator.NUMERIC_RANGES) > 5
        assert 'risk_score' in validator.NUMERIC_RANGES
        assert validator.NUMERIC_RANGES['risk_score'] == (0.0, 1.0)
        
        # Check cache is initialized
        assert hasattr(validator, 'validation_cache')
        assert isinstance(validator.validation_cache, dict)
        assert validator.cache_max_size == 10000

    def test_singleton_validator_instance(self):
        """Test global validator instance is singleton"""
        validator1 = get_entity_validator()
        validator2 = get_entity_validator()
        
        assert validator1 is validator2, "Should return same instance"
        assert isinstance(validator1, ComprehensiveEntityValidator)


class TestEmailValidation:
    """Test email validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_email", [
        "user@example.com",
        "test.email+tag@domain.org",
        "user.name@subdomain.example.com",
        "user_name@example-domain.co.uk",
        "123456@domain.com",
        "a@b.co"
    ])
    def test_validate_email_valid_formats(self, validator, valid_email):
        """Test validation of valid email formats"""
        is_valid, error = validator.validate_entity(EntityType.EMAIL, 'email', valid_email)
        assert is_valid is True, f"Email {valid_email} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_email,expected_error", [
        ("invalid-email", "Invalid email format"),
        ("@domain.com", "Invalid email format"),
        ("user@", "Invalid email format"),
        ("user..name@domain.com", "Invalid email"),
        ("user@domain", "Invalid email format"),
        ("", "Required field cannot be null"),
        ("   ", "Required field cannot be null")
    ])
    def test_validate_email_invalid_formats(self, validator, invalid_email, expected_error):
        """Test validation of invalid email formats"""
        is_valid, error = validator.validate_entity(EntityType.EMAIL, 'email', invalid_email)
        assert is_valid is False, f"Email {invalid_email} should be invalid"
        assert expected_error in error

    def test_email_security_validation(self, validator):
        """Test email validation prevents XSS and injection attacks"""
        malicious_emails = [
            "<script>alert('xss')</script>@domain.com",
            "user+<img src=x onerror=alert(1)>@domain.com",
            "test'; DROP TABLE users; --@domain.com",
            "user@domain.com<script>alert(1)</script>"
        ]
        
        for malicious_email in malicious_emails:
            is_valid, error = validator.validate_entity(EntityType.EMAIL, 'email', malicious_email)
            assert is_valid is False, f"Malicious email should be rejected: {malicious_email}"
            assert "malicious content" in error or "Invalid email" in error

    def test_email_performance_requirement(self, validator):
        """Test email validation completes within 100ms"""
        test_emails = [
            "user@example.com",
            "test.email+tag@domain.org",
            "invalid-email@domain",
            "<script>alert(1)</script>@domain.com"
        ] * 25  # 100 emails total
        
        start_time = time.time()
        for email in test_emails:
            validator.validate_entity(EntityType.EMAIL, 'email', email)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 100, f"Email validation took {execution_time_ms}ms, should be <100ms"


class TestPhoneValidation:
    """Test phone number validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_phone", [
        "+1234567890",
        "+44207946123",
        "+861234567890",
        "1234567890",
        "+15551234567"
    ])
    def test_validate_phone_valid_formats(self, validator, valid_phone):
        """Test validation of valid phone formats"""
        is_valid, error = validator.validate_entity(EntityType.PHONE, 'phone', valid_phone)
        assert is_valid is True, f"Phone {valid_phone} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_phone,expected_error", [
        ("123", "Phone number length must be between 7-15 digits"),
        ("+1234567890123456", "Phone number length must be between 7-15 digits"),
        ("abcdefghij", "Invalid phone number format"),
        ("+0123456789", "Invalid phone number format"),
        ("phone123", "Invalid phone number format")
    ])
    def test_validate_phone_invalid_formats(self, validator, invalid_phone, expected_error):
        """Test validation of invalid phone formats"""
        is_valid, error = validator.validate_entity(EntityType.PHONE, 'phone', invalid_phone)
        assert is_valid is False, f"Phone {invalid_phone} should be invalid"
        assert expected_error in error


class TestIPAddressValidation:
    """Test IP address validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_ip", [
        "192.168.1.1",
        "10.0.0.1", 
        "127.0.0.1",
        "8.8.8.8",
        "2001:db8::1",
        "::1",
        "fe80::1"
    ])
    def test_validate_ip_valid_addresses(self, validator, valid_ip):
        """Test validation of valid IP addresses"""
        is_valid, error = validator.validate_entity(EntityType.IP_ADDRESS, 'ip_address', valid_ip)
        assert is_valid is True, f"IP {valid_ip} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_ip", [
        "256.256.256.256",
        "192.168.1",
        "192.168.1.1.1", 
        "not_an_ip",
        "192.168.1.-1"
    ])
    def test_validate_ip_invalid_addresses(self, validator, invalid_ip):
        """Test validation of invalid IP addresses"""
        is_valid, error = validator.validate_entity(EntityType.IP_ADDRESS, 'ip_address', invalid_ip)
        assert is_valid is False, f"IP {invalid_ip} should be invalid"
        assert "Invalid IP address format" in error


class TestFinancialValidation:
    """Test financial data validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_amount", [
        "0.00",
        "1.23",
        "999999999.99",
        "100",
        "50.5",
        "0.0001"
    ])
    def test_validate_financial_amount_valid(self, validator, valid_amount):
        """Test validation of valid financial amounts"""
        is_valid, error = validator.validate_entity(EntityType.AMOUNT, 'amount', valid_amount)
        assert is_valid is True, f"Amount {valid_amount} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_amount,expected_error", [
        ("-10.50", "Amount cannot be negative"),
        ("1000000000.00", "Amount exceeds maximum limit"),
        ("100.12345", "Too many decimal places"),
        ("not_a_number", "Invalid numeric format"),
        ("", "Required field cannot be null")
    ])
    def test_validate_financial_amount_invalid(self, validator, invalid_amount, expected_error):
        """Test validation of invalid financial amounts"""
        is_valid, error = validator.validate_entity(EntityType.AMOUNT, 'amount', invalid_amount)
        assert is_valid is False, f"Amount {invalid_amount} should be invalid"
        assert expected_error in error

    @pytest.mark.parametrize("valid_currency", ["USD", "EUR", "GBP", "JPY", "CAD"])
    def test_validate_currency_code_valid(self, validator, valid_currency):
        """Test validation of valid currency codes"""
        is_valid, error = validator.validate_entity(EntityType.CURRENCY, 'currency', valid_currency)
        assert is_valid is True, f"Currency {valid_currency} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_currency", ["US", "EURO", "123", "invalid", ""])
    def test_validate_currency_code_invalid(self, validator, invalid_currency):
        """Test validation of invalid currency codes"""
        is_valid, error = validator.validate_entity(EntityType.CURRENCY, 'currency', invalid_currency)
        assert is_valid is False, f"Currency {invalid_currency} should be invalid"
        assert "currency" in error.lower()


class TestTimestampValidation:
    """Test timestamp validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_timestamp", [
        "2024-01-01T00:00:00Z",
        "2024-12-31T23:59:59.123456Z",
        "2024-06-15T12:30:45",
        "1704067200",  # Unix timestamp (seconds)
        "1704067200000"  # Unix timestamp (milliseconds)
    ])
    def test_validate_timestamp_valid_formats(self, validator, valid_timestamp):
        """Test validation of valid timestamp formats"""
        is_valid, error = validator.validate_entity(EntityType.TX_TIMESTAMP, 'timestamp', valid_timestamp)
        assert is_valid is True, f"Timestamp {valid_timestamp} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_timestamp", [
        "not_a_timestamp",
        "2024-13-01T00:00:00Z",  # Invalid month
        "2024-01-32T00:00:00Z",  # Invalid day
        "123",  # Too short
        "12345678901234"  # Out of reasonable range
    ])
    def test_validate_timestamp_invalid_formats(self, validator, invalid_timestamp):
        """Test validation of invalid timestamp formats"""
        is_valid, error = validator.validate_entity(EntityType.TX_TIMESTAMP, 'timestamp', invalid_timestamp)
        assert is_valid is False, f"Timestamp {invalid_timestamp} should be invalid"
        assert "Invalid timestamp format" in error


class TestSecurityValidation:
    """Test security validation prevents XSS and injection attacks"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("xss_payload", [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
        "<iframe src='javascript:alert(1)'></iframe>",
        "<object data='javascript:alert(1)'></object>",
        "vbscript:msgbox(1)",
        "expression(alert(1))"
    ])
    def test_prevent_xss_attacks(self, validator, xss_payload):
        """Test validation prevents XSS attacks"""
        is_valid, error = validator.validate_entity(EntityType.USER, 'user_input', xss_payload)
        assert is_valid is False, f"XSS payload should be rejected: {xss_payload}"
        assert "malicious content" in error

    @pytest.mark.parametrize("sql_payload", [
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM passwords --",
        "admin' OR '1'='1",
        "1; DELETE FROM accounts",
        "' OR 1=1 --",
        "EXEC xp_cmdshell('dir')"
    ])
    def test_prevent_sql_injection(self, validator, sql_payload):
        """Test validation prevents SQL injection attacks"""
        is_valid, error = validator.validate_entity(EntityType.USER, 'user_input', sql_payload)
        assert is_valid is False, f"SQL injection payload should be rejected: {sql_payload}"
        assert "malicious content" in error

    def test_excessive_html_tags_rejected(self, validator):
        """Test that excessive HTML tags are rejected"""
        excessive_html = "<div>" * 10 + "content" + "</div>" * 10
        is_valid, error = validator.validate_entity(EntityType.USER, 'description', excessive_html)
        assert is_valid is False, "Excessive HTML should be rejected"
        assert "malicious content" in error

    def test_safe_content_allowed(self, validator):
        """Test that safe content is allowed"""
        safe_inputs = [
            "John Doe",
            "user@example.com",
            "Valid description with normal text",
            "Numbers 12345",
            "Special chars: !@#$%^&*()"
        ]
        
        for safe_input in safe_inputs:
            is_valid, error = validator.validate_entity(EntityType.USER, 'name', safe_input)
            assert is_valid is True, f"Safe input should be allowed: {safe_input}"
            assert error is None


class TestRiskScoreValidation:
    """Test risk score validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_risk_score", [
        0.0, 0.5, 1.0, 0.25, 0.75, 0.123456
    ])
    def test_validate_risk_score_valid(self, validator, valid_risk_score):
        """Test validation of valid risk scores"""
        is_valid, error = validator.validate_entity(EntityType.RISK_INDICATOR, 'risk_score', valid_risk_score)
        assert is_valid is True, f"Risk score {valid_risk_score} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_risk_score", [
        -0.1, 1.1, 2.0, -1.0, 100, "invalid"
    ])
    def test_validate_risk_score_invalid(self, validator, invalid_risk_score):
        """Test validation of invalid risk scores"""
        is_valid, error = validator.validate_entity(EntityType.RISK_INDICATOR, 'risk_score', invalid_risk_score)
        assert is_valid is False, f"Risk score {invalid_risk_score} should be invalid"
        assert "Risk score must be" in error


class TestBooleanValidation:
    """Test boolean validation functionality"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("valid_boolean", [
        "true", "false", "1", "0", "yes", "no", "y", "n",
        "TRUE", "FALSE", "True", "False"
    ])
    def test_validate_boolean_valid(self, validator, valid_boolean):
        """Test validation of valid boolean values"""
        is_valid, error = validator.validate_entity(EntityType.USER, 'is_active', valid_boolean)
        assert is_valid is True, f"Boolean {valid_boolean} should be valid"
        assert error is None

    @pytest.mark.parametrize("invalid_boolean", [
        "maybe", "perhaps", "2", "-1", "true_false", "invalid"
    ])
    def test_validate_boolean_invalid(self, validator, invalid_boolean):
        """Test validation of invalid boolean values"""
        is_valid, error = validator.validate_entity(EntityType.USER, 'is_active', invalid_boolean)
        assert is_valid is False, f"Boolean {invalid_boolean} should be invalid"
        assert "Invalid boolean value" in error


class TestNullValueValidation:
    """Test null and empty value validation"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    @pytest.mark.parametrize("required_field", [
        "transaction_id", "user_id", "amount", "currency", "timestamp", "email", "payment_method", "merchant_id"
    ])
    def test_required_fields_reject_null(self, validator, required_field):
        """Test that required fields reject null values"""
        for null_value in [None, "", "   ", "\t", "\n"]:
            is_valid, error = validator.validate_entity(EntityType.TRANSACTION, required_field, null_value)
            assert is_valid is False, f"Required field {required_field} should reject null value: {null_value}"
            assert "Required field cannot be null" in error

    def test_optional_fields_allow_null(self, validator):
        """Test that optional fields allow null values"""
        optional_fields = ["description", "notes", "optional_field"]
        
        for field in optional_fields:
            is_valid, error = validator.validate_entity(EntityType.USER, field, None)
            assert is_valid is True, f"Optional field {field} should allow null"
            assert error is None


class TestStringValidation:
    """Test general string validation"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    def test_string_length_limits(self, validator):
        """Test string length validation"""
        # Valid length
        valid_string = "a" * 1000
        is_valid, error = validator.validate_entity(EntityType.USER, 'description', valid_string)
        assert is_valid is True, "String under limit should be valid"
        assert error is None
        
        # Over limit
        over_limit_string = "a" * 10001
        is_valid, error = validator.validate_entity(EntityType.USER, 'description', over_limit_string)
        assert is_valid is False, "String over limit should be invalid"
        assert "String too long" in error

    def test_control_characters_rejected(self, validator):
        """Test that control characters are rejected"""
        control_chars = [
            "text\x00null",
            "text\x01control",
            "text\x02control", 
            "text\x1Fcontrol"
        ]
        
        for text in control_chars:
            is_valid, error = validator.validate_entity(EntityType.USER, 'description', text)
            assert is_valid is False, f"Control character should be rejected: {repr(text)}"
            assert "invalid control characters" in error

    def test_allowed_control_characters(self, validator):
        """Test that allowed control characters pass validation"""
        allowed_chars = [
            "line1\nline2",
            "tab\ttext",
            "carriage\rreturn"
        ]
        
        for text in allowed_chars:
            is_valid, error = validator.validate_entity(EntityType.USER, 'description', text)
            assert is_valid is True, f"Allowed control character should pass: {repr(text)}"
            assert error is None


class TestMultiEntityValidation:
    """Test validation of multiple entities"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    def test_validate_multiple_entities_all_valid(self, validator):
        """Test validation of multiple valid entities"""
        entity_data = {
            EntityType.EMAIL: {'email': 'user@example.com'},
            EntityType.AMOUNT: {'amount': '100.50'},
            EntityType.CURRENCY: {'currency': 'USD'},
            EntityType.IP_ADDRESS: {'ip': '192.168.1.1'}
        }
        
        errors = validator.validate_multiple_entities(entity_data)
        assert len(errors) == 0, "All valid entities should pass validation"

    def test_validate_multiple_entities_mixed_validity(self, validator):
        """Test validation of mixed valid/invalid entities"""
        entity_data = {
            EntityType.EMAIL: {'email': 'invalid-email'},
            EntityType.AMOUNT: {'amount': '100.50'},
            EntityType.CURRENCY: {'currency': 'INVALID'},
            EntityType.IP_ADDRESS: {'ip': '192.168.1.1'}
        }
        
        errors = validator.validate_multiple_entities(entity_data)
        
        # Should have errors for email and currency
        assert len(errors) == 2, "Should have errors for invalid entities"
        assert 'email' in errors
        assert 'currency' in errors
        
        # Check error messages
        assert any('email' in error for error in errors['email'])
        assert any('currency' in error for error in errors['currency'])

    def test_validate_multiple_entities_all_invalid(self, validator):
        """Test validation of all invalid entities"""
        entity_data = {
            EntityType.EMAIL: {'email': 'invalid-email'},
            EntityType.AMOUNT: {'amount': '-100'},
            EntityType.CURRENCY: {'currency': 'INVALID'},
            EntityType.IP_ADDRESS: {'ip': 'not-an-ip'}
        }
        
        errors = validator.validate_multiple_entities(entity_data)
        
        # Should have errors for all entities
        assert len(errors) == 4, "Should have errors for all invalid entities"
        assert all(entity_type in errors for entity_type in ['email', 'amount', 'currency', 'ip_address'])


class TestPerformanceRequirements:
    """Test performance requirements (<100ms validation)"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    def test_single_validation_performance(self, validator):
        """Test single validation completes within performance requirement"""
        test_data = [
            (EntityType.EMAIL, 'email', 'user@example.com'),
            (EntityType.IP_ADDRESS, 'ip', '192.168.1.1'),
            (EntityType.AMOUNT, 'amount', '100.50'),
            (EntityType.CURRENCY, 'currency', 'USD'),
            (EntityType.TX_TIMESTAMP, 'timestamp', '2024-01-01T00:00:00Z')
        ]
        
        for entity_type, field_name, value in test_data:
            start_time = time.time()
            validator.validate_entity(entity_type, field_name, value)
            end_time = time.time()
            
            execution_time_ms = (end_time - start_time) * 1000
            assert execution_time_ms < 100, f"Validation took {execution_time_ms}ms, should be <100ms"

    def test_batch_validation_performance(self, validator):
        """Test batch validation performance with multiple entities"""
        # Create 50 entities to validate
        entity_data = {}
        for i in range(50):
            entity_data[EntityType.EMAIL] = {f'email_{i}': f'user{i}@example.com'}
            entity_data[EntityType.AMOUNT] = {f'amount_{i}': f'{i * 10}.50'}
        
        start_time = time.time()
        validator.validate_multiple_entities(entity_data)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 100, f"Batch validation took {execution_time_ms}ms, should be <100ms"

    def test_validation_caching_improves_performance(self, validator):
        """Test that validation caching improves repeated validation performance"""
        test_value = "user@example.com"
        
        # First validation (cold cache)
        start_time = time.time()
        for _ in range(10):
            validator.validate_entity(EntityType.EMAIL, 'email', test_value)
        cold_time = time.time() - start_time
        
        # Second validation (warm cache) 
        start_time = time.time()
        for _ in range(10):
            validator.validate_entity(EntityType.EMAIL, 'email', test_value)
        warm_time = time.time() - start_time
        
        # Warm cache should be significantly faster (allowing some tolerance for test variance)
        assert warm_time <= cold_time, "Cached validation should not be slower"


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling"""

    @pytest.fixture
    def validator(self):
        return ComprehensiveEntityValidator()

    def test_unicode_handling(self, validator):
        """Test proper handling of Unicode characters"""
        unicode_inputs = [
            "user@exämple.com",  # Accented characters
            "テスト@example.com",  # Japanese
            "пользователь@example.com",  # Cyrillic
            "🙂@example.com"  # Emoji
        ]
        
        for unicode_input in unicode_inputs:
            # Should handle gracefully without crashing
            is_valid, error = validator.validate_entity(EntityType.EMAIL, 'email', unicode_input)
            assert isinstance(is_valid, bool)
            assert error is None or isinstance(error, str)

    def test_very_large_inputs(self, validator):
        """Test handling of very large inputs"""
        very_large_input = "a" * 50000
        
        # Should handle gracefully
        is_valid, error = validator.validate_entity(EntityType.USER, 'description', very_large_input)
        assert is_valid is False, "Very large input should be rejected"
        assert "String too long" in error

    def test_malformed_entity_type(self, validator):
        """Test handling of unexpected entity types"""
        # This tests robustness of the validation system
        try:
            # Using a non-standard entity type should not crash
            result = validator.validate_entity(None, 'field', 'value')
            assert isinstance(result, tuple)
            assert len(result) == 2
        except Exception as e:
            # If it raises an exception, it should be handled gracefully
            assert isinstance(e, (TypeError, AttributeError, ValidationError))

    def test_validation_statistics(self, validator):
        """Test validation statistics reporting"""
        stats = validator.get_validation_stats()
        
        # Check required statistics fields
        required_fields = [
            'cache_size', 'cache_max_size', 'patterns_loaded', 
            'enum_categories', 'numeric_ranges'
        ]
        
        for field in required_fields:
            assert field in stats, f"Missing statistics field: {field}"
            assert isinstance(stats[field], int), f"Statistics field {field} should be integer"
        
        # Check reasonable values
        assert stats['patterns_loaded'] > 20, "Should have loaded many patterns"
        assert stats['enum_categories'] > 5, "Should have multiple enum categories"
        assert stats['cache_max_size'] == 10000, "Cache max size should be 10000"


class TestConvenienceFunctions:
    """Test convenience functions"""

    def test_validate_entity_field_function(self):
        """Test convenience function for single field validation"""
        is_valid, error = validate_entity_field(EntityType.EMAIL, 'email', 'user@example.com')
        assert is_valid is True
        assert error is None

    def test_validate_entity_data_function(self):
        """Test convenience function for multiple entity validation"""
        entity_data = {
            EntityType.EMAIL: {'email': 'user@example.com'},
            EntityType.AMOUNT: {'amount': '100.50'}
        }
        
        errors = validate_entity_data(entity_data)
        assert len(errors) == 0, "Valid data should not have errors"

    def test_global_validator_consistency(self):
        """Test that global validator instance is consistent"""
        validator1 = get_entity_validator()
        validator2 = get_entity_validator()
        
        # Should be the same instance
        assert validator1 is validator2
        
        # Test some validation with global instance
        is_valid, error = validate_entity_field(EntityType.EMAIL, 'email', 'test@example.com')
        assert is_valid is True
        assert error is None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=app.utils.comprehensive_entity_validation"])
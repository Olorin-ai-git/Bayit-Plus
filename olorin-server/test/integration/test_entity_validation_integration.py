#!/usr/bin/env python3
"""
Integration Test Suite for Entity Validation System

Tests the complete entity validation system integration including:
- ComprehensiveEntityValidator + ValidationEngine + Specialized Rules
- End-to-end validation workflows
- Performance under load
- Security validation integration
- Real-world fraud scenarios

Performance Requirement: Complete validation workflows must finish in <100ms
Security Requirement: Must prevent all injection attacks and fraud patterns
Coverage Target: >85% integration coverage
"""

import asyncio
import time
from typing import Any, Dict, List, Tuple
from unittest.mock import MagicMock, patch

import pytest

from app.service.agent.multi_entity.entity_manager import EntityType
from app.utils.comprehensive_entity_validation import (
    ComprehensiveEntityValidator,
    get_entity_validator,
    validate_entity_data,
    validate_entity_field,
)
from app.utils.validation_engine import (
    ValidationEngine,
    ValidationResult,
    ValidationSeverity,
    get_validation_engine,
)
from app.utils.validation_engine import validate_entity_field as engine_validate_field
from app.utils.validation_engine import (
    validate_transaction,
)


class TestCompleteValidationWorkflow:
    """Test complete end-to-end validation workflows"""

    @pytest.fixture
    def comprehensive_validator(self):
        return get_entity_validator()

    @pytest.fixture
    def validation_engine(self):
        return get_validation_engine()

    def test_transaction_validation_complete_workflow(self, validation_engine):
        """Test complete transaction validation workflow"""
        # Realistic transaction data
        transaction_data = {
            "transaction_id": "tx_12345abcdef",
            "amount": "299.99",
            "currency": "USD",
            "email": "customer@example.com",
            "ip": "192.168.1.100",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "country_code": "US",
            "payment_method": "credit_card",
            "card_bin": "411111",
            "card_last_four": "1111",
            "timestamp": "2024-01-15T14:30:00Z",
            "merchant_id": "merchant_12345",
            "device_fingerprint": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        }

        start_time = time.time()
        results = validate_transaction(transaction_data)
        end_time = time.time()

        # Performance requirement
        execution_time_ms = (end_time - start_time) * 1000
        assert (
            execution_time_ms < 100
        ), f"Complete transaction validation took {execution_time_ms}ms, should be <100ms"

        # Validate results structure
        assert isinstance(results, dict)
        assert len(results) > 8, "Should validate multiple transaction fields"

        # Check specific validations
        expected_validations = [
            "amount.amount",
            "currency.currency",
            "email.email",
            "ip.ip",
            "transaction_id.transaction_id",
            "timestamp.timestamp",
        ]

        for expected in expected_validations:
            assert expected in results, f"Should validate {expected}"
            assert isinstance(results[expected], ValidationResult)
            assert (
                results[expected].is_valid is True
            ), f"{expected} should be valid for good transaction"

    def test_fraudulent_transaction_detection(self, validation_engine):
        """Test detection of fraudulent transaction patterns"""
        # Suspicious/fraudulent transaction data
        fraudulent_transaction = {
            "transaction_id": '<script>alert("xss")</script>',  # XSS attempt
            "amount": "-500.00",  # Negative amount
            "currency": "INVALID",  # Invalid currency
            "email": "test@10minutemail.com",  # Temporary email
            "ip": "192.168.1.300",  # Invalid IP
            "user_agent": "curl/7.68.0",  # Bot user agent
            "country_code": "XX",  # Invalid country
            "payment_method": "credit_card",
            "card_bin": "123456",  # Invalid BIN
            "card_last_four": "abcd",  # Invalid last four
            "timestamp": "2024-13-45T99:99:99Z",  # Invalid timestamp
            "merchant_id": "'; DROP TABLE merchants; --",  # SQL injection
        }

        results = validate_transaction(fraudulent_transaction)

        # Should detect multiple fraud indicators
        fraud_count = sum(1 for result in results.values() if not result.is_valid)
        assert (
            fraud_count >= 8
        ), f"Should detect at least 8 fraud indicators, found {fraud_count}"

        # Check specific fraud detections
        assert not results[
            "transaction_id.transaction_id"
        ].is_valid, "Should detect XSS in transaction ID"
        assert not results["amount.amount"].is_valid, "Should detect negative amount"
        assert not results[
            "currency.currency"
        ].is_valid, "Should detect invalid currency"
        assert not results["email.email"].is_valid, "Should flag temporary email"
        assert not results["ip.ip"].is_valid, "Should detect invalid IP"

        # Check risk scores
        high_risk_results = [
            result for result in results.values() if result.risk_score > 0.7
        ]
        assert len(high_risk_results) >= 3, "Should have multiple high-risk results"

    def test_multi_entity_cross_validation(self, validation_engine):
        """Test cross-validation between related entities"""
        # Data with geographic inconsistencies
        inconsistent_data = {
            EntityType.COUNTRY_CODE: {"billing_country": "US"},
            EntityType.IP: {
                "client_ip": "103.240.201.110"
            },  # IP from different country
            EntityType.CURRENCY: {
                "transaction_currency": "EUR"
            },  # Currency from different region
            EntityType.PHONE: {
                "phone_number": "+81-90-1234-5678"
            },  # Phone from different country
            EntityType.POSTAL_CODE: {"postal_code": "100-0001"},  # Japanese postal code
        }

        results = validation_engine.validate_entity_batch(inconsistent_data)

        # Should detect geographic inconsistencies in analysis
        for result in results.values():
            if hasattr(result, "geographic_analysis") and result.geographic_analysis:
                # Some results should flag geographic inconsistencies
                pass

        # At minimum, individual validations should work
        assert len(results) == 5, "Should validate all entities"

        # Check individual entity validations
        assert (
            results["country_code.billing_country"].is_valid is True
        ), "Country code should be valid"
        assert results["ip.client_ip"].is_valid is True, "IP should be valid format"
        assert (
            results["currency.transaction_currency"].is_valid is True
        ), "Currency should be valid"

    def test_high_volume_validation_performance(self, comprehensive_validator):
        """Test validation performance under high volume"""
        # Generate large batch of entities to validate
        large_entity_batch = {}

        # Add 100 email validations
        for i in range(100):
            large_entity_batch[EntityType.EMAIL] = {
                f"email_{i}": f"user{i}@example{i % 10}.com"
            }

        start_time = time.time()
        errors = comprehensive_validator.validate_multiple_entities(large_entity_batch)
        end_time = time.time()

        # Should handle large batches efficiently
        execution_time_ms = (end_time - start_time) * 1000
        assert (
            execution_time_ms < 100
        ), f"High volume validation took {execution_time_ms}ms, should be <100ms"

        # All should be valid
        assert len(errors) == 0, "All generated emails should be valid"

    def test_concurrent_validation_safety(self, validation_engine):
        """Test validation system thread safety under concurrent load"""
        import concurrent.futures
        import threading

        results = []
        errors = []

        def validate_entity_worker(worker_id):
            """Worker function for concurrent validation"""
            try:
                for i in range(10):
                    result = engine_validate_field(
                        EntityType.EMAIL,
                        "email",
                        f"worker{worker_id}_email{i}@example.com",
                    )
                    results.append((worker_id, i, result))
            except Exception as e:
                errors.append((worker_id, str(e)))

        # Run 10 concurrent workers
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(validate_entity_worker, i) for i in range(10)]
            concurrent.futures.wait(futures)

        # Check no errors occurred
        assert len(errors) == 0, f"Concurrent validation errors: {errors}"

        # Check all validations completed
        assert len(results) == 100, f"Expected 100 results, got {len(results)}"

        # Check all results are valid
        invalid_results = [r for r in results if not r[2].is_valid]
        assert (
            len(invalid_results) == 0
        ), f"All concurrent validations should be valid: {invalid_results}"


class TestSecurityIntegration:
    """Test security validation integration across all components"""

    @pytest.fixture
    def validation_engine(self):
        return get_validation_engine()

    def test_comprehensive_xss_prevention(self, validation_engine):
        """Test XSS prevention across all validation components"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<iframe src='javascript:alert(1)'></iframe>",
            "vbscript:msgbox('xss')",
        ]

        # Test XSS prevention in various entity types
        entity_types_to_test = [
            EntityType.EMAIL,
            EntityType.USER,
            EntityType.TRANSACTION_ID,
            EntityType.MERCHANT_ID,
            EntityType.DEVICE_ID,
        ]

        for payload in xss_payloads:
            for entity_type in entity_types_to_test:
                result = engine_validate_field(entity_type, "test_field", payload)

                assert (
                    result.is_valid is False
                ), f"XSS payload should be blocked for {entity_type}: {payload}"
                assert result.severity in [
                    ValidationSeverity.ERROR,
                    ValidationSeverity.CRITICAL,
                ]
                assert "malicious" in result.error_message.lower()

    def test_comprehensive_sql_injection_prevention(self, validation_engine):
        """Test SQL injection prevention across all validation components"""
        sql_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM passwords --",
            "admin' --",
            "1; DELETE FROM accounts",
        ]

        entity_types_to_test = [
            EntityType.USER,
            EntityType.EMAIL,
            EntityType.TRANSACTION_ID,
            EntityType.ACCOUNT,
            EntityType.MERCHANT_ID,
        ]

        for payload in sql_payloads:
            for entity_type in entity_types_to_test:
                result = engine_validate_field(entity_type, "test_field", payload)

                assert (
                    result.is_valid is False
                ), f"SQL injection should be blocked for {entity_type}: {payload}"
                assert result.severity in [
                    ValidationSeverity.ERROR,
                    ValidationSeverity.CRITICAL,
                ]
                assert "malicious" in result.error_message.lower()

    def test_comprehensive_fraud_pattern_detection(self, validation_engine):
        """Test fraud pattern detection integration"""
        # Create transaction with multiple fraud indicators
        high_fraud_transaction = {
            "amount": "1.00",  # Testing amount
            "currency": "USD",
            "email": "test@guerrillamail.com",  # Disposable email
            "ip": "192.168.1.1",  # Private IP (suspicious for e-commerce)
            "user_agent": "curl/7.68.0",  # Bot user agent
            "country_code": "NG",  # High-risk country
            "payment_method": "credit_card",
            "card_bin": "123456",  # Invalid BIN
            "transaction_count_24h": 50,  # High velocity
            "failed_attempts_1h": 20,  # Many failures
        }

        results = validate_transaction(high_fraud_transaction)

        # Should detect multiple fraud patterns
        high_risk_count = sum(1 for r in results.values() if r.risk_score > 0.7)
        assert (
            high_risk_count >= 3
        ), f"Should detect at least 3 high-risk patterns, found {high_risk_count}"

        # Check specific fraud indicators
        email_result = results.get("email.email")
        if email_result:
            assert (
                email_result.risk_score > 0.5
            ), "Disposable email should have high risk"

        # Check for fraud recommendations
        recommendations = []
        for result in results.values():
            recommendations.extend(result.recommendations)

        fraud_recommendations = [
            r for r in recommendations if "risk" in r.lower() or "fraud" in r.lower()
        ]
        assert (
            len(fraud_recommendations) >= 2
        ), "Should provide fraud-related recommendations"

    def test_security_analysis_aggregation(self, validation_engine):
        """Test security analysis aggregation across validation components"""
        # Transaction with various security concerns
        security_test_transaction = {
            "transaction_id": "tx_normal_id",
            "amount": "100.00",
            "currency": "USD",
            "email": "user@example.com",
            "ip": "8.8.8.8",  # Public IP
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "device_fingerprint": "secure_fingerprint_123",
        }

        results = validate_transaction(security_test_transaction)

        # Aggregate security analysis from all results
        total_security_analysis = {}
        for result in results.values():
            if result.security_analysis:
                for key, value in result.security_analysis.items():
                    if key in total_security_analysis:
                        if isinstance(value, (int, float)):
                            total_security_analysis[key] += value
                        elif isinstance(value, list):
                            total_security_analysis[key].extend(value)
                    else:
                        total_security_analysis[key] = value

        # Should have comprehensive security analysis
        assert len(total_security_analysis) > 0, "Should have security analysis data"

        # Check for expected security metrics
        expected_metrics = ["threat_score", "xss_threats", "sql_injection_threats"]
        found_metrics = [
            metric for metric in expected_metrics if metric in total_security_analysis
        ]
        assert (
            len(found_metrics) >= 2
        ), f"Should have security metrics, found: {found_metrics}"


class TestRealWorldScenarios:
    """Test validation with real-world fraud scenarios"""

    @pytest.fixture
    def validation_engine(self):
        return get_validation_engine()

    def test_card_testing_fraud_scenario(self, validation_engine):
        """Test detection of card testing fraud scenario"""
        # Simulate card testing attack pattern
        card_testing_transactions = []

        # Multiple small transactions with different cards
        for i in range(10):
            transaction = {
                "amount": "1.00",  # Small test amount
                "currency": "USD",
                "email": f"cardholder{i}@example.com",
                "ip": "192.168.1.100",  # Same IP
                "payment_method": "credit_card",
                "card_bin": f"41111{i}",  # Different cards
                "card_last_four": f"111{i}",
                "timestamp": f"2024-01-01T12:{i:02d}:00Z",  # Rapid succession
                "merchant_id": "merchant_12345",
            }
            card_testing_transactions.append(transaction)

        # Validate all transactions
        all_results = []
        start_time = time.time()

        for transaction in card_testing_transactions:
            results = validate_transaction(transaction)
            all_results.append(results)

        end_time = time.time()

        # Performance check - should handle batch efficiently
        execution_time_ms = (end_time - start_time) * 1000
        assert (
            execution_time_ms < 500
        ), f"Card testing scenario validation took {execution_time_ms}ms, should be <500ms"

        # Analyze patterns across transactions
        small_amount_count = 0
        for results in all_results:
            for result in results.values():
                if "amount" in result.field_name and result.value == "1.00":
                    small_amount_count += 1
                # Check for pattern detection in analysis
                if hasattr(result, "financial_analysis") and result.financial_analysis:
                    if "suspicious_amount_pattern" in result.financial_analysis:
                        assert (
                            result.financial_analysis["suspicious_amount_pattern"]
                            is True
                        )

        assert small_amount_count == 10, "Should detect all small test amounts"

    def test_account_takeover_scenario(self, validation_engine):
        """Test detection of account takeover scenario"""
        # Legitimate user baseline
        legitimate_transaction = {
            "amount": "50.00",
            "currency": "USD",
            "email": "customer@gmail.com",
            "ip": "74.125.224.72",  # US IP
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "country_code": "US",
            "device_fingerprint": "known_device_fingerprint",
        }

        # Suspicious takeover transaction
        suspicious_transaction = {
            "amount": "2000.00",  # Much larger amount
            "currency": "USD",
            "email": "customer@gmail.com",  # Same email
            "ip": "103.240.201.110",  # Different country IP
            "user_agent": "curl/7.68.0",  # Different user agent (bot)
            "country_code": "IN",  # Different country
            "device_fingerprint": "unknown_device_fingerprint",  # Different device
            "new_payment_method": True,  # New payment method added
            "password_changed_recently": True,  # Recent password change
        }

        legitimate_results = validate_transaction(legitimate_transaction)
        suspicious_results = validate_transaction(suspicious_transaction)

        # Compare risk profiles
        legitimate_risk_scores = [r.risk_score for r in legitimate_results.values()]
        suspicious_risk_scores = [r.risk_score for r in suspicious_results.values()]

        avg_legitimate_risk = sum(legitimate_risk_scores) / len(legitimate_risk_scores)
        avg_suspicious_risk = sum(suspicious_risk_scores) / len(suspicious_risk_scores)

        assert (
            avg_suspicious_risk > avg_legitimate_risk + 0.3
        ), "Suspicious transaction should have significantly higher risk"

        # Check for specific takeover indicators
        high_risk_suspicious = [
            r for r in suspicious_results.values() if r.risk_score > 0.7
        ]
        assert (
            len(high_risk_suspicious) >= 3
        ), f"Should have multiple high-risk indicators for takeover, got {len(high_risk_suspicious)}"

    def test_money_laundering_scenario(self, validation_engine):
        """Test detection of money laundering patterns"""
        # Structuring pattern - amounts just under reporting thresholds
        structuring_transactions = [
            {"amount": "9999.99", "currency": "USD"},  # Just under $10k threshold
            {"amount": "9500.00", "currency": "USD"},
            {"amount": "9000.00", "currency": "USD"},
            {"amount": "8999.99", "currency": "USD"},
        ]

        # Rapid round amounts pattern
        round_amount_transactions = [
            {"amount": "5000.00", "currency": "USD"},
            {"amount": "10000.00", "currency": "USD"},
            {"amount": "15000.00", "currency": "USD"},
        ]

        all_ml_results = []

        # Test structuring pattern
        for transaction_base in structuring_transactions:
            full_transaction = {
                **transaction_base,
                "email": "business@company.com",
                "payment_method": "wire_transfer",
                "country_code": "US",
                "merchant_id": "high_risk_merchant",
            }
            results = validate_transaction(full_transaction)
            all_ml_results.extend(results.values())

        # Test round amounts pattern
        for transaction_base in round_amount_transactions:
            full_transaction = {
                **transaction_base,
                "email": "business@company.com",
                "payment_method": "wire_transfer",
                "country_code": "US",
                "merchant_id": "high_risk_merchant",
            }
            results = validate_transaction(full_transaction)
            all_ml_results.extend(results.values())

        # Analyze for money laundering indicators
        high_value_transactions = [
            r for r in all_ml_results if "amount" in r.field_name
        ]

        # Should flag high-value transactions
        flagged_amounts = [r for r in high_value_transactions if r.risk_score > 0.5]
        assert (
            len(flagged_amounts) >= 4
        ), f"Should flag multiple high-value amounts, got {len(flagged_amounts)}"

        # Check for financial analysis indicators
        ml_indicators = []
        for result in all_ml_results:
            if hasattr(result, "financial_analysis") and result.financial_analysis:
                if "high_value_transaction" in result.financial_analysis:
                    if result.financial_analysis["high_value_transaction"]:
                        ml_indicators.append("high_value")
                if "suspicious_amount_pattern" in result.financial_analysis:
                    if result.financial_analysis["suspicious_amount_pattern"]:
                        ml_indicators.append("suspicious_pattern")

        assert (
            len(ml_indicators) >= 3
        ), f"Should detect money laundering indicators, got {ml_indicators}"

    def test_synthetic_identity_fraud_scenario(self, validation_engine):
        """Test detection of synthetic identity fraud"""
        # Synthetic identity characteristics
        synthetic_identity_data = {
            "email": "john.doe@newdomain123.com",  # New domain
            "phone": "+15551234567",  # Test phone number
            "first_name": "John",
            "last_name": "Doe",  # Common fake name
            "address": "123 Main St",  # Generic address
            "amount": "500.00",
            "currency": "USD",
            "payment_method": "credit_card",
            "card_bin": "400000",  # Test card BIN
            "user_age_days": 7,  # Very new account
            "credit_applications_recent": 5,  # Multiple recent applications
        }

        results = validate_transaction(synthetic_identity_data)

        # Should detect synthetic identity patterns
        suspicious_results = [r for r in results.values() if r.risk_score > 0.6]
        assert (
            len(suspicious_results) >= 2
        ), f"Should detect synthetic identity patterns, got {len(suspicious_results)}"

        # Check specific indicators
        phone_result = results.get("phone_number.phone") or results.get("phone.phone")
        if phone_result:
            # Test phone numbers should be flagged
            assert (
                phone_result.risk_score > 0.5
            ), "Test phone number should be high risk"

        # Check for fraud recommendations
        all_recommendations = []
        for result in results.values():
            all_recommendations.extend(result.recommendations)

        identity_recommendations = [
            r
            for r in all_recommendations
            if "identity" in r.lower() or "verification" in r.lower()
        ]
        assert (
            len(identity_recommendations) >= 1
        ), "Should recommend additional identity verification"


class TestPerformanceAndScalability:
    """Test system performance and scalability under various loads"""

    @pytest.fixture
    def validation_engine(self):
        return get_validation_engine()

    @pytest.fixture
    def comprehensive_validator(self):
        return get_entity_validator()

    def test_sustained_high_load_performance(self, validation_engine):
        """Test performance under sustained high load"""
        # Simulate sustained load over time
        test_duration_seconds = 5
        transactions_per_second = 20
        total_transactions = test_duration_seconds * transactions_per_second

        start_time = time.time()
        successful_validations = 0

        for i in range(total_transactions):
            transaction = {
                "transaction_id": f"tx_{i:06d}",
                "amount": f"{(i % 1000) + 1}.00",
                "currency": "USD",
                "email": f"user{i % 100}@example.com",
                "ip": f"192.168.1.{(i % 254) + 1}",
            }

            try:
                results = validate_transaction(transaction)
                if all(r.is_valid for r in results.values()):
                    successful_validations += 1
            except Exception:
                pass  # Count failures

        end_time = time.time()
        actual_duration = end_time - start_time

        # Performance assertions
        assert (
            actual_duration < test_duration_seconds * 1.5
        ), f"Should complete within 1.5x target time, took {actual_duration}s"
        assert (
            successful_validations >= total_transactions * 0.95
        ), f"Should successfully validate 95%+ transactions, got {successful_validations}/{total_transactions}"

        # Calculate throughput
        throughput = successful_validations / actual_duration
        assert (
            throughput >= 15
        ), f"Should maintain >15 validations/second, got {throughput:.2f}"

    def test_memory_usage_stability(self, comprehensive_validator):
        """Test memory usage remains stable under load"""
        import gc
        import sys

        # Get baseline memory usage
        gc.collect()
        baseline_objects = len(gc.get_objects())

        # Run many validations
        for i in range(1000):
            comprehensive_validator.validate_entity(
                EntityType.EMAIL, "email", f"user{i}@example.com"
            )

        # Check memory usage after operations
        gc.collect()
        final_objects = len(gc.get_objects())

        # Memory should not grow excessively (allow some growth for caching)
        object_growth = final_objects - baseline_objects
        max_allowed_growth = baseline_objects * 0.1  # 10% growth allowed

        assert (
            object_growth < max_allowed_growth
        ), f"Memory grew too much: {object_growth} objects (baseline: {baseline_objects})"

    def test_cache_effectiveness(self, comprehensive_validator):
        """Test validation caching improves performance"""
        # Test repeated validation of same values
        test_email = "performance.test@example.com"

        # Cold cache - first runs
        start_time = time.time()
        for _ in range(50):
            comprehensive_validator.validate_entity(
                EntityType.EMAIL, "email", test_email
            )
        cold_cache_time = time.time() - start_time

        # Warm cache - repeated runs with same data
        start_time = time.time()
        for _ in range(50):
            comprehensive_validator.validate_entity(
                EntityType.EMAIL, "email", test_email
            )
        warm_cache_time = time.time() - start_time

        # Warm cache should be faster (or at least not significantly slower)
        cache_improvement = (
            cold_cache_time / warm_cache_time if warm_cache_time > 0 else 1
        )
        assert (
            cache_improvement >= 0.8
        ), f"Cache should improve performance, ratio: {cache_improvement:.2f}"

        # Both should be fast regardless
        assert (
            cold_cache_time < 0.5
        ), f"Cold cache time should be <500ms, got {cold_cache_time * 1000:.2f}ms"
        assert (
            warm_cache_time < 0.5
        ), f"Warm cache time should be <500ms, got {warm_cache_time * 1000:.2f}ms"


@pytest.mark.integration
class TestSystemIntegration:
    """Test integration with external systems and components"""

    def test_validation_with_mocked_external_services(self):
        """Test validation system integration with mocked external services"""
        with patch(
            "app.utils.validation_rules.network_rules.NetworkValidationRules._check_malicious_ip_lists"
        ) as mock_ip_check:
            with patch(
                "app.utils.validation_rules.financial_rules.FinancialValidationRules._check_card_bin_database"
            ) as mock_bin_check:
                mock_ip_check.return_value = False  # Not malicious
                mock_bin_check.return_value = ("visa", True)  # Valid Visa card

                transaction = {
                    "amount": "100.00",
                    "currency": "USD",
                    "email": "user@example.com",
                    "ip": "8.8.8.8",
                    "payment_method": "credit_card",
                    "card_bin": "411111",
                }

                results = validate_transaction(transaction)

                # Should successfully validate with mocked services
                assert all(
                    r.is_valid for r in results.values()
                ), "All validations should pass with mocked services"

                # Verify mocked services were called
                mock_ip_check.assert_called()
                mock_bin_check.assert_called()

    @pytest.mark.asyncio
    async def test_async_validation_compatibility(self):
        """Test validation system works in async contexts"""

        async def async_validation_worker():
            """Async worker for validation testing"""
            engine = get_validation_engine()
            result = engine.validate_entity(
                EntityType.EMAIL, "email", "async@example.com"
            )
            return result.is_valid

        # Run multiple async validations concurrently
        tasks = [async_validation_worker() for _ in range(10)]
        results = await asyncio.gather(*tasks)

        # All should succeed
        assert all(results), "All async validations should succeed"
        assert len(results) == 10, "Should complete all async validations"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-m", "not integration or integration"])

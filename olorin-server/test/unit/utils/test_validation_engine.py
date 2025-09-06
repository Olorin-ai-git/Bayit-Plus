#!/usr/bin/env python3
"""
Comprehensive Test Suite for ValidationEngine

Tests the master validation engine orchestrator that coordinates all specialized 
validation rules and provides comprehensive analysis.

Performance Requirement: All validation operations must complete in <100ms
Security Requirement: Must integrate all security validation checks
Coverage Target: >90% code coverage
"""

import pytest
import time
from unittest.mock import patch, MagicMock, Mock
from typing import Any, Dict, List

from app.utils.validation_engine import (
    ValidationEngine,
    ValidationResult,
    ValidationSeverity,
    get_validation_engine,
    validate_entity_field,
    validate_transaction
)
from app.service.agent.multi_entity.entity_manager import EntityType


class TestValidationResult:
    """Test ValidationResult data structure"""

    def test_validation_result_initialization(self):
        """Test ValidationResult initializes with correct defaults"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        
        # Check basic fields
        assert result.entity_type == EntityType.EMAIL
        assert result.field_name == 'email'
        assert result.value == 'user@example.com'
        assert result.is_valid is True
        assert result.severity == ValidationSeverity.INFO
        assert result.error_message is None
        assert isinstance(result.warnings, list)
        assert len(result.warnings) == 0
        assert isinstance(result.recommendations, list)
        assert len(result.recommendations) == 0
        assert result.risk_score == 0.0
        
        # Check analysis dictionaries
        assert isinstance(result.security_analysis, dict)
        assert isinstance(result.financial_analysis, dict)
        assert isinstance(result.geographic_analysis, dict)
        assert isinstance(result.temporal_analysis, dict)
        assert isinstance(result.network_analysis, dict)

    def test_validation_result_add_error(self):
        """Test adding errors to validation result"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'invalid')
        
        result.add_error("Invalid format", ValidationSeverity.ERROR)
        
        assert result.is_valid is False
        assert result.error_message == "Invalid format"
        assert result.severity == ValidationSeverity.ERROR

    def test_validation_result_add_warning(self):
        """Test adding warnings to validation result"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        
        result.add_warning("Suspicious domain")
        result.add_warning("High risk country")
        
        assert len(result.warnings) == 2
        assert "Suspicious domain" in result.warnings
        assert "High risk country" in result.warnings

    def test_validation_result_add_recommendation(self):
        """Test adding recommendations to validation result"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        
        result.add_recommendation("Enable 2FA")
        result.add_recommendation("Monitor account activity")
        
        assert len(result.recommendations) == 2
        assert "Enable 2FA" in result.recommendations
        assert "Monitor account activity" in result.recommendations

    def test_validation_result_to_dict(self):
        """Test converting validation result to dictionary"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.add_error("Test error", ValidationSeverity.WARNING)
        result.add_warning("Test warning")
        result.add_recommendation("Test recommendation")
        result.risk_score = 0.75
        result.security_analysis = {'threat_level': 'medium'}
        result.financial_analysis = {'suspicious_amount': False}
        
        result_dict = result.to_dict()
        
        # Check structure
        required_keys = [
            'entity_type', 'field_name', 'value', 'is_valid', 'severity',
            'error_message', 'warnings', 'risk_score', 'analysis', 'recommendations'
        ]
        for key in required_keys:
            assert key in result_dict, f"Missing key: {key}"
        
        # Check values
        assert result_dict['entity_type'] == 'email'
        assert result_dict['field_name'] == 'email'
        assert result_dict['value'] == 'user@example.com'
        assert result_dict['is_valid'] is False
        assert result_dict['severity'] == 'warning'
        assert result_dict['error_message'] == 'Test error'
        assert result_dict['warnings'] == ['Test warning']
        assert result_dict['risk_score'] == 0.75
        assert result_dict['recommendations'] == ['Test recommendation']
        
        # Check analysis structure
        analysis = result_dict['analysis']
        assert 'security' in analysis
        assert 'financial' in analysis
        assert 'geographic' in analysis
        assert 'temporal' in analysis
        assert 'network' in analysis


class TestValidationEngine:
    """Test the main ValidationEngine class"""

    @pytest.fixture
    def engine(self):
        """Create a fresh validation engine for each test"""
        return ValidationEngine()

    def test_validation_engine_initialization(self, engine):
        """Test validation engine initializes with all components"""
        # Check all validators are initialized
        assert hasattr(engine, 'comprehensive_validator')
        assert hasattr(engine, 'financial_validator')
        assert hasattr(engine, 'security_validator')
        assert hasattr(engine, 'geographic_validator')
        assert hasattr(engine, 'temporal_validator')
        assert hasattr(engine, 'network_validator')
        
        # Check entity validator mapping is built
        assert hasattr(engine, 'entity_validator_mapping')
        assert isinstance(engine.entity_validator_mapping, dict)
        assert len(engine.entity_validator_mapping) > 0

    def test_singleton_validation_engine(self):
        """Test global validation engine instance is singleton"""
        engine1 = get_validation_engine()
        engine2 = get_validation_engine()
        
        assert engine1 is engine2, "Should return same instance"
        assert isinstance(engine1, ValidationEngine)

    def test_entity_validator_mapping_structure(self, engine):
        """Test entity validator mapping has correct structure"""
        mapping = engine.entity_validator_mapping
        
        # Check some expected mappings
        assert EntityType.AMOUNT in mapping
        assert 'financial' in mapping[EntityType.AMOUNT]
        assert 'security' in mapping[EntityType.AMOUNT]
        
        assert EntityType.IP_ADDRESS in mapping
        assert 'network' in mapping[EntityType.IP_ADDRESS]
        assert 'security' in mapping[EntityType.IP_ADDRESS]
        
        assert EntityType.EMAIL in mapping
        assert 'security' in mapping[EntityType.EMAIL]


class TestSingleEntityValidation:
    """Test single entity validation functionality"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    def test_validate_entity_valid_input(self, engine):
        """Test validation of valid entity input"""
        result = engine.validate_entity(EntityType.EMAIL, 'email', 'user@example.com')
        
        assert isinstance(result, ValidationResult)
        assert result.entity_type == EntityType.EMAIL
        assert result.field_name == 'email'
        assert result.value == 'user@example.com'
        assert result.is_valid is True
        assert result.error_message is None
        assert isinstance(result.risk_score, float)
        assert 0.0 <= result.risk_score <= 1.0

    def test_validate_entity_invalid_input(self, engine):
        """Test validation of invalid entity input"""
        result = engine.validate_entity(EntityType.EMAIL, 'email', 'invalid-email')
        
        assert isinstance(result, ValidationResult)
        assert result.is_valid is False
        assert result.error_message is not None
        assert 'email' in result.error_message.lower()

    @patch('app.utils.validation_engine.ValidationEngine._apply_specialized_validation')
    def test_validate_entity_calls_specialized_validation(self, mock_specialized, engine):
        """Test that entity validation calls specialized validation"""
        mock_specialized.return_value = None
        
        result = engine.validate_entity(EntityType.EMAIL, 'email', 'user@example.com')
        
        mock_specialized.assert_called_once()
        args = mock_specialized.call_args[0]
        assert isinstance(args[0], ValidationResult)
        assert args[1] is None  # context

    def test_validate_entity_with_context(self, engine):
        """Test entity validation with additional context"""
        context = {'user_id': '12345', 'country': 'US'}
        
        result = engine.validate_entity(EntityType.EMAIL, 'email', 'user@example.com', context)
        
        assert isinstance(result, ValidationResult)
        assert result.entity_type == EntityType.EMAIL

    def test_validate_entity_exception_handling(self, engine):
        """Test validation handles exceptions gracefully"""
        # Patch comprehensive validator to raise exception
        with patch.object(engine.comprehensive_validator, 'validate_entity') as mock_validate:
            mock_validate.side_effect = Exception("Test exception")
            
            result = engine.validate_entity(EntityType.EMAIL, 'email', 'user@example.com')
            
            assert result.is_valid is False
            assert result.severity == ValidationSeverity.CRITICAL
            assert "Validation engine error" in result.error_message

    def test_validate_entity_performance_requirement(self, engine):
        """Test single entity validation meets performance requirement"""
        start_time = time.time()
        
        # Run multiple validations
        for _ in range(10):
            engine.validate_entity(EntityType.EMAIL, 'email', 'user@example.com')
        
        end_time = time.time()
        execution_time_ms = (end_time - start_time) * 1000
        
        # Should complete within 100ms total
        assert execution_time_ms < 100, f"Validation took {execution_time_ms}ms, should be <100ms"


class TestBatchEntityValidation:
    """Test batch entity validation functionality"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    def test_validate_entity_batch_all_valid(self, engine):
        """Test batch validation with all valid entities"""
        entity_data = {
            EntityType.EMAIL: {'email': 'user@example.com'},
            EntityType.AMOUNT: {'amount': '100.50'},
            EntityType.CURRENCY: {'currency': 'USD'}
        }
        
        results = engine.validate_entity_batch(entity_data)
        
        # Check structure
        assert isinstance(results, dict)
        assert len(results) == 3
        
        # Check all results are valid
        for key, result in results.items():
            assert isinstance(result, ValidationResult)
            assert result.is_valid is True, f"Result {key} should be valid"

    def test_validate_entity_batch_mixed_validity(self, engine):
        """Test batch validation with mixed valid/invalid entities"""
        entity_data = {
            EntityType.EMAIL: {'email': 'invalid-email'},
            EntityType.AMOUNT: {'amount': '100.50'},
            EntityType.CURRENCY: {'currency': 'INVALID'}
        }
        
        results = engine.validate_entity_batch(entity_data)
        
        # Check results
        assert len(results) == 3
        
        email_result = results['email.email']
        amount_result = results['amount.amount']
        currency_result = results['currency.currency']
        
        assert email_result.is_valid is False, "Email should be invalid"
        assert amount_result.is_valid is True, "Amount should be valid"
        assert currency_result.is_valid is False, "Currency should be invalid"

    def test_validate_entity_batch_with_context(self, engine):
        """Test batch validation with context"""
        entity_data = {
            EntityType.EMAIL: {'email': 'user@example.com'},
            EntityType.AMOUNT: {'amount': '100.50'}
        }
        context = {'transaction_type': 'payment', 'user_country': 'US'}
        
        results = engine.validate_entity_batch(entity_data, context)
        
        assert isinstance(results, dict)
        assert len(results) == 2
        
        for result in results.values():
            assert isinstance(result, ValidationResult)

    @patch('app.utils.validation_engine.ValidationEngine._apply_cross_entity_validation')
    def test_validate_entity_batch_calls_cross_validation(self, mock_cross_validation, engine):
        """Test batch validation calls cross-entity validation"""
        entity_data = {
            EntityType.EMAIL: {'email': 'user@example.com'},
            EntityType.AMOUNT: {'amount': '100.50'}
        }
        
        engine.validate_entity_batch(entity_data)
        
        mock_cross_validation.assert_called_once()

    def test_validate_entity_batch_performance(self, engine):
        """Test batch validation performance"""
        # Create larger batch
        entity_data = {}
        for i in range(20):
            entity_data[EntityType.EMAIL] = {f'email_{i}': f'user{i}@example.com'}
        
        start_time = time.time()
        results = engine.validate_entity_batch(entity_data)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 100, f"Batch validation took {execution_time_ms}ms, should be <100ms"
        
        # Check all results are present
        assert len(results) == 20


class TestTransactionValidation:
    """Test transaction-specific validation functionality"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    def test_validate_transaction_data_structure(self, engine):
        """Test transaction validation with proper structure"""
        transaction_data = {
            'amount': '100.50',
            'currency': 'USD',
            'email': 'user@example.com',
            'ip_address': '192.168.1.1',
            'transaction_id': 'tx_12345',
            'timestamp': '2024-01-01T00:00:00Z'
        }
        
        results = engine.validate_transaction_data(transaction_data)
        
        assert isinstance(results, dict)
        assert len(results) > 0
        
        # Check that transaction fields are mapped correctly
        expected_keys = [
            'amount.amount', 'currency.currency', 'email.email', 
            'ip_address.ip_address', 'transaction_id.transaction_id', 'timestamp.timestamp'
        ]
        
        for key in expected_keys:
            assert key in results, f"Expected key {key} not found"
            assert isinstance(results[key], ValidationResult)

    def test_validate_transaction_data_partial_data(self, engine):
        """Test transaction validation with partial data"""
        transaction_data = {
            'amount': '50.00',
            'email': 'user@example.com'
        }
        
        results = engine.validate_transaction_data(transaction_data)
        
        assert isinstance(results, dict)
        assert len(results) == 2  # Only amount and email
        
        assert 'amount.amount' in results
        assert 'email.email' in results

    def test_validate_transaction_data_invalid_data(self, engine):
        """Test transaction validation with invalid data"""
        transaction_data = {
            'amount': '-100.00',  # Negative amount
            'currency': 'INVALID',  # Invalid currency
            'email': 'not-an-email'  # Invalid email
        }
        
        results = engine.validate_transaction_data(transaction_data)
        
        # All should be invalid
        for result in results.values():
            assert result.is_valid is False

    @patch('app.utils.validation_engine.ValidationEngine._add_transaction_analysis')
    def test_validate_transaction_calls_transaction_analysis(self, mock_analysis, engine):
        """Test transaction validation calls transaction-specific analysis"""
        transaction_data = {
            'amount': '100.50',
            'currency': 'USD'
        }
        
        engine.validate_transaction_data(transaction_data)
        
        # Should be called for each transaction field
        assert mock_analysis.call_count >= 2

    def test_map_transaction_to_entities(self, engine):
        """Test transaction field mapping to entity types"""
        transaction_data = {
            'amount': '100.50',
            'currency': 'USD',
            'email': 'user@example.com',
            'unknown_field': 'value'
        }
        
        entity_mapping = engine._map_transaction_to_entities(transaction_data)
        
        # Check known fields are mapped
        assert EntityType.AMOUNT in entity_mapping
        assert EntityType.CURRENCY in entity_mapping
        assert EntityType.EMAIL in entity_mapping
        
        # Check unknown fields are not mapped
        assert 'unknown_field' not in [field for fields in entity_mapping.values() for field in fields]


class TestSpecializedValidation:
    """Test specialized validation rules application"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    @patch('app.utils.validation_rules.financial_rules.FinancialValidationRules.validate_currency_amount')
    def test_apply_financial_validation(self, mock_financial, engine):
        """Test financial validation is applied for financial entities"""
        mock_financial.return_value = (True, None)
        
        result = ValidationResult(EntityType.AMOUNT, 'amount', '100.50')
        context = {'currency': 'USD'}
        
        engine._apply_financial_validation(result, context)
        
        mock_financial.assert_called_once_with('100.50', 'USD')

    @patch('app.utils.validation_rules.security_rules.SecurityValidationRules.validate_input_security')
    def test_apply_security_validation(self, mock_security, engine):
        """Test security validation is applied"""
        mock_security.return_value = (True, None, {})
        
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        
        engine._apply_security_validation(result, None)
        
        mock_security.assert_called_once_with('user@example.com', 'email')

    @patch('app.utils.validation_rules.geographic_rules.GeographicValidationRules.validate_country_code')
    def test_apply_geographic_validation(self, mock_geo, engine):
        """Test geographic validation is applied for geographic entities"""
        mock_geo.return_value = (True, None, {})
        
        result = ValidationResult(EntityType.COUNTRY_CODE, 'country', 'US')
        
        engine._apply_geographic_validation(result, None)
        
        mock_geo.assert_called_once_with('US')

    @patch('app.utils.validation_rules.temporal_rules.TemporalValidationRules.validate_timestamp')
    def test_apply_temporal_validation(self, mock_temporal, engine):
        """Test temporal validation is applied for temporal entities"""
        mock_temporal.return_value = (True, None, {})
        
        result = ValidationResult(EntityType.TX_TIMESTAMP, 'timestamp', '2024-01-01T00:00:00Z')
        
        engine._apply_temporal_validation(result, None)
        
        mock_temporal.assert_called_once_with('2024-01-01T00:00:00Z')

    @patch('app.utils.validation_rules.network_rules.NetworkValidationRules.validate_ip_address')
    def test_apply_network_validation(self, mock_network, engine):
        """Test network validation is applied for network entities"""
        mock_network.return_value = (True, None, {})
        
        result = ValidationResult(EntityType.IP_ADDRESS, 'ip', '192.168.1.1')
        
        engine._apply_network_validation(result, None)
        
        mock_network.assert_called_once_with('192.168.1.1')


class TestRiskScoreCalculation:
    """Test risk score calculation"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    def test_calculate_risk_score_no_factors(self, engine):
        """Test risk score calculation with no risk factors"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        
        risk_score = engine._calculate_risk_score(result)
        
        assert risk_score == 0.0

    def test_calculate_risk_score_with_factors(self, engine):
        """Test risk score calculation with various risk factors"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.security_analysis = {'threat_score': 0.6}
        result.financial_analysis = {'risk_score': 0.4}
        result.geographic_analysis = {'risk_score': 0.8}
        
        risk_score = engine._calculate_risk_score(result)
        
        # Should be average: (0.6 + 0.4 + 0.8) / 3 = 0.6
        assert abs(risk_score - 0.6) < 0.01

    def test_calculate_risk_score_capped_at_one(self, engine):
        """Test risk score is capped at 1.0"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.security_analysis = {'threat_score': 1.5}  # Over 1.0
        result.financial_analysis = {'risk_score': 1.2}   # Over 1.0
        
        risk_score = engine._calculate_risk_score(result)
        
        assert risk_score <= 1.0


class TestRecommendationGeneration:
    """Test recommendation generation"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    def test_generate_recommendations_high_risk(self, engine):
        """Test recommendations for high risk scores"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.risk_score = 0.8
        
        recommendations = engine._generate_recommendations(result)
        
        assert len(recommendations) > 0
        assert any("High risk detected" in rec for rec in recommendations)

    def test_generate_recommendations_moderate_risk(self, engine):
        """Test recommendations for moderate risk scores"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.risk_score = 0.6
        
        recommendations = engine._generate_recommendations(result)
        
        assert len(recommendations) > 0
        assert any("Moderate risk" in rec for rec in recommendations)

    def test_generate_recommendations_with_warnings(self, engine):
        """Test recommendations when warnings are present"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.add_warning("Suspicious domain")
        result.risk_score = 0.3
        
        recommendations = engine._generate_recommendations(result)
        
        assert len(recommendations) > 0
        assert any("validation warnings" in rec for rec in recommendations)

    def test_generate_recommendations_with_security_threats(self, engine):
        """Test recommendations when security threats are detected"""
        result = ValidationResult(EntityType.EMAIL, 'email', 'user@example.com')
        result.security_analysis = {'threats': ['xss_attempt']}
        result.risk_score = 0.2
        
        recommendations = engine._generate_recommendations(result)
        
        assert len(recommendations) > 0
        assert any("security measures" in rec for rec in recommendations)


class TestConvenienceFunctions:
    """Test convenience functions"""

    def test_validate_entity_field_function(self):
        """Test convenience function for single field validation"""
        result = validate_entity_field(EntityType.EMAIL, 'email', 'user@example.com')
        
        assert isinstance(result, ValidationResult)
        assert result.entity_type == EntityType.EMAIL
        assert result.field_name == 'email'
        assert result.value == 'user@example.com'

    def test_validate_entity_field_with_context(self):
        """Test convenience function with context"""
        context = {'user_id': '12345'}
        result = validate_entity_field(EntityType.EMAIL, 'email', 'user@example.com', context)
        
        assert isinstance(result, ValidationResult)

    def test_validate_transaction_function(self):
        """Test convenience function for transaction validation"""
        transaction_data = {
            'amount': '100.50',
            'currency': 'USD',
            'email': 'user@example.com'
        }
        
        results = validate_transaction(transaction_data)
        
        assert isinstance(results, dict)
        assert len(results) > 0
        
        for result in results.values():
            assert isinstance(result, ValidationResult)


class TestPerformanceAndScalability:
    """Test performance and scalability requirements"""

    @pytest.fixture
    def engine(self):
        return ValidationEngine()

    def test_single_validation_performance(self, engine):
        """Test single validation meets performance requirements"""
        test_cases = [
            (EntityType.EMAIL, 'email', 'user@example.com'),
            (EntityType.AMOUNT, 'amount', '100.50'),
            (EntityType.IP_ADDRESS, 'ip', '192.168.1.1'),
            (EntityType.CURRENCY, 'currency', 'USD'),
            (EntityType.TX_TIMESTAMP, 'timestamp', '2024-01-01T00:00:00Z')
        ]
        
        for entity_type, field_name, value in test_cases:
            start_time = time.time()
            engine.validate_entity(entity_type, field_name, value)
            end_time = time.time()
            
            execution_time_ms = (end_time - start_time) * 1000
            assert execution_time_ms < 100, f"Validation took {execution_time_ms}ms for {entity_type}, should be <100ms"

    def test_batch_validation_scalability(self, engine):
        """Test batch validation scales appropriately"""
        # Test with increasing batch sizes
        batch_sizes = [10, 25, 50, 100]
        
        for batch_size in batch_sizes:
            entity_data = {}
            for i in range(batch_size):
                entity_data[EntityType.EMAIL] = {f'email_{i}': f'user{i}@example.com'}
            
            start_time = time.time()
            results = engine.validate_entity_batch(entity_data)
            end_time = time.time()
            
            execution_time_ms = (end_time - start_time) * 1000
            
            # Performance should scale reasonably (not exponentially)
            max_time_per_item = 2.0  # 2ms per item max
            expected_max_time = batch_size * max_time_per_item
            
            assert execution_time_ms < expected_max_time, \
                f"Batch validation of {batch_size} items took {execution_time_ms}ms, expected <{expected_max_time}ms"
            
            # Verify all results are present
            assert len(results) == batch_size

    def test_transaction_validation_performance(self, engine):
        """Test transaction validation performance"""
        transaction_data = {
            'amount': '100.50',
            'currency': 'USD',
            'email': 'user@example.com',
            'ip_address': '192.168.1.1',
            'user_agent': 'Mozilla/5.0...',
            'country_code': 'US',
            'payment_method': 'card',
            'timestamp': '2024-01-01T00:00:00Z'
        }
        
        start_time = time.time()
        results = engine.validate_transaction_data(transaction_data)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 100, f"Transaction validation took {execution_time_ms}ms, should be <100ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=app.utils.validation_engine"])
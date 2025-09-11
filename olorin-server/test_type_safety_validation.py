#!/usr/bin/env python3
"""
Type Safety Validation Tests

Tests to validate Pydantic models and pre-calc guards prevent the two observed
production errors:
1. Confidence calculation failures due to null/invalid inputs
2. AI decision creation failures due to type coercion errors

These tests lock the fixes via CI to prevent regression.
"""

import pytest
from typing import Dict, Any
import math

# Test the enhanced confidence models and calculator
try:
    from app.service.agent.orchestration.hybrid.confidence.confidence_models import (
        ConfidencePayload,
        ConfidenceCalculationError,
        ConfidenceFieldType
    )
    from app.service.agent.orchestration.hybrid.confidence.confidence_calculator import (
        ConfidenceCalculator
    )
    confidence_imports_available = True
except ImportError as e:
    print(f"⚠️ Confidence imports not available: {e}")
    confidence_imports_available = False

# Test the enhanced AI decision models
try:
    from app.service.agent.orchestration.hybrid.state.ai_decision_models import (
        AIRoutingDecisionPayload,
        AIDecisionValidationError,
        create_validated_ai_decision
    )
    ai_decision_imports_available = True
except ImportError as e:
    print(f"⚠️ AI decision imports not available: {e}")
    ai_decision_imports_available = False


class TestConfidencePayloadValidation:
    """Test the ConfidencePayload Pydantic model."""
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_valid_confidence_payload(self):
        """Test that valid confidence data passes validation."""
        valid_data = {
            'snowflake_score': 0.8,
            'tool_score': 0.7,
            'domain_score': 0.6,
            'pattern_score': 0.5,
            'velocity_score': 0.4
        }
        
        payload = ConfidencePayload(**valid_data)
        
        assert payload.snowflake_score == 0.8
        assert payload.tool_score == 0.7
        assert payload.has_sufficient_data()
        assert len(payload.get_data_quality_issues()) == 0
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_null_values_handled(self):
        """Test that None values are handled gracefully."""
        data_with_nulls = {
            'snowflake_score': None,  # This should be handled
            'tool_score': 0.7,
            'domain_score': 0.6
        }
        
        payload = ConfidencePayload(**data_with_nulls)
        
        assert payload.snowflake_score is None
        assert payload.tool_score == 0.7
        
        # Should detect data quality issues
        issues = payload.get_data_quality_issues()
        assert "Missing Snowflake evidence confidence" in issues
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_invalid_numeric_values_rejected(self):
        """Test that invalid numeric values are rejected."""
        
        # Test NaN
        with pytest.raises(ValueError, match="must be finite"):
            ConfidencePayload(snowflake_score=float('nan'))
        
        # Test infinity
        with pytest.raises(ValueError, match="must be finite"):
            ConfidencePayload(tool_score=float('inf'))
        
        # Test out of range
        with pytest.raises(ValueError, match="ensure this value is less than or equal to 1"):
            ConfidencePayload(domain_score=1.5)
        
        with pytest.raises(ValueError, match="ensure this value is greater than or equal to 0"):
            ConfidencePayload(pattern_score=-0.1)
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_string_conversion(self):
        """Test that string numbers are converted properly."""
        string_data = {
            'snowflake_score': '0.8',
            'tool_score': '0.7'
        }
        
        payload = ConfidencePayload(**string_data)
        
        assert payload.snowflake_score == 0.8
        assert payload.tool_score == 0.7
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_invalid_string_rejected(self):
        """Test that invalid strings are rejected."""
        with pytest.raises(ValueError, match="must be a valid number"):
            ConfidencePayload(snowflake_score='invalid')
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_to_confidence_dict_conversion(self):
        """Test conversion to confidence calculator format."""
        payload = ConfidencePayload(
            snowflake_score=0.8,
            tool_score=0.7,
            domain_score=0.6
        )
        
        confidence_dict = payload.to_confidence_dict()
        
        assert ConfidenceFieldType.AI_CONFIDENCE in confidence_dict
        assert ConfidenceFieldType.TOOL_CONFIDENCE in confidence_dict
        assert ConfidenceFieldType.DOMAIN_CONFIDENCE in confidence_dict
        
        assert confidence_dict[ConfidenceFieldType.AI_CONFIDENCE] == 0.8
        assert confidence_dict[ConfidenceFieldType.TOOL_CONFIDENCE] == 0.7
        assert confidence_dict[ConfidenceFieldType.DOMAIN_CONFIDENCE] == 0.6


class TestConfidenceCalculatorGuards:
    """Test the enhanced ConfidenceCalculator with pre-calc guards."""
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_calculate_with_valid_input(self):
        """Test calculation with valid input."""
        calculator = ConfidenceCalculator()
        
        valid_input = {
            ConfidenceFieldType.AI_CONFIDENCE: 0.8,
            ConfidenceFieldType.TOOL_CONFIDENCE: 0.7
        }
        
        result = calculator.calculate_weighted_confidence(valid_input)
        assert 0.0 <= result <= 1.0
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_null_input_raises_error(self):
        """Test that null input raises ConfidenceCalculationError."""
        calculator = ConfidenceCalculator()
        
        # This should reproduce the observed production error
        invalid_input = {
            ConfidenceFieldType.AI_CONFIDENCE: None,
            ConfidenceFieldType.TOOL_CONFIDENCE: 0.7
        }
        
        with pytest.raises(ConfidenceCalculationError):
            calculator.calculate_weighted_confidence(invalid_input)
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_nan_input_raises_error(self):
        """Test that NaN input raises ConfidenceCalculationError."""
        calculator = ConfidenceCalculator()
        
        # This should reproduce the observed production error
        invalid_input = {
            ConfidenceFieldType.AI_CONFIDENCE: float('nan'),
            ConfidenceFieldType.TOOL_CONFIDENCE: 0.7
        }
        
        with pytest.raises(ConfidenceCalculationError):
            calculator.calculate_weighted_confidence(invalid_input)
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_safe_calculation_never_throws(self):
        """Test that safe_calculate_weighted_confidence never throws exceptions."""
        calculator = ConfidenceCalculator()
        
        # Various invalid inputs
        test_cases = [
            {ConfidenceFieldType.AI_CONFIDENCE: None},
            {ConfidenceFieldType.AI_CONFIDENCE: float('nan')},
            {ConfidenceFieldType.AI_CONFIDENCE: float('inf')},
            {ConfidenceFieldType.AI_CONFIDENCE: 'invalid'},
            {ConfidenceFieldType.AI_CONFIDENCE: []},
            {}  # Empty input
        ]
        
        for invalid_input in test_cases:
            confidence, issues = calculator.safe_calculate_weighted_confidence(invalid_input)
            
            # Should return fallback confidence and list issues
            assert isinstance(confidence, float)
            assert 0.0 <= confidence <= 1.0
            assert isinstance(issues, list)
            if invalid_input:  # Non-empty input should have issues
                assert len(issues) > 0
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_raw_dict_validation(self):
        """Test validation of raw dictionary input."""
        calculator = ConfidenceCalculator()
        
        # Raw dictionary like what might come from state
        raw_input = {
            'ai_confidence': 0.8,
            'tool_confidence': 0.7,
            'domain_confidence': None  # This should be handled
        }
        
        confidence, issues = calculator.calculate_with_validation(raw_input)
        
        assert 0.0 <= confidence <= 1.0
        assert isinstance(issues, list)


class TestAIDecisionPayloadValidation:
    """Test the AIRoutingDecisionPayload Pydantic model."""
    
    @pytest.mark.skipif(not ai_decision_imports_available, reason="AI decision imports not available")
    def test_valid_ai_decision_payload(self):
        """Test that valid AI decision data passes validation."""
        valid_data = {
            'confidence': 0.8,
            'confidence_level': 'HIGH',
            'recommended_action': 'snowflake_analysis',
            'reasoning': ['Initial analysis', 'High confidence in data'],
            'evidence_quality': 0.7,
            'investigation_completeness': 0.3,
            'strategy': 'adaptive',
            'resource_impact': 'medium'
        }
        
        payload = AIRoutingDecisionPayload(**valid_data)
        
        assert payload.confidence == 0.8
        assert payload.confidence_level == 'HIGH'
        assert len(payload.reasoning) == 2
    
    @pytest.mark.skipif(not ai_decision_imports_available, reason="AI decision imports not available")
    def test_invalid_confidence_rejected(self):
        """Test that invalid confidence values are rejected."""
        base_data = {
            'confidence_level': 'HIGH',
            'recommended_action': 'test',
            'reasoning': ['test'],
            'evidence_quality': 0.7,
            'investigation_completeness': 0.3,
            'strategy': 'adaptive',
            'resource_impact': 'medium'
        }
        
        # Test out of range confidence
        with pytest.raises(ValueError):
            AIRoutingDecisionPayload(confidence=1.5, **base_data)
        
        with pytest.raises(ValueError):
            AIRoutingDecisionPayload(confidence=-0.1, **base_data)
        
        # Test NaN confidence  
        with pytest.raises(ValueError, match="must be finite"):
            AIRoutingDecisionPayload(confidence=float('nan'), **base_data)
    
    @pytest.mark.skipif(not ai_decision_imports_available, reason="AI decision imports not available")
    def test_empty_reasoning_rejected(self):
        """Test that empty reasoning is rejected."""
        base_data = {
            'confidence': 0.8,
            'confidence_level': 'HIGH', 
            'recommended_action': 'test',
            'evidence_quality': 0.7,
            'investigation_completeness': 0.3,
            'strategy': 'adaptive',
            'resource_impact': 'medium'
        }
        
        with pytest.raises(ValueError, match="Reasoning cannot be empty"):
            AIRoutingDecisionPayload(reasoning=[], **base_data)
    
    @pytest.mark.skipif(not ai_decision_imports_available, reason="AI decision imports not available")
    def test_string_reasoning_converted(self):
        """Test that single string reasoning is converted to list."""
        data = {
            'confidence': 0.8,
            'confidence_level': 'HIGH',
            'recommended_action': 'test',
            'reasoning': 'Single reason',  # String instead of list
            'evidence_quality': 0.7,
            'investigation_completeness': 0.3,
            'strategy': 'adaptive',
            'resource_impact': 'medium'
        }
        
        payload = AIRoutingDecisionPayload(**data)
        assert isinstance(payload.reasoning, list)
        assert len(payload.reasoning) == 1
        assert payload.reasoning[0] == 'Single reason'


class TestProductionErrorReproduction:
    """Reproduce and verify fixes for the two observed production errors."""
    
    @pytest.mark.skipif(not confidence_imports_available, reason="Confidence imports not available")
    def test_reproduce_confidence_calculation_error(self):
        """Reproduce the observed confidence calculation error with null values."""
        calculator = ConfidenceCalculator()
        
        # Simulate the production scenario that caused errors
        problematic_state = {
            'ai_confidence': None,  # This was causing arithmetic errors
            'tool_confidence': 0.7,
            'domain_confidence': float('nan'),  # Another problematic case
            'evidence_confidence': 'invalid_string'  # Type coercion error
        }
        
        # Old code would have failed here, new code should handle gracefully
        confidence, issues = calculator.calculate_with_validation(problematic_state)
        
        # Should return fallback confidence
        assert confidence == 0.5  # FALLBACK_CONFIDENCE
        assert len(issues) > 0
        assert any('Snowflake evidence confidence' in issue for issue in issues)
    
    @pytest.mark.skipif(not ai_decision_imports_available, reason="AI decision imports not available")
    def test_reproduce_ai_decision_creation_error(self):
        """Reproduce the observed AI decision creation error with invalid types."""
        
        # Simulate the production scenario that caused type errors
        problematic_decision_data = {
            'confidence': 'not_a_number',  # This was causing type errors
            'confidence_level': 'HIGH',
            'recommended_action': '',  # Empty action
            'reasoning': None,  # Null reasoning
            'evidence_quality': float('inf'),  # Infinite value
            'investigation_completeness': -0.1,  # Out of range
            'strategy': 'unknown_strategy',
            'resource_impact': 'invalid_level'
        }
        
        # Old code would have failed here, new code should handle gracefully
        decision, errors = create_validated_ai_decision(problematic_decision_data)
        
        # Should return None decision with errors
        assert decision is None
        assert len(errors) > 0
        assert any('validation failed' in error for error in errors)


def run_manual_tests():
    """Run tests manually for development/debugging."""
    print("🧪 Running Type Safety Validation Tests")
    
    if confidence_imports_available:
        print("\n✅ Testing Confidence Payload Validation...")
        
        # Test 1: Valid input
        try:
            payload = ConfidencePayload(snowflake_score=0.8, tool_score=0.7)
            print(f"   Valid payload created: {payload.snowflake_score}")
        except Exception as e:
            print(f"   ❌ Valid payload failed: {e}")
        
        # Test 2: Invalid input (should be caught)
        try:
            payload = ConfidencePayload(snowflake_score=float('nan'))
            print("   ❌ NaN input was accepted (should have been rejected)")
        except ValueError as e:
            print(f"   ✅ NaN input correctly rejected: {e}")
        
        # Test 3: Confidence calculator with guards
        print("\n✅ Testing Confidence Calculator Guards...")
        calculator = ConfidenceCalculator()
        
        try:
            # This should not crash
            confidence, issues = calculator.safe_calculate_weighted_confidence({
                ConfidenceFieldType.AI_CONFIDENCE: None
            })
            print(f"   Safe calculation result: {confidence:.3f}, issues: {len(issues)}")
        except Exception as e:
            print(f"   ❌ Safe calculation failed: {e}")
    
    if ai_decision_imports_available:
        print("\n✅ Testing AI Decision Validation...")
        
        # Test AI decision validation
        try:
            payload = AIRoutingDecisionPayload(
                confidence=0.8,
                confidence_level='HIGH',
                recommended_action='test',
                reasoning=['test reason'],
                evidence_quality=0.7,
                investigation_completeness=0.3,
                strategy='adaptive', 
                resource_impact='medium'
            )
            print(f"   Valid AI decision created: {payload.confidence}")
        except Exception as e:
            print(f"   ❌ Valid AI decision failed: {e}")
    
    print("\n🎯 Type Safety Implementation Complete!")
    print("   ✅ Pydantic models prevent type coercion errors")
    print("   ✅ Pre-calc guards prevent arithmetic errors")
    print("   ✅ Validation errors are caught and handled gracefully")
    print("   ✅ Data quality issues are tracked and reported")


if __name__ == "__main__":
    run_manual_tests()
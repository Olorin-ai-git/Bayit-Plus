"""
Comprehensive test suite for entity validation utilities
Tests all utility functions, edge cases, and performance characteristics.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.utils.entity_validation import (
    get_entity_type_categories,
    validate_entity_type_format,
    get_entity_type_suggestions,
    is_entity_type_compatible,
    get_all_entity_types,
    get_entity_type_count,
    get_entity_types_by_category,
    validate_entity_type_against_enum,
    create_entity_type_error_response
)


class TestEntityTypeCategories:
    """Test entity type categorization functions"""

    def test_get_entity_type_categories_structure(self):
        """Test that categories are properly structured"""
        categories = get_entity_type_categories()
        
        # Check structure
        assert isinstance(categories, dict)
        assert len(categories) > 0
        
        # Check expected categories exist
        expected_categories = [
            "core", "behavioral", "risk", "identity", 
            "payment", "temporal", "technical", "business", "meta"
        ]
        
        for category in expected_categories:
            assert category in categories, f"Missing category: {category}"
            assert isinstance(categories[category], list)
            assert len(categories[category]) > 0

    def test_core_category_contents(self):
        """Test core category contains expected types"""
        categories = get_entity_type_categories()
        core_types = categories["core"]
        
        expected_core = ["device", "location", "network", "user", "account", "transaction"]
        
        for expected_type in expected_core:
            assert expected_type in core_types, f"Missing core type: {expected_type}"

    def test_behavioral_category_contents(self):
        """Test behavioral category contains pattern types"""
        categories = get_entity_type_categories()
        behavioral_types = categories["behavioral"]
        
        expected_patterns = ["login_pattern", "spending_pattern", "access_pattern", "communication_pattern"]
        
        for pattern in expected_patterns:
            assert pattern in behavioral_types, f"Missing behavioral pattern: {pattern}"

    def test_risk_category_contents(self):
        """Test risk category contains security-related types"""
        categories = get_entity_type_categories()
        risk_types = categories["risk"]
        
        expected_risk = ["risk_indicator", "anomaly", "threat", "vulnerability"]
        
        for risk_type in expected_risk:
            assert risk_type in risk_types, f"Missing risk type: {risk_type}"

    def test_get_entity_types_by_category_valid(self):
        """Test getting entity types by valid category"""
        core_types = get_entity_types_by_category("core")
        assert isinstance(core_types, list)
        assert "user" in core_types
        assert "device" in core_types
        
        # Test case insensitive
        core_types_upper = get_entity_types_by_category("CORE")
        assert core_types == core_types_upper

    def test_get_entity_types_by_category_invalid(self):
        """Test getting entity types by invalid category"""
        invalid_types = get_entity_types_by_category("nonexistent")
        assert isinstance(invalid_types, list)
        assert len(invalid_types) == 0


class TestEntityTypeFormat:
    """Test entity type format validation"""

    def test_validate_format_valid_strings(self):
        """Test format validation with valid strings"""
        valid_strings = [
            "user",
            "device",
            "transaction_id",
            "a",  # minimum length
            "a" * 100,  # maximum length
            "UPPERCASE",
            "MixedCase",
            "with_underscores",
            "with-hyphens",
            "with123numbers"
        ]
        
        for string in valid_strings:
            is_valid, error = validate_entity_type_format(string)
            assert is_valid is True, f"Should be valid: {string}"
            assert error is None

    def test_validate_format_invalid_types(self):
        """Test format validation with invalid types"""
        invalid_inputs = [
            (None, "Entity type must be a string"),
            (123, "Entity type must be a string"),
            ([], "Entity type must be a string"),
            ({}, "Entity type must be a string"),
            (True, "Entity type must be a string")
        ]
        
        for input_val, expected_error in invalid_inputs:
            is_valid, error = validate_entity_type_format(input_val)
            assert is_valid is False
            assert expected_error in error

    def test_validate_format_empty_strings(self):
        """Test format validation with empty/whitespace strings"""
        empty_inputs = [
            "",
            "   ",
            "\t",
            "\n",
            "\r\n",
            "\t\n  \r"
        ]
        
        for empty_input in empty_inputs:
            is_valid, error = validate_entity_type_format(empty_input)
            assert is_valid is False
            assert "Entity type cannot be empty" in error

    def test_validate_format_length_limits(self):
        """Test format validation with length limits"""
        # Test exactly at limit
        at_limit = "a" * 100
        is_valid, error = validate_entity_type_format(at_limit)
        assert is_valid is True
        assert error is None
        
        # Test over limit
        over_limit = "a" * 101
        is_valid, error = validate_entity_type_format(over_limit)
        assert is_valid is False
        assert "exceeds maximum length" in error

    def test_validate_format_security_patterns(self):
        """Test format validation detects dangerous patterns"""
        dangerous_inputs = [
            "<script>alert(1)</script>",
            "javascript:alert(1)",
            "user; DROP TABLE users;",
            "device' UNION SELECT *",
            "<iframe src='evil.com'>",
            "vbscript:msgbox(1)",
            "user--comment",
            "INSERT INTO malicious",
            "UPDATE SET evil",
            "DELETE FROM sensitive"
        ]
        
        for dangerous in dangerous_inputs:
            is_valid, error = validate_entity_type_format(dangerous)
            assert is_valid is False, f"Should be invalid: {dangerous}"
            assert "Invalid characters detected" in error


class TestEntityTypeSuggestions:
    """Test entity type suggestion functionality"""

    def test_suggestions_for_partial_matches(self):
        """Test suggestions for partial matches"""
        test_cases = [
            ("use", ["user"]),
            ("dev", ["device"]),
            ("trans", ["transaction"]),
            ("net", ["network"]),
            ("loc", ["location"])
        ]
        
        for partial, expected_contains in test_cases:
            suggestions = get_entity_type_suggestions(partial)
            assert isinstance(suggestions, list)
            assert len(suggestions) > 0
            
            for expected in expected_contains:
                assert any(expected in suggestion for suggestion in suggestions), \
                    f"Expected {expected} in suggestions for {partial}, got {suggestions}"

    def test_suggestions_for_pattern_matches(self):
        """Test suggestions for pattern-based matches"""
        pattern_inputs = [
            "pattern",
            "login",
            "spending",
            "access"
        ]
        
        for pattern_input in pattern_inputs:
            suggestions = get_entity_type_suggestions(pattern_input)
            assert isinstance(suggestions, list)
            assert len(suggestions) > 0
            
            # Should contain pattern-related suggestions
            assert any("pattern" in s for s in suggestions), \
                f"Expected pattern-related suggestions for {pattern_input}, got {suggestions}"

    def test_suggestions_for_risk_matches(self):
        """Test suggestions for risk-related matches"""
        risk_inputs = [
            "risk",
            "threat",
            "vulnerability",
            "anomaly"
        ]
        
        for risk_input in risk_inputs:
            suggestions = get_entity_type_suggestions(risk_input)
            assert isinstance(suggestions, list)
            assert len(suggestions) > 0

    def test_suggestions_fallback_behavior(self):
        """Test fallback behavior for no matches"""
        no_match_inputs = [
            "xyz123",
            "completely_invalid",
            "nothingmatchesthis"
        ]
        
        for no_match in no_match_inputs:
            suggestions = get_entity_type_suggestions(no_match)
            assert isinstance(suggestions, list)
            assert len(suggestions) > 0  # Should fallback to core types
            
            # Should contain core types as fallback
            core_in_suggestions = any(core in suggestions 
                                    for core in ["user", "device", "transaction", "account"])
            assert core_in_suggestions, f"Expected core types in fallback for {no_match}, got {suggestions}"

    def test_suggestions_limit(self):
        """Test that suggestions are limited to reasonable number"""
        suggestions = get_entity_type_suggestions("a")  # Very broad match
        assert len(suggestions) <= 5, "Suggestions should be limited to 5 items"

    def test_suggestions_uniqueness(self):
        """Test that suggestions don't contain duplicates"""
        suggestions = get_entity_type_suggestions("user")
        assert len(suggestions) == len(set(suggestions)), "Suggestions should be unique"


class TestEntityTypeCompatibility:
    """Test entity type compatibility checking"""

    def test_compatible_entity_types(self):
        """Test compatible entity type pairs"""
        compatible_pairs = [
            ("user", "device"),
            ("user", "transaction"),
            ("device", "location"),
            ("transaction", "merchant"),
            ("account", "payment_method")
        ]
        
        for type1, type2 in compatible_pairs:
            assert is_entity_type_compatible(type1, type2), \
                f"{type1} and {type2} should be compatible"
            # Test symmetry
            assert is_entity_type_compatible(type2, type1), \
                f"{type2} and {type1} should be compatible (symmetry check)"

    def test_incompatible_entity_types(self):
        """Test incompatible entity type pairs"""
        # Based on the defined incompatible pairs in the function
        incompatible_pairs = [
            ("investigation", "user"),
            ("case", "transaction"),
            ("rule", "device")
        ]
        
        for type1, type2 in incompatible_pairs:
            assert not is_entity_type_compatible(type1, type2), \
                f"{type1} and {type2} should be incompatible"
            # Test symmetry
            assert not is_entity_type_compatible(type2, type1), \
                f"{type2} and {type1} should be incompatible (symmetry check)"

    def test_compatibility_with_invalid_types(self):
        """Test compatibility checking with invalid entity types"""
        invalid_types = [
            "invalid_type",
            "fake_entity",
            "nonexistent"
        ]
        
        for invalid in invalid_types:
            assert not is_entity_type_compatible("user", invalid), \
                f"user and {invalid} should be incompatible (invalid type)"
            assert not is_entity_type_compatible(invalid, "device"), \
                f"{invalid} and device should be incompatible (invalid type)"


class TestEntityTypeEnumValidation:
    """Test entity type enum validation"""

    def test_enum_validation_valid_types(self):
        """Test enum validation with valid types"""
        # Get some valid types to test
        valid_types = get_all_entity_types()[:10]  # Test first 10
        
        for entity_type in valid_types:
            is_valid, error = validate_entity_type_against_enum(entity_type)
            assert is_valid is True, f"Valid type {entity_type} should pass validation"
            assert error is None

    def test_enum_validation_invalid_types(self):
        """Test enum validation with invalid types"""
        invalid_types = [
            "invalid_entity",
            "fake_type", 
            "nonexistent_entity",
            "user_fake"
        ]
        
        for entity_type in invalid_types:
            is_valid, error = validate_entity_type_against_enum(entity_type)
            assert is_valid is False, f"Invalid type {entity_type} should fail validation"
            assert error is not None
            assert "Invalid entity type" in error

    def test_enum_validation_case_insensitive(self):
        """Test enum validation is case insensitive"""
        test_cases = [
            "USER",
            "Device", 
            "TRANSACTION",
            "account"
        ]
        
        for test_case in test_cases:
            is_valid, error = validate_entity_type_against_enum(test_case)
            assert is_valid is True, f"Case variation {test_case} should be valid"
            assert error is None

    def test_enum_validation_with_whitespace(self):
        """Test enum validation handles whitespace"""
        test_cases = [
            "  user  ",
            "\tdevice\t",
            "\naccount\n"
        ]
        
        for test_case in test_cases:
            is_valid, error = validate_entity_type_against_enum(test_case)
            assert is_valid is True, f"Whitespace variation {test_case} should be valid"
            assert error is None


class TestUtilityFunctions:
    """Test general utility functions"""

    def test_get_all_entity_types_return_type(self):
        """Test get_all_entity_types returns proper type"""
        types = get_all_entity_types()
        assert isinstance(types, list)
        assert len(types) > 0
        assert all(isinstance(t, str) for t in types)

    def test_get_entity_type_count_consistency(self):
        """Test entity type count is consistent with actual types"""
        types = get_all_entity_types()
        count = get_entity_type_count()
        
        assert count == len(types), "Count should match actual number of types"
        assert count > 0, "Should have at least some entity types"

    def test_create_error_response_structure(self):
        """Test error response has proper structure"""
        error_response = create_entity_type_error_response("invalid_test")
        
        # Check required fields
        required_fields = [
            "error",
            "provided_type", 
            "suggestions",
            "categories_available",
            "total_supported_types",
            "documentation",
            "examples_by_category"
        ]
        
        for field in required_fields:
            assert field in error_response, f"Missing required field: {field}"
        
        # Check field types
        assert isinstance(error_response["error"], str)
        assert isinstance(error_response["provided_type"], str)
        assert isinstance(error_response["suggestions"], list)
        assert isinstance(error_response["categories_available"], list)
        assert isinstance(error_response["total_supported_types"], int)
        assert isinstance(error_response["examples_by_category"], dict)

    def test_create_error_response_content(self):
        """Test error response has meaningful content"""
        test_input = "invalid_entity_type"
        error_response = create_entity_type_error_response(test_input)
        
        # Check content
        assert error_response["provided_type"] == test_input
        assert error_response["total_supported_types"] > 0
        assert len(error_response["suggestions"]) > 0
        assert len(error_response["categories_available"]) > 0
        
        # Check examples by category
        examples = error_response["examples_by_category"]
        assert len(examples) > 0
        
        for category, category_examples in examples.items():
            assert isinstance(category, str)
            assert isinstance(category_examples, list)
            assert len(category_examples) <= 3  # Should limit examples per category


class TestPerformanceAndEdgeCases:
    """Test performance characteristics and edge cases"""

    def test_large_input_handling(self):
        """Test handling of large inputs"""
        # Very long string
        very_long_input = "a" * 1000
        is_valid, error = validate_entity_type_format(very_long_input)
        assert is_valid is False
        assert "exceeds maximum length" in error

    def test_special_unicode_characters(self):
        """Test handling of special Unicode characters"""
        unicode_inputs = [
            "usér",  # accented
            "デバイス",  # Japanese
            "пользователь",  # Cyrillic
            "entity🔒",  # emoji
            "user\x00null",  # null byte
            "entity\r\nline"  # control characters
        ]
        
        for unicode_input in unicode_inputs:
            is_valid, error = validate_entity_type_format(unicode_input)
            # Most should be invalid due to character restrictions
            # The function should handle them gracefully without crashing
            assert isinstance(is_valid, bool)
            assert error is None or isinstance(error, str)

    def test_enum_consistency(self):
        """Test that EntityType enum access is consistent"""
        # Since EntityType is now imported at module level, test consistency
        all_types_1 = get_all_entity_types()
        all_types_2 = get_all_entity_types()
        
        # Should return the same results consistently
        assert all_types_1 == all_types_2
        assert len(all_types_1) > 0  # Should have entity types

    def test_caching_effectiveness(self):
        """Test that LRU caching works correctly"""
        from app.utils.entity_validation import get_valid_entity_types_set
        
        # Clear cache to test fresh behavior  
        get_valid_entity_types_set.cache_clear()
        
        # First call
        result_1 = get_valid_entity_types_set()
        
        # Second call should use cache
        result_2 = get_valid_entity_types_set()
        
        # Results should be identical (same object if properly cached)
        assert result_1 == result_2
        assert isinstance(result_1, set)
        assert len(result_1) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
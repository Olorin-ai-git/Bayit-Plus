"""
Unit tests for MCP Input Validation Framework.

Author: Security Specialist
Date: 2025-08-31
"""

import json
from datetime import datetime

import pytest

from app.service.mcp_servers.security.input_validator import (
    InputType,
    MCPInputValidator,
    ValidationLevel,
    ValidationRateLimiter,
    ValidationResult,
    ValidationRule,
    create_fraud_investigation_validator,
)


class TestMCPInputValidator:
    """Test MCP input validator."""

    @pytest.fixture
    def validator(self):
        """Create validator for testing."""
        return MCPInputValidator(ValidationLevel.STANDARD)

    @pytest.fixture
    def strict_validator(self):
        """Create strict validator for testing."""
        return MCPInputValidator(ValidationLevel.STRICT)

    def test_string_validation_success(self, validator):
        """Test successful string validation."""
        result = validator.validate("Hello World", InputType.STRING)

        assert result.is_valid
        assert result.sanitized_value == "Hello World"
        assert len(result.errors) == 0

    def test_string_validation_xss_detection(self, validator):
        """Test XSS pattern detection."""
        malicious_input = "<script>alert('xss')</script>"
        result = validator.validate(malicious_input, InputType.STRING)

        assert not result.is_valid
        # The validator may detect command characters or XSS patterns
        assert any(
            keyword in result.errors[0]
            for keyword in ["XSS", "command characters", "dangerous"]
        )
        assert result.risk_score > 0.5

    def test_sql_injection_detection(self, validator):
        """Test SQL injection pattern detection."""
        malicious_input = "'; DROP TABLE users; --"
        result = validator.validate(malicious_input, InputType.STRING)

        assert not result.is_valid
        # The validator may detect command characters or SQL injection patterns
        assert any(
            keyword in result.errors[0]
            for keyword in ["SQL injection", "command characters", "dangerous"]
        )
        assert result.risk_score > 0.5

    def test_command_injection_detection(self, validator):
        """Test command injection pattern detection."""
        malicious_input = "test; rm -rf /"
        result = validator.validate(malicious_input, InputType.STRING)

        assert not result.is_valid
        # Should detect dangerous command characters
        assert any(
            keyword in result.errors[0]
            for keyword in ["command characters", "dangerous"]
        )
        assert result.risk_score > 0.5

    def test_integer_validation_success(self, validator):
        """Test successful integer validation."""
        result = validator.validate(42, InputType.INTEGER)

        assert result.is_valid
        assert result.sanitized_value == 42
        assert len(result.errors) == 0

    def test_integer_validation_failure(self, validator):
        """Test failed integer validation."""
        result = validator.validate("not_a_number", InputType.INTEGER)

        assert not result.is_valid
        assert "must be an integer" in result.errors[0]

    def test_float_validation_success(self, validator):
        """Test successful float validation."""
        result = validator.validate(3.14, InputType.FLOAT)

        assert result.is_valid
        assert result.sanitized_value == 3.14
        assert len(result.errors) == 0

    def test_boolean_validation_success(self, validator):
        """Test successful boolean validation."""
        # Test actual boolean
        result = validator.validate(True, InputType.BOOLEAN)
        assert result.is_valid
        assert result.sanitized_value is True

        # Test string conversion
        result = validator.validate("true", InputType.BOOLEAN)
        assert result.is_valid
        assert result.sanitized_value is True

        result = validator.validate("false", InputType.BOOLEAN)
        assert result.is_valid
        assert result.sanitized_value is False

    def test_json_validation_success(self, validator):
        """Test successful JSON validation."""
        # Test dict input
        test_data = {"key": "value", "number": 42}
        result = validator.validate(test_data, InputType.JSON)

        assert result.is_valid
        assert result.sanitized_value == test_data

        # Test JSON string input
        json_string = json.dumps(test_data)
        result = validator.validate(json_string, InputType.JSON)

        assert result.is_valid
        assert result.sanitized_value == test_data

    def test_json_validation_failure(self, validator):
        """Test failed JSON validation."""
        invalid_json = '{"key": "value", "incomplete":'
        result = validator.validate(invalid_json, InputType.JSON)

        assert not result.is_valid
        assert "invalid JSON" in result.errors[0]

    def test_email_validation_success(self, validator):
        """Test successful email validation."""
        valid_emails = [
            "user@example.com",
            "test.user+tag@domain.org",
            "admin@fraud-detection.com",
        ]

        for email in valid_emails:
            result = validator.validate(email, InputType.EMAIL)
            assert result.is_valid, f"Email {email} should be valid"
            assert result.sanitized_value == email.lower().strip()

    def test_email_validation_failure(self, validator):
        """Test failed email validation."""
        invalid_emails = [
            "notanemail",
            "user@",
            "@domain.com",
            "user..name@domain.com",
            "user@domain",
        ]

        for email in invalid_emails:
            result = validator.validate(email, InputType.EMAIL)
            assert not result.is_valid, f"Email {email} should be invalid"

    def test_url_validation_success(self, validator):
        """Test successful URL validation."""
        valid_urls = [
            "https://example.com",
            "http://fraud-detection.olorin.com/api",
            "https://api.external-service.com/v1/verify",
        ]

        for url in valid_urls:
            result = validator.validate(url, InputType.URL)
            assert result.is_valid, f"URL {url} should be valid"

    def test_url_validation_failure(self, validator):
        """Test failed URL validation."""
        invalid_urls = [
            "not_a_url",
            "ftp://example.com",  # Invalid scheme
            "javascript:alert('xss')",  # Dangerous scheme
            "file:///etc/passwd",  # Dangerous scheme
        ]

        for url in invalid_urls:
            result = validator.validate(url, InputType.URL)
            assert not result.is_valid, f"URL {url} should be invalid"

    def test_ip_address_validation_success(self, validator):
        """Test successful IP address validation."""
        valid_ips = [
            "192.168.1.1",
            "10.0.0.1",
            "203.0.113.1",
            "2001:db8::1",  # IPv6
        ]

        for ip in valid_ips:
            result = validator.validate(ip, InputType.IP)
            assert result.is_valid, f"IP {ip} should be valid"

    def test_ip_address_validation_failure(self, validator):
        """Test failed IP address validation."""
        invalid_ips = [
            "256.256.256.256",
            "192.168.1",
            "not_an_ip",
            "192.168.1.1.1",
        ]

        for ip in invalid_ips:
            result = validator.validate(ip, InputType.IP)
            assert not result.is_valid, f"IP {ip} should be invalid"

    def test_sql_query_validation_success(self, validator):
        """Test successful SQL query validation."""
        valid_queries = [
            "SELECT * FROM users WHERE id = ?",
            "SELECT name, email FROM customers WHERE active = 1",
            "INSERT INTO logs (message, timestamp) VALUES (?, ?)",
        ]

        for query in valid_queries:
            result = validator.validate(query, InputType.SQL_QUERY)
            assert result.is_valid, f"SQL query should be valid: {query}"

    def test_file_path_validation_success(self, validator):
        """Test successful file path validation."""
        valid_paths = [
            "documents/report.pdf",
            "uploads/image.jpg",
            "data/transactions.csv",
        ]

        for path in valid_paths:
            result = validator.validate(path, InputType.FILE_PATH)
            assert result.is_valid, f"File path should be valid: {path}"

    def test_file_path_validation_failure(self, validator):
        """Test failed file path validation."""
        invalid_paths = [
            "../../../etc/passwd",  # Path traversal
            "/absolute/path",  # Absolute path
            "documents/../config.ini",  # Path traversal
        ]

        for path in invalid_paths:
            result = validator.validate(path, InputType.FILE_PATH)
            assert not result.is_valid, f"File path should be invalid: {path}"

    def test_user_id_validation_success(self, validator):
        """Test successful user ID validation."""
        valid_user_ids = [
            "user123",
            "user.name@domain.com",
            "test-user_01",
        ]

        for user_id in valid_user_ids:
            result = validator.validate(user_id, InputType.USER_ID)
            assert result.is_valid, f"User ID should be valid: {user_id}"

    def test_user_id_validation_failure(self, validator):
        """Test failed user ID validation."""
        invalid_user_ids = [
            "user with spaces",
            "user!@#$%",
            "user/with/slashes",
        ]

        for user_id in invalid_user_ids:
            result = validator.validate(user_id, InputType.USER_ID)
            assert not result.is_valid, f"User ID should be invalid: {user_id}"

    def test_size_limits(self, validator):
        """Test size limit validation."""
        # Test string too long
        long_string = "a" * 20000  # Exceeds default limit
        result = validator.validate(long_string, InputType.STRING)

        assert not result.is_valid
        assert "too long" in result.errors[0]

        # Test user ID too long
        long_user_id = "a" * 300  # Exceeds user ID limit
        result = validator.validate(long_user_id, InputType.USER_ID)

        assert not result.is_valid
        assert "too long" in result.errors[0]

    def test_null_byte_injection(self, validator):
        """Test null byte injection detection."""
        malicious_input = "normal_text\x00malicious_content"
        result = validator.validate(malicious_input, InputType.STRING)

        assert not result.is_valid
        assert "null bytes" in result.errors[0]

    def test_custom_validation_rules(self, validator):
        """Test custom validation rules."""

        def validate_positive_number(value):
            return isinstance(value, (int, float)) and value > 0

        custom_rule = ValidationRule(
            name="positive_number",
            description="Must be positive number",
            validator_func=validate_positive_number,
            error_message="Value must be a positive number",
        )

        # Test successful validation
        result = validator.validate(
            42, InputType.INTEGER, additional_rules=[custom_rule]
        )
        assert result.is_valid

        # Test failed validation
        result = validator.validate(
            -5, InputType.INTEGER, additional_rules=[custom_rule]
        )
        assert not result.is_valid
        assert "positive number" in result.errors[0]

    def test_strict_validation_level(self, strict_validator):
        """Test strict validation level differences."""
        # Test that strict mode rejects more content
        borderline_input = "text with <em>emphasis</em>"

        result = strict_validator.validate(borderline_input, InputType.STRING)
        # Strict mode should be more restrictive
        assert result.sanitized_value != borderline_input  # Should be sanitized

    def test_mcp_tool_input_validation(self, validator):
        """Test MCP tool input validation."""
        tool_inputs = {
            "user_id": "test_user_123",
            "amount": 1000.50,
            "active": True,
            "metadata": {"key": "value"},
        }

        results = validator.validate_mcp_tool_input(
            tool_name="fraud_query_tool", inputs=tool_inputs
        )

        # Check all validations passed
        for field_name, result in results.items():
            if field_name == "tool_name":
                assert result.is_valid, f"Tool name validation failed"
            else:
                assert (
                    result.is_valid
                ), f"Field {field_name} validation failed: {result.errors}"

    def test_validation_summary(self, validator):
        """Test validation summary creation."""
        results = {
            "field1": ValidationResult(is_valid=True, sanitized_value="value1"),
            "field2": ValidationResult(
                is_valid=False, errors=["Error 1"], risk_score=0.8
            ),
            "field3": ValidationResult(
                is_valid=True, sanitized_value="value3", warnings=["Warning 1"]
            ),
        }

        summary = validator.create_validation_summary(results)

        assert summary["total_fields"] == 3
        assert summary["valid_fields"] == 2
        assert summary["invalid_fields"] == 1
        assert summary["total_errors"] == 1
        assert summary["total_warnings"] == 1
        assert summary["max_risk_score"] == 0.8
        assert summary["overall_valid"] is False


class TestFraudInvestigationValidator:
    """Test fraud investigation specific validator."""

    def test_create_fraud_validator(self):
        """Test fraud validator creation."""
        validator = create_fraud_investigation_validator()

        assert isinstance(validator, MCPInputValidator)
        assert validator.validation_level == ValidationLevel.STRICT
        assert len(validator.custom_rules) > 0

    def test_fraud_specific_validations(self):
        """Test fraud-specific validation rules."""
        validator = create_fraud_investigation_validator()

        # Test transaction amount validation would be applied
        # (This would need the actual tool field to test)
        assert "fraud_database_query.amount" in validator.custom_rules
        assert "risk_assessment.risk_score" in validator.custom_rules
        assert "fraud_pattern_matching.confidence_threshold" in validator.custom_rules


class TestValidationRateLimiter:
    """Test validation rate limiter."""

    def test_rate_limiter_allows_requests(self):
        """Test rate limiter allows requests within limit."""
        limiter = ValidationRateLimiter(requests_per_minute=10)

        # Should allow first few requests
        for i in range(5):
            assert limiter.is_allowed("test_ip")

    def test_rate_limiter_blocks_excess_requests(self):
        """Test rate limiter blocks excess requests."""
        limiter = ValidationRateLimiter(requests_per_minute=3)

        # Use up the limit
        for i in range(3):
            assert limiter.is_allowed("test_ip")

        # Should now block
        assert not limiter.is_allowed("test_ip")

    def test_rate_limiter_different_ips(self):
        """Test rate limiter tracks IPs separately."""
        limiter = ValidationRateLimiter(requests_per_minute=2)

        # Use up limit for first IP
        assert limiter.is_allowed("ip1")
        assert limiter.is_allowed("ip1")
        assert not limiter.is_allowed("ip1")

        # Second IP should still work
        assert limiter.is_allowed("ip2")
        assert limiter.is_allowed("ip2")


class TestValidationResult:
    """Test validation result structure."""

    def test_validation_result_creation(self):
        """Test validation result creation."""
        result = ValidationResult(
            is_valid=True,
            sanitized_value="test_value",
            errors=["error1"],
            warnings=["warning1"],
            risk_score=0.5,
        )

        assert result.is_valid
        assert result.sanitized_value == "test_value"
        assert "error1" in result.errors
        assert "warning1" in result.warnings
        assert result.risk_score == 0.5

    def test_validation_result_defaults(self):
        """Test validation result default values."""
        result = ValidationResult(is_valid=True)

        assert result.sanitized_value is None
        assert result.errors == []
        assert result.warnings == []
        assert result.risk_score == 0.0
        assert result.validation_metadata == {}


class TestInputTypeDetection:
    """Test input type detection logic."""

    def test_determine_input_type_by_field_name(self):
        """Test input type detection by field name."""
        validator = MCPInputValidator()

        # Test field name patterns
        assert (
            validator._determine_input_type("user_id", "test", None)
            == InputType.USER_ID
        )
        assert (
            validator._determine_input_type("transaction_id", "test", None)
            == InputType.TRANSACTION_ID
        )
        assert (
            validator._determine_input_type("device_id", "test", None)
            == InputType.DEVICE_ID
        )
        assert (
            validator._determine_input_type("email_address", "test", None)
            == InputType.EMAIL
        )
        assert validator._determine_input_type("api_url", "test", None) == InputType.URL
        assert validator._determine_input_type("ip", "test", None) == InputType.IP

    def test_determine_input_type_by_value(self):
        """Test input type detection by value type."""
        validator = MCPInputValidator()

        # Test value type detection
        assert (
            validator._determine_input_type("unknown", True, None) == InputType.BOOLEAN
        )
        assert validator._determine_input_type("unknown", 42, None) == InputType.INTEGER
        assert validator._determine_input_type("unknown", 3.14, None) == InputType.FLOAT
        assert (
            validator._determine_input_type("unknown", {"key": "value"}, None)
            == InputType.JSON
        )
        assert (
            validator._determine_input_type("unknown", ["item1", "item2"], None)
            == InputType.JSON
        )
        assert (
            validator._determine_input_type("unknown", "default", None)
            == InputType.STRING
        )

    def test_determine_input_type_by_schema(self):
        """Test input type detection by schema."""
        validator = MCPInputValidator()

        schema = {
            "field1": {"type": "integer"},
            "field2": {"type": "boolean"},
            "field3": {"type": "object"},
        }

        assert (
            validator._determine_input_type("field1", "123", schema)
            == InputType.INTEGER
        )
        assert (
            validator._determine_input_type("field2", "true", schema)
            == InputType.BOOLEAN
        )
        assert validator._determine_input_type("field3", {}, schema) == InputType.JSON

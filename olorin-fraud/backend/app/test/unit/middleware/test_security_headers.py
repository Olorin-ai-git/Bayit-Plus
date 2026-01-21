"""
Tests for Security Headers Middleware.

This test module validates that security headers are properly configured
and applied to HTTP responses.
"""

import os
from unittest.mock import patch

import pytest

from app.middleware.security_headers import (
    SecurityHeadersConfig,
    get_security_headers,
)


class TestSecurityHeadersConfig:
    """Test suite for SecurityHeadersConfig class."""

    def test_default_configuration(self):
        """Test that default configuration is loaded when environment variables are not set."""
        with patch.dict(os.environ, {}, clear=True):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            # Verify all required security headers are present
            assert "Content-Security-Policy" in headers
            assert "Strict-Transport-Security" in headers
            assert "X-Frame-Options" in headers
            assert "X-Content-Type-Options" in headers
            assert "X-XSS-Protection" in headers
            assert "Referrer-Policy" in headers
            assert "Permissions-Policy" in headers

    def test_custom_csp_from_environment(self):
        """Test that CSP can be customized via environment variable."""
        custom_csp = "default-src 'none'; script-src 'self' https://cdn.example.com"
        with patch.dict(os.environ, {"SECURITY_CSP": custom_csp}):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            assert headers["Content-Security-Policy"] == custom_csp

    def test_hsts_configuration(self):
        """Test HSTS header configuration from environment variables."""
        with patch.dict(
            os.environ,
            {
                "SECURITY_HSTS_MAX_AGE": "63072000",
                "SECURITY_HSTS_INCLUDE_SUBDOMAINS": "true",
                "SECURITY_HSTS_PRELOAD": "true",
            },
        ):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            hsts = headers["Strict-Transport-Security"]
            assert "max-age=63072000" in hsts
            assert "includeSubDomains" in hsts
            assert "preload" in hsts

    def test_hsts_without_preload(self):
        """Test HSTS header without preload directive."""
        with patch.dict(
            os.environ,
            {
                "SECURITY_HSTS_MAX_AGE": "31536000",
                "SECURITY_HSTS_INCLUDE_SUBDOMAINS": "false",
                "SECURITY_HSTS_PRELOAD": "false",
            },
        ):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            hsts = headers["Strict-Transport-Security"]
            assert "max-age=31536000" in hsts
            assert "includeSubDomains" not in hsts
            assert "preload" not in hsts

    def test_x_frame_options_deny(self):
        """Test X-Frame-Options set to DENY."""
        with patch.dict(os.environ, {"SECURITY_X_FRAME_OPTIONS": "DENY"}):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            assert headers["X-Frame-Options"] == "DENY"

    def test_x_frame_options_sameorigin(self):
        """Test X-Frame-Options set to SAMEORIGIN."""
        with patch.dict(os.environ, {"SECURITY_X_FRAME_OPTIONS": "SAMEORIGIN"}):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            assert headers["X-Frame-Options"] == "SAMEORIGIN"

    def test_x_content_type_options(self):
        """Test X-Content-Type-Options is set to nosniff."""
        config = SecurityHeadersConfig()
        headers = config.get_headers()

        assert headers["X-Content-Type-Options"] == "nosniff"

    def test_referrer_policy_customization(self):
        """Test Referrer-Policy can be customized."""
        custom_policy = "no-referrer"
        with patch.dict(os.environ, {"SECURITY_REFERRER_POLICY": custom_policy}):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            assert headers["Referrer-Policy"] == custom_policy

    def test_permissions_policy_customization(self):
        """Test Permissions-Policy can be customized."""
        custom_policy = "camera=(), microphone=(), geolocation=(self)"
        with patch.dict(os.environ, {"SECURITY_PERMISSIONS_POLICY": custom_policy}):
            config = SecurityHeadersConfig()
            headers = config.get_headers()

            assert headers["Permissions-Policy"] == custom_policy

    def test_validation_success(self):
        """Test that validation passes with valid configuration."""
        with patch.dict(
            os.environ,
            {
                "SECURITY_HSTS_MAX_AGE": "31536000",
                "SECURITY_X_FRAME_OPTIONS": "DENY",
                "SECURITY_X_CONTENT_TYPE_OPTIONS": "nosniff",
            },
        ):
            config = SecurityHeadersConfig()
            assert config.validate() is True

    def test_validation_fails_invalid_hsts(self):
        """Test that validation fails with invalid HSTS configuration."""
        with patch.dict(os.environ, {"SECURITY_HSTS_MAX_AGE": "-1"}):
            config = SecurityHeadersConfig()
            with pytest.raises(ValueError, match="HSTS max-age must be positive"):
                config.validate()

    def test_validation_fails_invalid_frame_options(self):
        """Test that validation fails with invalid X-Frame-Options."""
        with patch.dict(os.environ, {"SECURITY_X_FRAME_OPTIONS": "ALLOW-ALL"}):
            config = SecurityHeadersConfig()
            with pytest.raises(ValueError, match="X-Frame-Options must be one of"):
                config.validate()

    def test_validation_fails_invalid_content_type_options(self):
        """Test that validation fails with invalid X-Content-Type-Options."""
        with patch.dict(os.environ, {"SECURITY_X_CONTENT_TYPE_OPTIONS": "sniff"}):
            config = SecurityHeadersConfig()
            with pytest.raises(
                ValueError, match="X-Content-Type-Options must be 'nosniff'"
            ):
                config.validate()


class TestGetSecurityHeaders:
    """Test suite for get_security_headers function."""

    def test_get_security_headers_returns_dict(self):
        """Test that get_security_headers returns a dictionary."""
        headers = get_security_headers()
        assert isinstance(headers, dict)

    def test_get_security_headers_contains_all_headers(self):
        """Test that all required security headers are present."""
        headers = get_security_headers()

        required_headers = [
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
            "Permissions-Policy",
        ]

        for header in required_headers:
            assert header in headers, f"Missing required header: {header}"

    def test_get_security_headers_values_not_empty(self):
        """Test that security header values are not empty."""
        headers = get_security_headers()

        for header_name, header_value in headers.items():
            assert header_value, f"Header {header_name} has empty value"
            assert isinstance(
                header_value, str
            ), f"Header {header_name} value is not a string"

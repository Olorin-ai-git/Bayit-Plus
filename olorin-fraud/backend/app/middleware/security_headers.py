"""
Security Headers Middleware for Olorin FastAPI Backend.

This module provides comprehensive security headers middleware that protects against
common web vulnerabilities including XSS, clickjacking, MIME-sniffing, and more.

All header values are configurable via environment variables to comply with
the SYSTEM MANDATE requirement of no hardcoded values.
"""

import os
from typing import Dict

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SecurityHeadersConfig:
    """
    Configuration class for security headers with environment variable loading.

    All security header values are loaded from environment variables with secure defaults.
    This ensures compliance with the SYSTEM MANDATE requirement that all variable values
    must come from configuration, never hardcoded literals.
    """

    def __init__(self):
        """Initialize security headers configuration from environment variables."""
        # Content Security Policy - prevents XSS attacks
        self.csp = os.getenv(
            "SECURITY_CSP",
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'",
        )

        # HTTP Strict Transport Security - forces HTTPS
        hsts_max_age = int(os.getenv("SECURITY_HSTS_MAX_AGE", "31536000"))
        hsts_include_subdomains = (
            os.getenv("SECURITY_HSTS_INCLUDE_SUBDOMAINS", "true").lower() == "true"
        )
        hsts_preload = os.getenv("SECURITY_HSTS_PRELOAD", "false").lower() == "true"

        hsts_parts = [f"max-age={hsts_max_age}"]
        if hsts_include_subdomains:
            hsts_parts.append("includeSubDomains")
        if hsts_preload:
            hsts_parts.append("preload")
        self.hsts = "; ".join(hsts_parts)

        # X-Frame-Options - prevents clickjacking
        self.x_frame_options = os.getenv("SECURITY_X_FRAME_OPTIONS", "DENY")

        # X-Content-Type-Options - prevents MIME-sniffing
        self.x_content_type_options = os.getenv(
            "SECURITY_X_CONTENT_TYPE_OPTIONS", "nosniff"
        )

        # X-XSS-Protection - legacy XSS protection (for older browsers)
        self.x_xss_protection = os.getenv("SECURITY_X_XSS_PROTECTION", "1; mode=block")

        # Referrer-Policy - controls referrer information
        self.referrer_policy = os.getenv(
            "SECURITY_REFERRER_POLICY", "strict-origin-when-cross-origin"
        )

        # Permissions-Policy - controls browser features
        self.permissions_policy = os.getenv(
            "SECURITY_PERMISSIONS_POLICY",
            "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        )

        # Log configuration on initialization
        self._log_configuration()

    def _log_configuration(self):
        """Log security headers configuration for audit purposes."""
        logger.debug("Security Headers Configuration:")
        logger.debug(f"  CSP: {self.csp[:100]}...")
        logger.debug(f"  HSTS: {self.hsts}")
        logger.debug(f"  X-Frame-Options: {self.x_frame_options}")
        logger.debug(f"  X-Content-Type-Options: {self.x_content_type_options}")
        logger.debug(f"  X-XSS-Protection: {self.x_xss_protection}")
        logger.debug(f"  Referrer-Policy: {self.referrer_policy}")
        logger.debug(f"  Permissions-Policy: {self.permissions_policy}")

    def get_headers(self) -> Dict[str, str]:
        """
        Get security headers dictionary for response.

        Returns:
            Dictionary of security header names and values
        """
        return {
            "Content-Security-Policy": self.csp,
            "Strict-Transport-Security": self.hsts,
            "X-Frame-Options": self.x_frame_options,
            "X-Content-Type-Options": self.x_content_type_options,
            "X-XSS-Protection": self.x_xss_protection,
            "Referrer-Policy": self.referrer_policy,
            "Permissions-Policy": self.permissions_policy,
        }

    def validate(self) -> bool:
        """
        Validate security headers configuration.

        Returns:
            True if configuration is valid, raises exception otherwise

        Raises:
            ValueError: If any security header configuration is invalid
        """
        # Validate HSTS max-age is positive
        if "max-age=" not in self.hsts:
            raise ValueError("HSTS header must contain max-age directive")

        try:
            max_age_value = int(self.hsts.split("max-age=")[1].split(";")[0])
            if max_age_value <= 0:
                raise ValueError("HSTS max-age must be positive")
        except (IndexError, ValueError) as e:
            raise ValueError(f"Invalid HSTS max-age value: {e}")

        # Validate X-Frame-Options value
        valid_frame_options = ["DENY", "SAMEORIGIN"]
        if self.x_frame_options not in valid_frame_options:
            raise ValueError(
                f"X-Frame-Options must be one of {valid_frame_options}, "
                f"got: {self.x_frame_options}"
            )

        # Validate X-Content-Type-Options
        if self.x_content_type_options != "nosniff":
            raise ValueError(
                f"X-Content-Type-Options must be 'nosniff', "
                f"got: {self.x_content_type_options}"
            )

        logger.debug("Security headers configuration validation passed")
        return True


# Create singleton instance with fail-fast validation
_security_headers_config = SecurityHeadersConfig()
_security_headers_config.validate()


def get_security_headers() -> Dict[str, str]:
    """
    Get security headers for adding to HTTP responses.

    This is the main function to use for retrieving security headers.
    Headers are loaded from environment variables via SecurityHeadersConfig.

    Returns:
        Dictionary of security header names and values
    """
    return _security_headers_config.get_headers()

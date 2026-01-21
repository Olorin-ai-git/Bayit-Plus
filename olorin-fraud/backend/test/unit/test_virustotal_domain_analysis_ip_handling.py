"""Test VirusTotal Domain Analysis Tool IP Address Handling."""

import json

import pytest
from pydantic import ValidationError

from app.service.agent.tools.threat_intelligence_tool.virustotal.domain_analysis_tool import (
    DomainAnalysisInput,
    VirusTotalDomainAnalysisTool,
)


class TestDomainAnalysisInputValidation:
    """Test validation of domain analysis inputs, especially IP address handling."""

    def test_valid_domain_names(self):
        """Test that valid domain names pass validation."""
        valid_domains = [
            "example.com",
            "sub.example.com",
            "test-site.co.uk",
            "my.long.subdomain.example.org",
            "xn--fsq.xn--0zwm56d",  # IDN domain
        ]

        for domain in valid_domains:
            input_data = DomainAnalysisInput(domain=domain)
            assert input_data.domain == domain

    def test_domain_cleaning(self):
        """Test that domains are properly cleaned of protocols and paths."""
        test_cases = [
            ("http://example.com", "example.com"),
            ("https://example.com", "example.com"),
            ("example.com/path/to/page", "example.com"),
            ("https://example.com/path", "example.com"),
            ("  EXAMPLE.COM  ", "example.com"),
        ]

        for input_domain, expected_domain in test_cases:
            input_data = DomainAnalysisInput(domain=input_domain)
            assert input_data.domain == expected_domain

    def test_ip_addresses_rejected(self):
        """Test that IP addresses are properly rejected with helpful error message."""
        ip_addresses = [
            "67.76.8.209",
            "192.168.1.1",
            "10.0.0.1",
            "172.16.0.1",
            "8.8.8.8",
            "2001:db8::1",  # IPv6
            "::1",  # IPv6 localhost
            "127.0.0.1",  # IPv4 localhost
        ]

        for ip in ip_addresses:
            with pytest.raises(ValidationError) as exc_info:
                DomainAnalysisInput(domain=ip)

            # Check that error message mentions IP addresses and suggests alternatives
            error_message = str(exc_info.value)
            assert "IP address" in error_message
            assert "not supported" in error_message
            assert "IP analysis tools instead" in error_message

    def test_bytes_input_handling(self):
        """Test that bytes input is properly decoded and handled."""
        # Test valid domain as bytes
        domain_bytes = b"example.com"
        input_data = DomainAnalysisInput(domain=domain_bytes)
        assert input_data.domain == "example.com"

        # Test IP address as bytes (should still be rejected)
        ip_bytes = b"67.76.8.209"
        with pytest.raises(ValidationError) as exc_info:
            DomainAnalysisInput(domain=ip_bytes)
        assert "IP address" in str(exc_info.value)

    def test_invalid_domain_formats(self):
        """Test that invalid domain formats are rejected."""
        invalid_domains = [
            "",
            "   ",
            "domain-without-tld",
            ".example.com",
            "example.com.",
            "example..com",
            "a" * 254,  # Too long
        ]

        for invalid_domain in invalid_domains:
            with pytest.raises(ValidationError):
                DomainAnalysisInput(domain=invalid_domain)

    def test_max_detections_validation(self):
        """Test that max_detections parameter is properly validated."""
        # Valid range
        for valid_max in [1, 10, 25, 50]:
            input_data = DomainAnalysisInput(
                domain="example.com", max_detections=valid_max
            )
            assert input_data.max_detections == valid_max

        # Invalid range
        for invalid_max in [0, -1, 51, 100]:
            with pytest.raises(ValidationError):
                DomainAnalysisInput(domain="example.com", max_detections=invalid_max)


class TestVirusTotalDomainAnalysisToolErrorHandling:
    """Test the actual tool's error handling for IP addresses."""

    def test_tool_ip_address_error_response(self):
        """Test that the tool returns proper error response for IP addresses."""
        tool = VirusTotalDomainAnalysisTool()

        # Test with IP address - this should trigger validation error
        # The validation happens when the input is created through the args_schema
        with pytest.raises(ValidationError) as exc_info:
            # This simulates what happens when LangChain calls the tool
            tool.args_schema(domain="67.76.8.209")

        # Verify the error message
        error_message = str(exc_info.value)
        assert "IP address" in error_message
        assert "not supported" in error_message

    def test_tool_description_mentions_ip_limitation(self):
        """Test that the tool description clearly states IP address limitation."""
        tool = VirusTotalDomainAnalysisTool()

        assert "domain names only" in tool.description
        assert "not IP addresses" in tool.description
        assert "IP analysis tools for IP addresses" in tool.description

    def test_input_schema_description_mentions_ip_limitation(self):
        """Test that the input schema clearly states IP address limitation."""
        # Check the domain field description using Pydantic v2 syntax
        domain_field = DomainAnalysisInput.model_fields["domain"]
        description = domain_field.description

        assert "IP addresses are not supported" in description
        assert "use IP analysis tools instead" in description

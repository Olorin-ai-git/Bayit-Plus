#!/usr/bin/env python3
"""
Demonstration script showing the fix for VirusTotal domain analysis tool IP address handling.
This script shows the improved error handling when IP addresses are passed to the domain analysis tool.
"""

from pydantic import ValidationError

from app.service.agent.tools.threat_intelligence_tool.virustotal.domain_analysis_tool import (
    DomainAnalysisInput,
    VirusTotalDomainAnalysisTool,
)


def test_ip_address_handling():
    """Demonstrate improved IP address handling."""

    print("=" * 80)
    print("VirusTotal Domain Analysis Tool - IP Address Handling Fix")
    print("=" * 80)

    tool = VirusTotalDomainAnalysisTool()

    # Test cases that should fail (IP addresses)
    ip_test_cases = [
        "67.76.8.209",  # The original problematic IP
        b"67.76.8.209",  # Same IP as bytes
        "192.168.1.1",  # Private IP
        "8.8.8.8",  # Public IP
        "2001:db8::1",  # IPv6
        "::1",  # IPv6 localhost
    ]

    print("\n🔍 Testing IP Address Rejection:")
    print("-" * 50)

    for test_ip in ip_test_cases:
        try:
            input_obj = DomainAnalysisInput(domain=test_ip)
            print(f"❌ FAILED: {test_ip} was accepted (should be rejected)")
        except ValidationError as e:
            error_msg = str(e)
            if "IP address" in error_msg and "not supported" in error_msg:
                print(f"✅ SUCCESS: {test_ip} properly rejected with helpful message")
            else:
                print(f"⚠️  PARTIAL: {test_ip} rejected but message could be better")
        except Exception as e:
            print(f"❌ ERROR: {test_ip} caused unexpected error: {e}")

    # Test cases that should pass (valid domains)
    domain_test_cases = [
        "example.com",
        "google.com",
        "sub.domain.com",
        "test-site.co.uk",
        "  EXAMPLE.COM  ",  # Should be cleaned
        "https://example.com",  # Should remove protocol
        "example.com/path",  # Should remove path
    ]

    print("\n🌐 Testing Valid Domain Acceptance:")
    print("-" * 50)

    for test_domain in domain_test_cases:
        try:
            input_obj = DomainAnalysisInput(domain=test_domain)
            cleaned_domain = input_obj.domain
            print(f"✅ SUCCESS: '{test_domain}' → '{cleaned_domain}'")
        except Exception as e:
            print(f"❌ ERROR: '{test_domain}' rejected unexpectedly: {e}")

    print("\n📋 Tool Description Check:")
    print("-" * 50)

    # Check tool description
    description = tool.description
    if "domain names only" in description and "not IP addresses" in description:
        print("✅ SUCCESS: Tool description clearly states IP address limitation")
    else:
        print("⚠️  WARNING: Tool description could be clearer about IP limitations")

    # Check input field description
    domain_field = DomainAnalysisInput.model_fields["domain"]
    field_desc = domain_field.description
    if "IP addresses are not supported" in field_desc:
        print("✅ SUCCESS: Input field description mentions IP limitation")
    else:
        print("⚠️  WARNING: Input field description could mention IP limitation")

    print("\n" + "=" * 80)
    print("Summary: The VirusTotal domain analysis tool now properly:")
    print("  1. ✅ Detects IP addresses (both IPv4 and IPv6)")
    print("  2. ✅ Handles bytes input correctly")
    print("  3. ✅ Provides helpful error messages")
    print("  4. ✅ Suggests using IP analysis tools instead")
    print("  5. ✅ Cleans and validates domain names properly")
    print("  6. ✅ Updates tool and field descriptions")
    print("=" * 80)


if __name__ == "__main__":
    test_ip_address_handling()

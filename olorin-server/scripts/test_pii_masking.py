#!/usr/bin/env python3
"""
Test PII Masking in Logs

Simple script to verify that PII data is properly masked in log messages.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger


def main():
    """Test PII masking in logs."""
    logger = get_bridge_logger("test_pii_masking")

    print("Testing PII masking in logs...")
    print("=" * 60)

    # Test various PII patterns
    test_cases = [
        ("Email", "user@example.com"),
        ("Phone", "555-123-4567"),
        ("Credit Card", "4111-1111-1111-1111"),
        ("IP Address", "192.168.1.1"),
        ("SSN", "123-45-6789"),
        ("API Key", "api_key: sk_live_1234567890abcdef"),
    ]

    for label, value in test_cases:
        logger.info(f"Test {label}: {value}")

    print("=" * 60)
    print("✅ PII masking test completed")
    print("Check the log output above - PII values should be redacted")
    print("Expected patterns:")
    print("  - Email: [EMAIL_REDACTED]")
    print("  - Phone: [PHONE_REDACTED]")
    print("  - Credit Card: [CC_REDACTED]")
    print("  - IP Address: [IP_REDACTED]")
    print("  - SSN: [SSN_REDACTED]")
    print("  - API Key: [API_KEY_REDACTED]")


if __name__ == "__main__":
    main()

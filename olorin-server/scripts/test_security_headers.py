#!/usr/bin/env python3
"""
Manual test script to verify security headers are applied to HTTP responses.

This script starts the Olorin FastAPI application and makes a test request
to verify that all required security headers are present in the response.
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.service import create_app


def test_security_headers():
    """Test that security headers are present in HTTP responses."""
    print("Creating FastAPI application...")
    app = create_app()

    print("Creating test client...")
    client = TestClient(app)

    print("\nTesting health endpoint...")
    response = client.get("/health")

    print(f"Response status: {response.status_code}")
    print("\nSecurity Headers:")
    print("-" * 80)

    required_headers = [
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "X-XSS-Protection",
        "Referrer-Policy",
        "Permissions-Policy",
    ]

    all_present = True
    for header in required_headers:
        value = response.headers.get(header)
        if value:
            print(f"✅ {header}:")
            if len(value) > 100:
                print(f"   {value[:100]}...")
            else:
                print(f"   {value}")
        else:
            print(f"❌ {header}: MISSING")
            all_present = False

    print("-" * 80)

    if all_present:
        print("\n✅ SUCCESS: All required security headers are present!")
        return 0
    else:
        print("\n❌ FAILURE: Some security headers are missing!")
        return 1


if __name__ == "__main__":
    sys.exit(test_security_headers())

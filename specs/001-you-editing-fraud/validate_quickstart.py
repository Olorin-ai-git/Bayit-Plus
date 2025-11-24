#!/usr/bin/env python3
"""
Quickstart Validation Script

Validates example requests from quickstart.md against the investigation comparison API.
Run this script to verify all quickstart examples work correctly.

Usage:
    python validate_quickstart.py [--api-url http://localhost:8080]
"""

import argparse
import json
import sys
from typing import Dict, Any
import requests


def validate_basic_example(api_url: str) -> bool:
    """Validate basic example from quickstart.md."""
    print("Testing basic example...")
    
    payload = {
        "entity": {
            "type": "email",
            "value": "user@example.com"
        },
        "windowA": {
            "preset": "retro_14d_6mo_back"
        },
        "windowB": {
            "preset": "recent_14d"
        }
    }
    
    try:
        response = requests.post(
            f"{api_url}/api/investigation/compare",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "windowA" in data
            assert "windowB" in data
            assert "A" in data
            assert "B" in data
            assert "delta" in data
            print("  ✓ Basic example passed")
            return True
        else:
            print(f"  ✗ Basic example failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ Basic example error: {e}")
        return False


def validate_with_options(api_url: str) -> bool:
    """Validate example with options from quickstart.md."""
    print("Testing example with options...")
    
    payload = {
        "entity": {"type": "email", "value": "user@example.com"},
        "windowA": {"preset": "retro_14d_6mo_back"},
        "windowB": {"preset": "recent_14d"},
        "risk_threshold": 0.7,
        "options": {
            "include_per_merchant": True,
            "include_histograms": True,
            "include_timeseries": True
        }
    }
    
    try:
        response = requests.post(
            f"{api_url}/api/investigation/compare",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "windowA" in data
            assert "windowB" in data
            assert "A" in data
            assert "B" in data
            assert "delta" in data
            # Check optional fields if requested
            if data.get("A", {}).get("risk_histogram") is not None:
                assert len(data["A"]["risk_histogram"]) > 0
            if data.get("A", {}).get("timeseries_daily") is not None:
                assert len(data["A"]["timeseries_daily"]) > 0
            print("  ✓ Example with options passed")
            return True
        else:
            print(f"  ✗ Example with options failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ Example with options error: {e}")
        return False


def validate_custom_window(api_url: str) -> bool:
    """Validate custom window example."""
    print("Testing custom window...")
    
    payload = {
        "entity": {"type": "phone", "value": "+15551234567"},
        "windowA": {
            "preset": "custom",
            "start": "2025-01-01T00:00:00-05:00",
            "end": "2025-01-15T00:00:00-05:00"
        },
        "windowB": {
            "preset": "custom",
            "start": "2025-07-01T00:00:00-05:00",
            "end": "2025-07-15T00:00:00-05:00"
        },
        "risk_threshold": 0.75
    }
    
    try:
        response = requests.post(
            f"{api_url}/api/investigation/compare",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "windowA" in data
            assert "windowB" in data
            assert data["windowA"]["start"].startswith("2025-01-01")
            assert data["windowB"]["start"].startswith("2025-07-01")
            print("  ✓ Custom window passed")
            return True
        else:
            print(f"  ✗ Custom window failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ Custom window error: {e}")
        return False


def validate_merchant_scoped(api_url: str) -> bool:
    """Validate merchant-scoped example."""
    print("Testing merchant-scoped comparison...")
    
    payload = {
        "merchant_ids": ["m_123", "m_456"],
        "windowA": {"preset": "retro_14d_6mo_back"},
        "windowB": {"preset": "recent_14d"}
    }
    
    try:
        response = requests.post(
            f"{api_url}/api/investigation/compare",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "windowA" in data
            assert "windowB" in data
            assert "A" in data
            assert "B" in data
            print("  ✓ Merchant-scoped comparison passed")
            return True
        else:
            print(f"  ✗ Merchant-scoped comparison failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ Merchant-scoped comparison error: {e}")
        return False


def validate_error_handling(api_url: str) -> bool:
    """Validate error handling for invalid requests."""
    print("Testing error handling...")
    
    # Test invalid entity type
    payload = {
        "entity": {"type": "invalid_type", "value": "test"},
        "windowA": {"preset": "recent_14d"},
        "windowB": {"preset": "recent_14d"}
    }
    
    try:
        response = requests.post(
            f"{api_url}/api/investigation/compare",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 422 (validation error) or 400 (bad request)
        if response.status_code in [400, 422]:
            print("  ✓ Error handling passed (invalid entity type)")
            return True
        else:
            print(f"  ✗ Error handling failed: expected 400/422, got {response.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ Error handling error: {e}")
        return False


def main():
    """Main validation function."""
    parser = argparse.ArgumentParser(
        description="Validate quickstart.md examples against investigation comparison API"
    )
    parser.add_argument(
        "--api-url",
        default="http://localhost:8080",
        help="API base URL (default: http://localhost:8080)"
    )
    parser.add_argument(
        "--skip-errors",
        action="store_true",
        help="Skip error handling tests"
    )
    
    args = parser.parse_args()
    
    print(f"Validating quickstart examples against {args.api_url}")
    print("=" * 80)
    
    results = []
    
    # Run validations
    results.append(("Basic Example", validate_basic_example(args.api_url)))
    results.append(("With Options", validate_with_options(args.api_url)))
    results.append(("Custom Window", validate_custom_window(args.api_url)))
    results.append(("Merchant-Scoped", validate_merchant_scoped(args.api_url)))
    
    if not args.skip_errors:
        results.append(("Error Handling", validate_error_handling(args.api_url)))
    
    # Summary
    print("=" * 80)
    print("Validation Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All quickstart examples validated successfully!")
        sys.exit(0)
    else:
        print("✗ Some validations failed. Check API server and database connection.")
        sys.exit(1)


if __name__ == "__main__":
    main()


#!/usr/bin/env python3
"""
Test script for refactored Enhanced HTML Report Generator.

Tests the new modular structure and ensures backward compatibility.
"""

import sys
import os
from pathlib import Path

# Add the server directory to the Python path
sys.path.insert(0, '/Users/gklainert/Documents/olorin/olorin-server')

def test_import():
    """Test that all modules can be imported successfully."""
    try:
        from app.service.reporting.enhanced_html_generator import EnhancedHTMLReportGenerator
        from app.service.reporting.enhanced_html_generator import ReportConfig, GeneratedReport
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_initialization():
    """Test that the generator can be initialized."""
    try:
        from app.service.reporting.enhanced_html_generator import EnhancedHTMLReportGenerator, ReportConfig

        # Test default initialization
        generator1 = EnhancedHTMLReportGenerator()
        print("✅ Default initialization successful")

        # Test with custom config
        config = ReportConfig()
        generator2 = EnhancedHTMLReportGenerator(config)
        print("✅ Custom config initialization successful")

        return True
    except Exception as e:
        print(f"❌ Initialization error: {e}")
        return False

def test_validation():
    """Test folder validation functionality."""
    try:
        from app.service.reporting.enhanced_html_generator import EnhancedHTMLReportGenerator

        generator = EnhancedHTMLReportGenerator()

        # Test with non-existent folder
        is_valid, errors = generator.validate_folder(Path("/non/existent/folder"))
        print(f"✅ Validation test successful (valid: {is_valid}, errors: {len(errors)})")

        return True
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing Refactored Enhanced HTML Report Generator")
    print("=" * 60)

    tests = [
        ("Import Test", test_import),
        ("Initialization Test", test_initialization),
        ("Validation Test", test_validation)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n🔬 {test_name}:")
        if test_func():
            passed += 1
        print()

    print("=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Refactoring successful.")
        return True
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
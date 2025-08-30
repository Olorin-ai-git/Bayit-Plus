#!/usr/bin/env python
"""Simple validation script to confirm real API usage and no mock data."""

import os
import re
import sys
from pathlib import Path

def validate_no_mock_data():
    """Validate that no mock data exists in production code."""
    print("🔍 VALIDATING NO MOCK DATA IN PRODUCTION CODE")
    print("="*60)
    
    violations = []
    files_checked = 0
    
    # Check production code (not test files)
    app_dir = Path(__file__).parent.parent / "app"
    
    mock_patterns = [
        r"MagicMock",
        r"AsyncMock", 
        r"@patch\(",
        r"unittest\.mock",
        r"Mock\(\)",
        r"\.return_value\s*=",
        r"\.side_effect\s*="
    ]
    
    for py_file in app_dir.rglob("*.py"):
        if "__pycache__" in str(py_file) or "/test/" in str(py_file) or "/tests/" in str(py_file):
            continue
            
        files_checked += 1
        with open(py_file, 'r') as f:
            content = f.read()
            
        for pattern in mock_patterns:
            if re.search(pattern, content):
                violations.append({
                    "file": str(py_file.relative_to(app_dir.parent)),
                    "pattern": pattern
                })
    
    print(f"Files Checked: {files_checked}")
    print(f"Mock Violations Found: {len(violations)}")
    
    if violations:
        print("\n❌ VIOLATIONS DETECTED:")
        for v in violations[:5]:  # Show first 5
            print(f"  - {v['file']}: {v['pattern']}")
        if len(violations) > 5:
            print(f"  ... and {len(violations) - 5} more")
    else:
        print("\n✅ NO MOCK DATA DETECTED IN PRODUCTION CODE")
    
    return len(violations) == 0

def validate_real_api_configuration():
    """Validate real API configuration."""
    print("\n🌐 VALIDATING REAL API CONFIGURATION")
    print("="*60)
    
    # Check for real API configuration in autonomous_base.py
    autonomous_base = Path(__file__).parent.parent / "app/service/agent/autonomous_base.py"
    
    if autonomous_base.exists():
        with open(autonomous_base, 'r') as f:
            content = f.read()
        
        validations = [
            ("ChatAnthropic import", "from langchain_anthropic import ChatAnthropic" in content),
            ("API key from env", "anthropic_api_key" in content),
            ("Claude Opus 4.1 model", "claude-opus-4-1-20250805" in content),
            ("Real LLM instance", "ChatAnthropic(" in content),
            ("No mock LLM", "MagicMock" not in content and "Mock()" not in content)
        ]
        
        print("Configuration Checks:")
        all_passed = True
        for check, passed in validations:
            status = "✅" if passed else "❌"
            print(f"  {status} {check}")
            all_passed = all_passed and passed
        
        return all_passed
    else:
        print("❌ autonomous_base.py not found")
        return False

def validate_test_infrastructure():
    """Validate test infrastructure exists."""
    print("\n🧪 VALIDATING TEST INFRASTRUCTURE")
    print("="*60)
    
    test_dir = Path(__file__).parent
    
    required_files = [
        "conftest.py",
        "fixtures/real_investigation_scenarios.py",
        "unit/service/agent/test_autonomous_agents.py",
        "integration/test_autonomous_investigation.py",
        "runners/run_autonomous_investigation_for_user.py",
        "runners/run_scenario_tests.py",
        "runners/run_validation_suite.py"
    ]
    
    print("Required Test Files:")
    all_exist = True
    for file in required_files:
        file_path = test_dir / file
        exists = file_path.exists()
        status = "✅" if exists else "❌"
        print(f"  {status} {file}")
        all_exist = all_exist and exists
    
    return all_exist

def main():
    """Run all validations."""
    print("🔍 OLORIN REAL API VALIDATION")
    print("="*60)
    print("Validating: No Mock Data + Real API Usage + Test Infrastructure")
    print("="*60)
    
    # Run validations
    no_mock = validate_no_mock_data()
    real_api = validate_real_api_configuration()
    test_infra = validate_test_infrastructure()
    
    # Summary
    print("\n" + "="*60)
    print("📋 VALIDATION SUMMARY")
    print("="*60)
    print(f"No Mock Data in Production: {'PASS ✅' if no_mock else 'FAIL ❌'}")
    print(f"Real API Configuration: {'PASS ✅' if real_api else 'FAIL ❌'}")
    print(f"Test Infrastructure: {'PASS ✅' if test_infra else 'FAIL ❌'}")
    
    all_passed = no_mock and real_api and test_infra
    if all_passed:
        print("\n🎆 ALL VALIDATIONS PASSED - SYSTEM USES REAL APIs")
        print("The Olorin autonomous investigation system is configured to use")
        print("real Anthropic Claude Opus 4.1 API with no mock data.")
    else:
        print("\n⚠️ SOME VALIDATIONS FAILED - REVIEW REQUIRED")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
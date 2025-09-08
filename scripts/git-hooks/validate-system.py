#!/usr/bin/env python3
"""
Mock Data Detection System Validation Script

This script performs comprehensive validation of the mock data detection system
to ensure all components are working correctly together.

Author: Gil Klainert  
Created: 2025-09-08
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple

def print_header(title: str) -> None:
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"{title:^60}")
    print(f"{'='*60}")

def print_success(message: str) -> None:
    """Print success message"""
    print(f"✅ {message}")

def print_error(message: str) -> None:
    """Print error message"""
    print(f"❌ {message}")

def print_info(message: str) -> None:
    """Print info message"""
    print(f"ℹ️  {message}")

def check_file_exists(file_path: Path, description: str) -> bool:
    """Check if a file exists and is accessible"""
    if file_path.exists():
        print_success(f"{description}: {file_path}")
        return True
    else:
        print_error(f"{description} not found: {file_path}")
        return False

def check_executable(file_path: Path, description: str) -> bool:
    """Check if a file is executable"""
    if file_path.exists() and os.access(file_path, os.X_OK):
        print_success(f"{description} is executable: {file_path}")
        return True
    else:
        print_error(f"{description} is not executable: {file_path}")
        return False

def run_command(cmd: List[str], description: str, expect_success: bool = True) -> Tuple[bool, str]:
    """Run a command and check its result"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if expect_success:
            if result.returncode == 0:
                print_success(f"{description}: Command succeeded")
                return True, result.stdout
            else:
                print_error(f"{description}: Command failed (exit code {result.returncode})")
                print(f"  STDERR: {result.stderr[:200]}")
                return False, result.stderr
        else:
            if result.returncode != 0:
                print_success(f"{description}: Command failed as expected")
                return True, result.stderr
            else:
                print_error(f"{description}: Command succeeded but was expected to fail")
                return False, result.stdout
    
    except subprocess.TimeoutExpired:
        print_error(f"{description}: Command timed out")
        return False, "Timeout"
    except Exception as e:
        print_error(f"{description}: Exception occurred: {e}")
        return False, str(e)

def create_test_files() -> Path:
    """Create temporary test files with known violations"""
    test_dir = Path(tempfile.mkdtemp(prefix="mock_validation_"))
    
    # File with CRITICAL violations
    critical_file = test_dir / "critical_violations.py"
    critical_file.write_text('''
# Critical mock data violations
mock_api_key = "sk-test-12345"
fake_password = "password123"
test_credit_card = "4111-1111-1111-1111"
DEMO_SECRET = "changeme"
''')
    
    # File with HIGH violations
    high_file = test_dir / "high_violations.js"
    high_file.write_text('''
// High severity violations
const user = {
    email: "test@example.com",
    phone: "555-0123",
    name: "John Doe",
    address: "123 Main St"
};
''')
    
    # Legitimate test file (should be excluded)
    test_file = test_dir / "test" / "legitimate_test.py"
    test_file.parent.mkdir(exist_ok=True)
    test_file.write_text('''
# This is a legitimate test file
def test_user_creation():
    mock_user = {"name": "Test User"}  # This should not be flagged
    assert create_user(mock_user)
''')
    
    # Clean file (no violations)
    clean_file = test_dir / "clean_file.py"
    clean_file.write_text('''
# Clean production code
def process_user_data(user_id: int):
    user = database.get_user(user_id)
    return transform_user_data(user)
''')
    
    print_info(f"Created test files in: {test_dir}")
    return test_dir

def validate_file_structure() -> bool:
    """Validate that all required files exist"""
    print_header("FILE STRUCTURE VALIDATION")
    
    script_dir = Path(__file__).parent
    all_good = True
    
    files_to_check = [
        (script_dir / "detect-mock-data.py", "Mock data detector script"),
        (script_dir / "mock-detection-config.yml", "Configuration file"),
        (script_dir / "pre-commit-hook.sh", "Pre-commit hook script"),
        (script_dir / "test-mock-detector.py", "Test suite"),
        (script_dir / ".mockignore", "Whitelist file"),
        (script_dir / "README.md", "Documentation")
    ]
    
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_good = False
    
    return all_good

def validate_executables() -> bool:
    """Validate that scripts are executable"""
    print_header("EXECUTABLE VALIDATION")
    
    script_dir = Path(__file__).parent
    all_good = True
    
    executables = [
        (script_dir / "detect-mock-data.py", "Mock data detector"),
        (script_dir / "pre-commit-hook.sh", "Pre-commit hook"),
        (script_dir / "test-mock-detector.py", "Test suite")
    ]
    
    for file_path, description in executables:
        if not check_executable(file_path, description):
            all_good = False
    
    return all_good

def validate_detector_functionality() -> bool:
    """Validate core detector functionality"""
    print_header("DETECTOR FUNCTIONALITY VALIDATION")
    
    script_dir = Path(__file__).parent
    detector_script = script_dir / "detect-mock-data.py"
    all_good = True
    
    # Test help command
    success, output = run_command([
        "python3", str(detector_script), "--help"
    ], "Help command test")
    
    if not success:
        all_good = False
    
    # Create test environment
    test_dir = create_test_files()
    
    try:
        # Test directory scan with violations (should fail)
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            json_report = f.name
        
        success, output = run_command([
            "python3", str(detector_script),
            "--directory", str(test_dir),
            "--output-json", json_report,
            "--quiet"
        ], "Directory scan with violations", expect_success=False)
        
        if success:
            # Validate JSON report
            try:
                with open(json_report, 'r') as f:
                    report = json.load(f)
                
                violations = report.get('detailed_violations', [])
                if len(violations) > 0:
                    print_success(f"Found {len(violations)} violations as expected")
                    
                    # Check severity distribution
                    severities = [v['severity'] for v in violations]
                    if 'CRITICAL' in severities and 'HIGH' in severities:
                        print_success("Multiple severity levels detected correctly")
                    else:
                        print_error("Severity levels not detected correctly")
                        all_good = False
                else:
                    print_error("No violations detected in test files")
                    all_good = False
            
            except json.JSONDecodeError:
                print_error("Invalid JSON report generated")
                all_good = False
            except Exception as e:
                print_error(f"Error reading JSON report: {e}")
                all_good = False
        else:
            all_good = False
        
        # Clean up
        if os.path.exists(json_report):
            os.unlink(json_report)
    
    finally:
        # Clean up test directory
        import shutil
        shutil.rmtree(test_dir)
    
    return all_good

def validate_configuration() -> bool:
    """Validate configuration file"""
    print_header("CONFIGURATION VALIDATION")
    
    script_dir = Path(__file__).parent
    config_file = script_dir / "mock-detection-config.yml"
    all_good = True
    
    if not config_file.exists():
        print_error("Configuration file does not exist")
        return False
    
    try:
        import yaml
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        
        required_sections = [
            'severity_levels',
            'performance', 
            'file_types',
            'exclusions'
        ]
        
        for section in required_sections:
            if section in config:
                print_success(f"Configuration section '{section}' found")
            else:
                print_error(f"Configuration section '{section}' missing")
                all_good = False
    
    except ImportError:
        print_error("PyYAML not available - cannot validate YAML config")
        all_good = False
    except yaml.YAMLError as e:
        print_error(f"Invalid YAML in config file: {e}")
        all_good = False
    except Exception as e:
        print_error(f"Error reading config file: {e}")
        all_good = False
    
    return all_good

def validate_pre_commit_hook() -> bool:
    """Validate pre-commit hook functionality"""
    print_header("PRE-COMMIT HOOK VALIDATION")
    
    script_dir = Path(__file__).parent
    hook_script = script_dir / "pre-commit-hook.sh"
    all_good = True
    
    # Test help command
    success, output = run_command([
        str(hook_script), "--help"
    ], "Pre-commit hook help")
    
    if not success:
        all_good = False
    
    # Test test mode
    success, output = run_command([
        str(hook_script), "--test"
    ], "Pre-commit hook test mode", expect_success=False)
    
    # Should fail due to mock data in codebase
    if success:
        print_info("Hook test completed (may have found violations)")
    
    return all_good

def validate_test_suite() -> bool:
    """Validate test suite functionality"""
    print_header("TEST SUITE VALIDATION")
    
    script_dir = Path(__file__).parent
    test_script = script_dir / "test-mock-detector.py"
    all_good = True
    
    # Run a quick test
    success, output = run_command([
        "python3", str(test_script), "MockDataDetectorTests.test_exit_codes"
    ], "Test suite execution")
    
    if not success:
        print_error("Test suite failed - check test implementation")
        all_good = False
    
    return all_good

def validate_performance() -> bool:
    """Validate performance characteristics"""
    print_header("PERFORMANCE VALIDATION")
    
    script_dir = Path(__file__).parent
    detector_script = script_dir / "detect-mock-data.py"
    all_good = True
    
    # Create larger test set
    test_dir = Path(tempfile.mkdtemp(prefix="perf_test_"))
    
    try:
        # Create 20 test files
        for i in range(20):
            test_file = test_dir / f"test_file_{i}.py"
            test_file.write_text(f'''
# Test file {i}
def function_{i}():
    data = get_real_data()
    return process(data)

mock_data_{i} = "test"  # Single violation per file
            ''')
        
        import time
        start_time = time.time()
        
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            json_report = f.name
        
        success, output = run_command([
            "python3", str(detector_script),
            "--directory", str(test_dir),
            "--output-json", json_report,
            "--quiet"
        ], "Performance test scan", expect_success=False)
        
        scan_time = time.time() - start_time
        
        if success and scan_time < 10.0:  # Should complete within 10 seconds
            print_success(f"Performance test completed in {scan_time:.2f}s")
            
            # Check performance metrics
            try:
                with open(json_report, 'r') as f:
                    report = json.load(f)
                
                metrics = report['scan_metadata']['performance_metrics']
                files_per_second = metrics.get('files_per_second', 0)
                
                if files_per_second > 1.0:
                    print_success(f"Good performance: {files_per_second:.1f} files/sec")
                else:
                    print_error(f"Poor performance: {files_per_second:.1f} files/sec")
                    all_good = False
            
            except Exception as e:
                print_error(f"Could not analyze performance metrics: {e}")
                all_good = False
        
        else:
            print_error(f"Performance test too slow: {scan_time:.2f}s")
            all_good = False
        
        # Clean up
        if os.path.exists(json_report):
            os.unlink(json_report)
    
    finally:
        import shutil
        shutil.rmtree(test_dir)
    
    return all_good

def main() -> int:
    """Main validation function"""
    print_header("MOCK DATA DETECTION SYSTEM VALIDATION")
    print("Comprehensive validation of all system components")
    
    validation_functions = [
        ("File Structure", validate_file_structure),
        ("Executables", validate_executables), 
        ("Configuration", validate_configuration),
        ("Detector Functionality", validate_detector_functionality),
        ("Pre-commit Hook", validate_pre_commit_hook),
        ("Test Suite", validate_test_suite),
        ("Performance", validate_performance)
    ]
    
    results = {}
    
    for name, func in validation_functions:
        try:
            results[name] = func()
        except Exception as e:
            print_error(f"Validation '{name}' failed with exception: {e}")
            results[name] = False
    
    # Summary
    print_header("VALIDATION SUMMARY")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for name, result in results.items():
        status = "PASS" if result else "FAIL"
        emoji = "✅" if result else "❌"
        print(f"{emoji} {name}: {status}")
    
    print(f"\nOverall: {passed}/{total} validations passed")
    
    if passed == total:
        print_success("🎉 ALL VALIDATIONS PASSED - System is ready for production!")
        return 0
    else:
        print_error("🚨 SOME VALIDATIONS FAILED - Please review and fix issues")
        return 1

if __name__ == '__main__':
    sys.exit(main())
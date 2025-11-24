#!/usr/bin/env python3
"""
Test Coverage Check Script

Runs pytest with coverage and validates coverage meets target (87%+).
"""

import subprocess
import sys
import os
from pathlib import Path

# Target coverage percentage
TARGET_COVERAGE = 87.0

# Directories to check coverage for
COVERAGE_DIRS = [
    'app/service/anomaly',
    'app/api/routes/analytics.py',
    'app/models/anomaly.py',
    'app/service/anomaly',
]


def run_coverage_check():
    """Run pytest with coverage and check results."""
    project_root = Path(__file__).parent.parent
    
    # Change to project root
    os.chdir(project_root)
    
    # Build coverage command
    coverage_args = [
        'pytest',
        'app/test/unit/service/anomaly',
        'app/test/integration/api/test_anomaly_api_endpoints.py',
        '--cov=app/service/anomaly',
        '--cov=app/api/routes/analytics',
        '--cov=app/models/anomaly',
        '--cov-report=term-missing',
        '--cov-report=html',
        '--cov-report=json',
        '-v'
    ]
    
    print(f"Running coverage check...")
    print(f"Target coverage: {TARGET_COVERAGE}%")
    print(f"Command: {' '.join(coverage_args)}\n")
    
    try:
        result = subprocess.run(
            coverage_args,
            capture_output=True,
            text=True,
            check=False
        )
        
        # Print output
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        # Parse coverage from output
        coverage_lines = [line for line in result.stdout.split('\n') if 'TOTAL' in line or 'TOTAL' in line.upper()]
        
        if coverage_lines:
            print("\n" + "="*80)
            print("COVERAGE SUMMARY:")
            print("="*80)
            for line in coverage_lines:
                print(line)
        
        # Check if coverage report JSON exists
        coverage_json = project_root / 'coverage.json'
        if coverage_json.exists():
            import json
            with open(coverage_json) as f:
                coverage_data = json.load(f)
                total_coverage = coverage_data.get('totals', {}).get('percent_covered', 0)
                
                print(f"\nOverall Coverage: {total_coverage:.2f}%")
                print(f"Target: {TARGET_COVERAGE}%")
                
                if total_coverage >= TARGET_COVERAGE:
                    print(f"✅ Coverage target met! ({total_coverage:.2f}% >= {TARGET_COVERAGE}%)")
                    return 0
                else:
                    print(f"❌ Coverage below target! ({total_coverage:.2f}% < {TARGET_COVERAGE}%)")
                    print(f"Need to increase coverage by {TARGET_COVERAGE - total_coverage:.2f}%")
                    return 1
        
        # If JSON doesn't exist, check exit code
        if result.returncode == 0:
            print("\n✅ Tests passed")
            return 0
        else:
            print(f"\n❌ Tests failed with exit code {result.returncode}")
            return result.returncode
            
    except FileNotFoundError:
        print("ERROR: pytest not found. Install with: pip install pytest pytest-cov")
        return 1
    except Exception as e:
        print(f"ERROR: {e}")
        return 1


if __name__ == '__main__':
    exit_code = run_coverage_check()
    sys.exit(exit_code)


#!/usr/bin/env python
"""
Test Runner for Olorin Autonomous Investigation System.

This script runs tests with real API calls and provides detailed reporting.
NO MOCK DATA - All tests use real Anthropic API and real data.
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

import pytest
from coverage import Coverage

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.config import get_settings_for_env

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("tests/test_run.log"),
    ],
)
logger = logging.getLogger(__name__)


class TestRunner:
    """Manages test execution with real API calls."""
    
    def __init__(self, args):
        self.args = args
        self.settings = get_settings_for_env()
        self.start_time = None
        self.end_time = None
        self.results = {}
        self.coverage = None
        
        # Validate API key from Firebase
        from app.utils.firebase_secrets import get_firebase_secret
        api_key = get_firebase_secret(self.settings.anthropic_api_key_secret)
        if not api_key:
            logger.error(f"Anthropic API key not configured in Firebase Secrets Manager!")
            logger.error(f"Please configure the secret '{self.settings.anthropic_api_key_secret}' in Firebase")
            sys.exit(1)
    
    def setup_coverage(self):
        """Setup code coverage tracking."""
        if self.args.coverage:
            self.coverage = Coverage(
                source=["app"],
                omit=[
                    "*/tests/*",
                    "*/test/*",
                    "*/__pycache__/*",
                    "*/conftest.py",
                ],
            )
            self.coverage.start()
            logger.info("Code coverage tracking enabled")
    
    def run_tests(self) -> int:
        """Run the test suite with specified options."""
        self.start_time = time.time()
        
        # Build pytest arguments
        pytest_args = []
        
        # Add test paths
        if self.args.test_path:
            pytest_args.append(self.args.test_path)
        elif self.args.unit:
            pytest_args.append("tests/unit")
        elif self.args.integration:
            pytest_args.append("tests/integration")
        else:
            pytest_args.append("tests")
        
        # Add markers
        if self.args.marker:
            pytest_args.extend(["-m", self.args.marker])
        elif self.args.unit:
            pytest_args.extend(["-m", "unit"])
        elif self.args.integration:
            pytest_args.extend(["-m", "integration"])
        
        # Add verbosity
        if self.args.verbose:
            pytest_args.append("-vv")
        else:
            pytest_args.append("-v")
        
        # Add other options
        if self.args.failfast:
            pytest_args.append("-x")
        
        if self.args.parallel:
            pytest_args.extend(["-n", str(self.args.parallel)])
        
        if self.args.keyword:
            pytest_args.extend(["-k", self.args.keyword])
        
        # Add coverage if enabled
        if self.args.coverage:
            pytest_args.extend(["--cov=app", "--cov-report=term-missing"])
        
        # Add cost tracking
        if self.args.track_costs:
            pytest_args.append("--track-api-costs")
        
        # Set max cost limit
        if self.args.max_cost:
            os.environ["TEST_MAX_COST"] = str(self.args.max_cost)
        
        logger.info(f"Running tests with arguments: {pytest_args}")
        
        # Run tests
        exit_code = pytest.main(pytest_args)
        
        self.end_time = time.time()
        
        return exit_code
    
    def generate_report(self):
        """Generate test execution report."""
        duration = self.end_time - self.start_time if self.end_time else 0
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": round(duration, 2),
            "test_type": self._get_test_type(),
            "api_key_configured": bool(get_firebase_secret(self.settings.anthropic_api_key_secret)),
            "coverage_enabled": self.args.coverage,
        }
        
        # Add cost information if available
        cost_file = Path("tests/api_costs.json")
        if cost_file.exists():
            with open(cost_file, "r") as f:
                cost_data = json.load(f)
                report["api_costs"] = cost_data
        
        # Save report
        report_file = Path("tests/test_report.json")
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        self._print_summary(report)
        
        return report
    
    def _get_test_type(self) -> str:
        """Determine the type of tests run."""
        if self.args.unit:
            return "unit"
        elif self.args.integration:
            return "integration"
        elif self.args.marker:
            return f"marker:{self.args.marker}"
        else:
            return "all"
    
    def _print_summary(self, report: Dict[str, Any]):
        """Print test execution summary."""
        print("\n" + "="*60)
        print("TEST EXECUTION SUMMARY")
        print("="*60)
        print(f"Timestamp: {report['timestamp']}")
        print(f"Duration: {report['duration_seconds']} seconds")
        print(f"Test Type: {report['test_type']}")
        print(f"API Key: {'✓ Configured' if report['api_key_configured'] else '✗ Missing'}")
        
        if "api_costs" in report:
            costs = report["api_costs"]
            print(f"\nAPI Usage:")
            print(f"  Total Calls: {costs.get('total_calls', 0)}")
            print(f"  Total Tokens: {costs.get('total_tokens', 0):,}")
            print(f"  Estimated Cost: ${costs.get('estimated_cost', 0):.4f}")
        
        if self.args.coverage and self.coverage:
            self.coverage.stop()
            print(f"\nCode Coverage:")
            self.coverage.report(show_missing=False)
            
            # Save coverage report
            self.coverage.html_report(directory="htmlcov")
            print(f"  HTML report: htmlcov/index.html")
            
            # Check coverage threshold
            total_coverage = self.coverage.report(show_missing=False)
            if total_coverage < 87:
                print(f"  ⚠️  Coverage {total_coverage:.1f}% is below 87% threshold")
            else:
                print(f"  ✓ Coverage {total_coverage:.1f}% meets threshold")
        
        print("="*60 + "\n")
    
    def cleanup(self):
        """Cleanup after test execution."""
        if self.coverage:
            self.coverage.stop()
            self.coverage.save()


def main():
    """Main entry point for test runner."""
    parser = argparse.ArgumentParser(
        description="Run Olorin autonomous investigation tests with real API calls"
    )
    
    # Test selection
    parser.add_argument(
        "test_path",
        nargs="?",
        help="Specific test file or directory to run",
    )
    parser.add_argument(
        "--unit",
        action="store_true",
        help="Run unit tests only",
    )
    parser.add_argument(
        "--integration",
        action="store_true",
        help="Run integration tests only",
    )
    parser.add_argument(
        "-m", "--marker",
        help="Run tests with specific marker (e.g., 'real_api', 'performance')",
    )
    parser.add_argument(
        "-k", "--keyword",
        help="Run tests matching keyword expression",
    )
    
    # Test execution options
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output",
    )
    parser.add_argument(
        "-x", "--failfast",
        action="store_true",
        help="Stop on first failure",
    )
    parser.add_argument(
        "-n", "--parallel",
        type=int,
        metavar="NUM",
        help="Run tests in parallel with NUM workers",
    )
    
    # Coverage options
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Enable code coverage tracking",
    )
    parser.add_argument(
        "--coverage-min",
        type=float,
        default=87.0,
        help="Minimum coverage percentage required (default: 87%%)",
    )
    
    # Cost tracking
    parser.add_argument(
        "--track-costs",
        action="store_true",
        help="Track API costs during test execution",
    )
    parser.add_argument(
        "--max-cost",
        type=float,
        default=10.0,
        help="Maximum API cost allowed in dollars (default: $10)",
    )
    
    # Reporting
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate detailed test report",
    )
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="Don't cleanup test artifacts",
    )
    
    args = parser.parse_args()
    
    # Create test runner
    runner = TestRunner(args)
    
    try:
        # Setup coverage if requested
        runner.setup_coverage()
        
        # Run tests
        logger.info("Starting test execution...")
        exit_code = runner.run_tests()
        
        # Generate report
        if args.report or args.coverage:
            runner.generate_report()
        
        # Cleanup unless specified
        if not args.no_cleanup:
            runner.cleanup()
        
        # Exit with test result code
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        logger.info("Test execution interrupted by user")
        runner.cleanup()
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        runner.cleanup()
        sys.exit(1)


if __name__ == "__main__":
    main()
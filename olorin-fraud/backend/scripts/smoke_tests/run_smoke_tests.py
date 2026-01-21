#!/usr/bin/env python3
"""
Command-line smoke test runner for Olorin external API dependencies.

This script validates that all external API connections are working before
running expensive fraud investigations.

Usage:
    python scripts/smoke_tests/run_smoke_tests.py [options]

Examples:
    # Run all smoke tests
    poetry run python scripts/smoke_tests/run_smoke_tests.py

    # Run tests for specific services
    poetry run python scripts/smoke_tests/run_smoke_tests.py --services snowflake abuseipdb

    # Quick health check of critical services only
    poetry run python scripts/smoke_tests/run_smoke_tests.py --quick

    # Generate JSON report
    poetry run python scripts/smoke_tests/run_smoke_tests.py --json --output smoke_test_report.json

    # Run in silent mode
    poetry run python scripts/smoke_tests/run_smoke_tests.py --silent

    # Check if investigations should be blocked
    poetry run python scripts/smoke_tests/run_smoke_tests.py --check-blocking
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

# Add the app directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from app.service.logging import get_bridge_logger
from app.service.smoke_tests.smoke_test_runner import SmokeTestRunner

logger = get_bridge_logger(__name__)


def setup_logging(silent: bool = False, verbose: bool = False):
    """Configure logging for the smoke test runner."""
    import logging

    if silent:
        # Disable most logging
        logging.getLogger().setLevel(logging.ERROR)
        for handler in logging.getLogger().handlers:
            handler.setLevel(logging.ERROR)
    elif verbose:
        # Enable debug logging
        logging.getLogger().setLevel(logging.DEBUG)
        for handler in logging.getLogger().handlers:
            handler.setLevel(logging.DEBUG)
    else:
        # Default INFO level
        logging.getLogger().setLevel(logging.INFO)
        for handler in logging.getLogger().handlers:
            handler.setLevel(logging.INFO)


def print_report_summary(report, show_details: bool = True):
    """Print a formatted summary of the smoke test report."""
    print("\n" + "=" * 80)
    print("🔍 OLORIN SMOKE TEST REPORT")
    print("=" * 80)
    print(f"⏰ Timestamp: {report.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"📊 Total Tests: {report.total_tests}")
    print(f"✅ Passed: {report.passed}")
    print(f"❌ Failed: {report.failed}")
    print(f"⏭️  Skipped: {report.skipped}")
    print(f"⚠️  Warnings: {report.warnings}")
    print(f"⏱️  Total Response Time: {report.total_response_time_ms}ms")
    print()

    # Overall status
    if report.has_critical_failures:
        print("🚨 OVERALL STATUS: UNHEALTHY")
        print(f"💥 Critical services down: {', '.join(report.critical_services_down)}")
        if report.should_block_investigations:
            print("🚫 RECOMMENDATION: BLOCK INVESTIGATIONS")
        else:
            print("⚠️  RECOMMENDATION: PROCEED WITH CAUTION")
    else:
        print("✅ OVERALL STATUS: HEALTHY")
        print("🟢 RECOMMENDATION: INVESTIGATIONS CAN PROCEED")

    print("\n" + "=" * 80)
    print("📋 SERVICE BREAKDOWN")
    print("=" * 80)

    for service in report.services:
        status_icon = {
            "passed": "✅",
            "failed": "❌",
            "skipped": "⏭️",
            "warning": "⚠️",
        }.get(service.overall_status.value, "❓")

        enabled_status = "ENABLED" if service.enabled else "DISABLED"
        print(f"\n{status_icon} {service.service_name} ({enabled_status})")

        if service.enabled and show_details:
            print(f"   Response Time: {service.total_response_time_ms}ms")
            print(
                f"   Tests: {len(service.passed_tests)} passed, {len(service.failed_tests)} failed, {len(service.skipped_tests)} skipped"
            )

            # Show critical failures
            critical_failures = [
                t for t in service.failed_tests if t.is_critical_failure
            ]
            if critical_failures:
                print("   💥 CRITICAL FAILURES:")
                for failure in critical_failures:
                    print(f"      • {failure.test_name}: {failure.message}")
                    if failure.error:
                        print(f"        Error: {failure.error}")

            # Show warnings
            warnings = [t for t in service.tests if t.status.value == "warning"]
            if warnings:
                print("   ⚠️  WARNINGS:")
                for warning in warnings:
                    print(f"      • {warning.test_name}: {warning.message}")

    print("\n" + "=" * 80)


def print_quick_health_summary(health_status: dict):
    """Print a quick health check summary."""
    print("\n" + "=" * 60)
    print("🚀 OLORIN QUICK HEALTH CHECK")
    print("=" * 60)
    print(f"⏰ Timestamp: {health_status['timestamp']}")
    print(f"🏥 Status: {health_status['status'].upper()}")
    print(f"📝 {health_status['message']}")

    if health_status.get("healthy_services"):
        print(f"\n✅ Healthy Services: {', '.join(health_status['healthy_services'])}")

    if health_status.get("critical_failures"):
        print(f"\n❌ Critical Failures:")
        for failure in health_status["critical_failures"]:
            print(f"   • {failure['service']}")
            for test_failure in failure["failures"]:
                print(f"     - {test_failure['test']}: {test_failure['error']}")

    if health_status.get("should_block_investigations"):
        print("\n🚫 RECOMMENDATION: BLOCK INVESTIGATIONS")
    else:
        print("\n🟢 RECOMMENDATION: INVESTIGATIONS CAN PROCEED")

    print("=" * 60)


async def main():
    """Main entry point for smoke test runner."""
    parser = argparse.ArgumentParser(
        description="Run smoke tests for Olorin external API dependencies",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "--services",
        nargs="*",
        help="Specific services to test (snowflake, abuseipdb, virustotal, shodan, splunk)",
        default=None,
    )

    parser.add_argument(
        "--quick",
        action="store_true",
        help="Quick health check of critical services only",
    )

    parser.add_argument(
        "--parallel",
        action="store_true",
        default=True,
        help="Run tests in parallel (default: True)",
    )

    parser.add_argument(
        "--sequential",
        action="store_true",
        help="Run tests sequentially (overrides --parallel)",
    )

    parser.add_argument(
        "--json", action="store_true", help="Output results in JSON format"
    )

    parser.add_argument(
        "--output", type=str, help="Output file for results (default: stdout)"
    )

    parser.add_argument(
        "--silent", action="store_true", help="Silent mode - minimal output"
    )

    parser.add_argument(
        "--verbose", action="store_true", help="Verbose mode - detailed logging"
    )

    parser.add_argument(
        "--check-blocking",
        action="store_true",
        help="Check if investigations should be blocked (exit code 1 if yes)",
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Overall timeout in seconds (default: 300)",
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(silent=args.silent, verbose=args.verbose)

    # Validate services if specified
    valid_services = {"snowflake", "abuseipdb", "virustotal", "shodan", "splunk"}
    if args.services:
        invalid_services = set(args.services) - valid_services
        if invalid_services:
            print(f"Error: Invalid services specified: {invalid_services}")
            print(f"Valid services: {valid_services}")
            return 1

    try:
        # Initialize smoke test runner
        runner = SmokeTestRunner()

        if args.quick:
            # Quick health check
            if not args.silent:
                print("Running quick health check for critical services...")

            health_status = await asyncio.wait_for(
                runner.run_quick_health_check(), timeout=args.timeout
            )

            if args.json:
                output = json.dumps(health_status, indent=2, default=str)
            else:
                if not args.silent:
                    print_quick_health_summary(health_status)
                output = json.dumps(health_status, default=str)

            # Write output
            if args.output:
                with open(args.output, "w") as f:
                    f.write(
                        output
                        if args.json
                        else json.dumps(health_status, indent=2, default=str)
                    )
                if not args.silent:
                    print(f"\nResults written to {args.output}")
            elif args.json:
                print(output)

            # Set exit code based on health
            if args.check_blocking and health_status.get("should_block_investigations"):
                return 1
            elif health_status["status"] == "unhealthy":
                return 2  # Non-critical failures

        else:
            # Full smoke test suite
            if not args.silent:
                if args.services:
                    print(
                        f"Running smoke tests for services: {', '.join(args.services)}"
                    )
                else:
                    print("Running comprehensive smoke test suite...")

            # Determine parallel execution
            parallel = args.parallel and not args.sequential

            report = await asyncio.wait_for(
                runner.run_all_smoke_tests(services=args.services, parallel=parallel),
                timeout=args.timeout,
            )

            if args.json:
                output = json.dumps(report.to_dict(), indent=2, default=str)
            else:
                if not args.silent:
                    print_report_summary(report, show_details=not args.silent)
                output = json.dumps(report.to_dict(), default=str)

            # Write output
            if args.output:
                with open(args.output, "w") as f:
                    f.write(
                        output
                        if args.json
                        else json.dumps(report.to_dict(), indent=2, default=str)
                    )
                if not args.silent:
                    print(f"\nResults written to {args.output}")
            elif args.json:
                print(output)

            # Set exit code based on results
            if args.check_blocking and report.should_block_investigations:
                return 1
            elif report.has_critical_failures:
                return 2  # Critical failures
            elif report.failed > 0:
                return 3  # Non-critical failures

        return 0

    except asyncio.TimeoutError:
        error_msg = f"Smoke tests timed out after {args.timeout} seconds"
        if args.json:
            error_output = {
                "error": error_msg,
                "timeout": True,
                "timestamp": datetime.utcnow().isoformat(),
            }
            print(json.dumps(error_output))
        else:
            print(f"❌ ERROR: {error_msg}")
        return 4

    except KeyboardInterrupt:
        if not args.silent:
            print("\n⚠️  Smoke tests interrupted by user")
        return 130  # Standard exit code for SIGINT

    except Exception as e:
        error_msg = f"Smoke tests failed with error: {str(e)}"
        if args.json:
            error_output = {
                "error": error_msg,
                "exception": True,
                "timestamp": datetime.utcnow().isoformat(),
            }
            print(json.dumps(error_output))
        else:
            print(f"❌ ERROR: {error_msg}")
            if args.verbose:
                import traceback

                traceback.print_exc()
        return 5


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

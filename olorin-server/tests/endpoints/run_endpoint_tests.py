#!/usr/bin/env python3
"""
Olorin Comprehensive Endpoint Testing Runner

This script executes the complete endpoint testing suite for the Olorin
fraud investigation platform. It runs all 7 phases of testing and generates
comprehensive reports.

Usage:
    python run_endpoint_tests.py [options]

Options:
    --base-url URL      Base URL of the Olorin server (default: http://localhost:8090)
    --phase PHASE       Run specific phase only (1-7)
    --verbose           Enable verbose output
    --report-only       Generate reports from existing test data
    --timeout SECONDS   Test timeout in seconds (default: 600)
"""

import argparse
import asyncio
import json
import os
import sys
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

# Add parent directories to path for imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent.parent))


def setup_test_environment():
    """Set up the test environment."""
    print("🔧 Setting up test environment...")
    
    # Create reports directory
    reports_dir = current_dir / "reports"
    reports_dir.mkdir(exist_ok=True)
    
    # Create logs directory
    logs_dir = current_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    print("✅ Test environment ready")


def check_server_availability(base_url: str) -> bool:
    """Check if the Olorin server is available."""
    print(f"🔍 Checking server availability: {base_url}")
    
    try:
        import httpx
        response = httpx.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Server is available")
            return True
        else:
            print(f"⚠️  Server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server is not available: {str(e)}")
        return False


def run_pytest_phase(phase_name: str, test_file: str, base_url: str, verbose: bool = False, timeout: int = 600) -> dict:
    """Run a specific test phase using pytest."""
    print(f"\n{'='*60}")
    print(f"🚀 RUNNING PHASE: {phase_name}")
    print(f"📁 Test File: {test_file}")
    print(f"🌐 Server: {base_url}")
    print(f"{'='*60}")
    
    # Build pytest command
    cmd = [
        "python", "-m", "pytest",
        str(current_dir / test_file),
        "--asyncio-mode=auto",
        f"--timeout={timeout}",
        "--tb=short",
        "--color=yes"
    ]
    
    if verbose:
        cmd.extend(["-v", "-s"])
    
    # Add custom markers
    markers = {
        "test_health_endpoints.py": "health",
        "test_auth_endpoints.py": "auth",
        "test_investigation_endpoints.py": "integration",
        "test_analysis_endpoints.py": "analysis",
        "test_agent_endpoints.py": "agents",
        "test_websocket_endpoints.py": "websocket",
        "test_error_handling.py": "error_handling"
    }
    
    if test_file in markers:
        cmd.extend(["-m", markers[test_file]])
    
    # Set environment variables
    env = os.environ.copy()
    env["OLORIN_BASE_URL"] = base_url
    env["PYTEST_CURRENT_TEST_PHASE"] = phase_name
    
    # Run pytest
    start_time = time.time()
    try:
        result = subprocess.run(
            cmd,
            cwd=current_dir.parent.parent,  # Run from olorin-server root
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        duration = time.time() - start_time
        
        return {
            "phase": phase_name,
            "test_file": test_file,
            "duration": duration,
            "return_code": result.returncode,
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    
    except subprocess.TimeoutExpired:
        duration = time.time() - start_time
        return {
            "phase": phase_name,
            "test_file": test_file,
            "duration": duration,
            "return_code": -1,
            "success": False,
            "stdout": "",
            "stderr": f"Test timed out after {timeout} seconds"
        }
    
    except Exception as e:
        duration = time.time() - start_time
        return {
            "phase": phase_name,
            "test_file": test_file,
            "duration": duration,
            "return_code": -2,
            "success": False,
            "stdout": "",
            "stderr": f"Error running test: {str(e)}"
        }


def run_all_phases(base_url: str, verbose: bool = False, timeout: int = 600) -> list:
    """Run all test phases in sequence."""
    
    # Define all test phases
    test_phases = [
        ("Phase 1: Health & Utility", "test_health_endpoints.py"),
        ("Phase 2: Authentication", "test_auth_endpoints.py"),
        ("Phase 3: Investigation Management", "test_investigation_endpoints.py"),
        ("Phase 4: Analysis Engines", "test_analysis_endpoints.py"),
        ("Phase 5: AI Agent System", "test_agent_endpoints.py"),
        ("Phase 6: WebSocket Communication", "test_websocket_endpoints.py"),
        ("Phase 7: Error Handling", "test_error_handling.py")
    ]
    
    results = []
    total_start_time = time.time()
    
    print(f"\n🎯 STARTING COMPREHENSIVE ENDPOINT TESTING")
    print(f"📊 Total Phases: {len(test_phases)}")
    print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    for i, (phase_name, test_file) in enumerate(test_phases, 1):
        print(f"\n⏳ Phase {i}/{len(test_phases)}: Starting...")
        
        phase_result = run_pytest_phase(
            phase_name, test_file, base_url, verbose, timeout
        )
        results.append(phase_result)
        
        # Print phase summary
        if phase_result["success"]:
            print(f"✅ Phase {i} PASSED: {phase_name} ({phase_result['duration']:.1f}s)")
        else:
            print(f"❌ Phase {i} FAILED: {phase_name} ({phase_result['duration']:.1f}s)")
            if phase_result["stderr"]:
                print(f"   Error: {phase_result['stderr'][:200]}...")
        
        # Brief pause between phases
        if i < len(test_phases):
            print("⏸️  Brief pause between phases...")
            time.sleep(2)
    
    total_duration = time.time() - total_start_time
    
    print(f"\n🏁 ALL PHASES COMPLETED")
    print(f"🕐 Total Duration: {total_duration:.1f} seconds")
    print(f"✅ Successful Phases: {sum(1 for r in results if r['success'])}/{len(results)}")
    
    return results


def generate_comprehensive_report(results: list, base_url: str) -> dict:
    """Generate comprehensive test report."""
    
    total_duration = sum(r["duration"] for r in results)
    successful_phases = sum(1 for r in results if r["success"])
    total_phases = len(results)
    success_rate = (successful_phases / total_phases * 100) if total_phases > 0 else 0
    
    report = {
        "execution_metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "base_url": base_url,
            "total_phases": total_phases,
            "successful_phases": successful_phases,
            "failed_phases": total_phases - successful_phases,
            "success_rate_percentage": success_rate,
            "total_duration_seconds": total_duration
        },
        "phase_results": [],
        "summary": {
            "status": "PASSED" if success_rate >= 80 else "FAILED",
            "platform_health": "GOOD" if success_rate >= 90 else "FAIR" if success_rate >= 70 else "POOR",
            "critical_issues": [],
            "recommendations": []
        }
    }
    
    # Process each phase result
    for result in results:
        phase_data = {
            "phase": result["phase"],
            "test_file": result["test_file"],
            "duration_seconds": result["duration"],
            "status": "PASSED" if result["success"] else "FAILED",
            "return_code": result["return_code"]
        }
        
        # Add error information if failed
        if not result["success"]:
            phase_data["error_info"] = {
                "stderr": result["stderr"][:1000] if result["stderr"] else None,
                "stdout_excerpt": result["stdout"][-500:] if result["stdout"] else None
            }
            
            # Add to critical issues
            if result["return_code"] == -1:
                report["summary"]["critical_issues"].append(f"{result['phase']}: Test timed out")
            else:
                report["summary"]["critical_issues"].append(f"{result['phase']}: Test failed")
        
        report["phase_results"].append(phase_data)
    
    # Generate recommendations
    if success_rate < 100:
        report["summary"]["recommendations"].append("Some endpoint tests failed - review failed phases for issues")
    
    if any(r["duration"] > 300 for r in results):  # 5 minutes
        report["summary"]["recommendations"].append("Some test phases took over 5 minutes - consider performance optimization")
    
    if success_rate >= 95:
        report["summary"]["recommendations"].append("Excellent API health - all systems functioning well")
    elif success_rate >= 80:
        report["summary"]["recommendations"].append("Good API health with minor issues to address")
    else:
        report["summary"]["recommendations"].append("API health concerns - immediate attention required")
    
    return report


def save_report(report: dict, format_type: str = "json") -> str:
    """Save the test report to file."""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format_type == "json":
        filename = f"endpoint_test_report_{timestamp}.json"
        filepath = current_dir / "reports" / filename
        
        with open(filepath, "w") as f:
            json.dump(report, f, indent=2, default=str)
    
    else:  # text format
        filename = f"endpoint_test_report_{timestamp}.txt"
        filepath = current_dir / "reports" / filename
        
        with open(filepath, "w") as f:
            f.write("OLORIN ENDPOINT TESTING COMPREHENSIVE REPORT\n")
            f.write("=" * 50 + "\n\n")
            
            # Execution metadata
            meta = report["execution_metadata"]
            f.write(f"Timestamp: {meta['timestamp']}\n")
            f.write(f"Server: {meta['base_url']}\n")
            f.write(f"Total Duration: {meta['total_duration_seconds']:.1f} seconds\n")
            f.write(f"Success Rate: {meta['success_rate_percentage']:.1f}%\n\n")
            
            # Phase results
            f.write("PHASE RESULTS:\n")
            f.write("-" * 30 + "\n")
            for phase in report["phase_results"]:
                status_icon = "✅" if phase["status"] == "PASSED" else "❌"
                f.write(f"{status_icon} {phase['phase']}: {phase['status']} ({phase['duration_seconds']:.1f}s)\n")
            
            # Summary
            f.write("\nSUMMARY:\n")
            f.write("-" * 30 + "\n")
            f.write(f"Platform Health: {report['summary']['platform_health']}\n")
            f.write(f"Overall Status: {report['summary']['status']}\n")
            
            if report["summary"]["critical_issues"]:
                f.write("\nCritical Issues:\n")
                for issue in report["summary"]["critical_issues"]:
                    f.write(f"⚠️  {issue}\n")
            
            if report["summary"]["recommendations"]:
                f.write("\nRecommendations:\n")
                for rec in report["summary"]["recommendations"]:
                    f.write(f"💡 {rec}\n")
    
    return str(filepath)


def print_executive_summary(report: dict):
    """Print executive summary of test results."""
    
    print("\n" + "=" * 80)
    print("🏆 OLORIN ENDPOINT TESTING - EXECUTIVE SUMMARY")
    print("=" * 80)
    
    meta = report["execution_metadata"]
    summary = report["summary"]
    
    # High-level metrics
    print(f"🕐 Execution Time: {meta['total_duration_seconds']:.1f} seconds")
    print(f"📊 Success Rate: {meta['success_rate_percentage']:.1f}%")
    print(f"✅ Passed Phases: {meta['successful_phases']}/{meta['total_phases']}")
    print(f"🏥 Platform Health: {summary['platform_health']}")
    print(f"📋 Overall Status: {summary['status']}")
    
    # Phase breakdown
    print(f"\n📋 PHASE BREAKDOWN:")
    print("-" * 40)
    for phase in report["phase_results"]:
        status_icon = "✅" if phase["status"] == "PASSED" else "❌"
        print(f"{status_icon} {phase['phase']}: {phase['duration_seconds']:.1f}s")
    
    # Critical issues
    if summary["critical_issues"]:
        print(f"\n⚠️  CRITICAL ISSUES:")
        print("-" * 40)
        for issue in summary["critical_issues"]:
            print(f"❗ {issue}")
    
    # Recommendations
    if summary["recommendations"]:
        print(f"\n💡 RECOMMENDATIONS:")
        print("-" * 40)
        for rec in summary["recommendations"]:
            print(f"🔸 {rec}")
    
    print("=" * 80)


def main():
    """Main execution function."""
    
    parser = argparse.ArgumentParser(
        description="Olorin Comprehensive Endpoint Testing Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_endpoint_tests.py
    python run_endpoint_tests.py --base-url http://localhost:8090
    python run_endpoint_tests.py --phase 1 --verbose
    python run_endpoint_tests.py --timeout 900
        """
    )
    
    parser.add_argument(
        "--base-url",
        default="http://localhost:8090",
        help="Base URL of the Olorin server"
    )
    
    parser.add_argument(
        "--phase",
        type=int,
        choices=range(1, 8),
        help="Run specific phase only (1-7)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )
    
    parser.add_argument(
        "--report-only",
        action="store_true",
        help="Generate reports from existing test data (not implemented)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Test timeout in seconds"
    )
    
    parser.add_argument(
        "--skip-server-check",
        action="store_true",
        help="Skip server availability check"
    )
    
    args = parser.parse_args()
    
    print("🚀 OLORIN COMPREHENSIVE ENDPOINT TESTING")
    print("=" * 50)
    
    # Setup test environment
    setup_test_environment()
    
    # Check server availability
    if not args.skip_server_check:
        if not check_server_availability(args.base_url):
            print("❌ Server is not available. Use --skip-server-check to proceed anyway.")
            sys.exit(1)
    
    # Run tests
    if args.phase:
        # Run specific phase
        test_phases = [
            ("Phase 1: Health & Utility", "test_health_endpoints.py"),
            ("Phase 2: Authentication", "test_auth_endpoints.py"), 
            ("Phase 3: Investigation Management", "test_investigation_endpoints.py"),
            ("Phase 4: Analysis Engines", "test_analysis_endpoints.py"),
            ("Phase 5: AI Agent System", "test_agent_endpoints.py"),
            ("Phase 6: WebSocket Communication", "test_websocket_endpoints.py"),
            ("Phase 7: Error Handling", "test_error_handling.py")
        ]
        
        phase_name, test_file = test_phases[args.phase - 1]
        result = run_pytest_phase(phase_name, test_file, args.base_url, args.verbose, args.timeout)
        results = [result]
    else:
        # Run all phases
        results = run_all_phases(args.base_url, args.verbose, args.timeout)
    
    # Generate and save report
    print("\n📊 Generating comprehensive report...")
    report = generate_comprehensive_report(results, args.base_url)
    
    # Save reports
    json_report_path = save_report(report, "json")
    text_report_path = save_report(report, "text")
    
    print(f"📄 JSON Report: {json_report_path}")
    print(f"📄 Text Report: {text_report_path}")
    
    # Print executive summary
    print_executive_summary(report)
    
    # Exit with appropriate code
    if report["summary"]["status"] == "PASSED":
        print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n⚠️  SOME TESTS FAILED - REVIEW REPORT FOR DETAILS")
        sys.exit(1)


if __name__ == "__main__":
    main()
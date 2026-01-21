#!/usr/bin/env python3
"""
Test Server Log Capture

Simple test script to verify that server log capture is working correctly.

Usage:
    poetry run python scripts/testing/test_server_log_capture.py
"""

import logging
import os
import sys
import tempfile
import time
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from app.service.logging.server_log_capture import (
    capture_server_logs,
    get_server_log_capture,
)


def test_basic_log_capture():
    """Test basic server log capture functionality"""
    print("🧪 Testing basic server log capture...")

    # Create temporary investigation folder
    with tempfile.TemporaryDirectory() as temp_dir:
        investigation_id = "test_log_capture_001"
        investigation_folder = Path(temp_dir) / "investigation"
        investigation_folder.mkdir(parents=True, exist_ok=True)

        # Get log capture instance
        log_capture = get_server_log_capture()

        # Start capture
        log_capture.start_capture(investigation_id, investigation_folder)

        # Create a test logger and generate some logs
        test_logger = logging.getLogger("test_investigation_logger")
        test_logger.setLevel(logging.DEBUG)

        print(f"  📁 Investigation folder: {investigation_folder}")
        print(f"  🚀 Starting log capture for: {investigation_id}")

        # Generate test logs
        test_logger.info("This is a test INFO log message")
        test_logger.warning("This is a test WARNING log message")
        test_logger.error("This is a test ERROR log message")
        test_logger.debug("This is a test DEBUG log message")

        # Wait a bit for logs to be processed
        time.sleep(0.5)

        # Get capture stats
        stats = log_capture.get_capture_stats(investigation_id)
        if stats:
            print(f"  📊 Capture stats: {stats['logs_captured']} logs captured")

        # Stop capture
        server_logs_file = log_capture.stop_capture(investigation_id)

        if server_logs_file and server_logs_file.exists():
            print(f"  ✅ Server logs saved to: {server_logs_file}")

            # Check file content
            with open(server_logs_file, "r") as f:
                content = f.read()
                if (
                    "test INFO log message" in content
                    and "test WARNING log message" in content
                ):
                    print("  ✅ Log capture working correctly!")
                    return True
                else:
                    print("  ❌ Log content not found in captured logs")
                    return False
        else:
            print("  ❌ Server logs file was not created")
            return False


def test_context_manager():
    """Test context manager for log capture"""
    print("\n🧪 Testing context manager...")

    with tempfile.TemporaryDirectory() as temp_dir:
        investigation_id = "test_context_manager_002"
        investigation_folder = Path(temp_dir) / "investigation"
        investigation_folder.mkdir(parents=True, exist_ok=True)

        # Use context manager
        with capture_server_logs(investigation_id, investigation_folder) as capture:
            test_logger = logging.getLogger("test_context_logger")
            test_logger.info("Context manager test log message")
            test_logger.error("Context manager error log message")

            # Check if capture is active
            if capture.is_capturing(investigation_id):
                print("  ✅ Log capture is active within context")
            else:
                print("  ❌ Log capture is not active within context")

        # Check if logs were saved
        server_logs_file = investigation_folder / "server_logs"
        if server_logs_file.exists():
            print(f"  ✅ Context manager saved logs to: {server_logs_file}")
            with open(server_logs_file, "r") as f:
                content = f.read()
                if "Context manager test log message" in content:
                    print("  ✅ Context manager working correctly!")
                    return True
                else:
                    print("  ❌ Context manager log content not found")
                    return False
        else:
            print("  ❌ Context manager did not save logs")
            return False


def test_multiple_investigations():
    """Test capturing logs for multiple investigations simultaneously"""
    print("\n🧪 Testing multiple investigations...")

    with tempfile.TemporaryDirectory() as temp_dir:
        log_capture = get_server_log_capture()

        # Create two investigations
        inv1_id = "test_multi_001"
        inv2_id = "test_multi_002"

        inv1_folder = Path(temp_dir) / "inv1"
        inv2_folder = Path(temp_dir) / "inv2"

        inv1_folder.mkdir(parents=True, exist_ok=True)
        inv2_folder.mkdir(parents=True, exist_ok=True)

        # Start both captures
        log_capture.start_capture(inv1_id, inv1_folder)
        log_capture.start_capture(inv2_id, inv2_folder)

        # Generate logs for investigation 1
        logger1 = logging.getLogger("investigation_1_logger")
        logger1.info("Investigation 1 log message")

        # Generate logs for investigation 2
        logger2 = logging.getLogger("investigation_2_logger")
        logger2.info("Investigation 2 log message")

        time.sleep(0.5)

        # Check both are capturing
        active1 = log_capture.is_capturing(inv1_id)
        active2 = log_capture.is_capturing(inv2_id)

        print(f"  📊 Investigation 1 active: {active1}")
        print(f"  📊 Investigation 2 active: {active2}")

        # Stop both
        logs1 = log_capture.stop_capture(inv1_id)
        logs2 = log_capture.stop_capture(inv2_id)

        success = True

        if logs1 and logs1.exists():
            print(f"  ✅ Investigation 1 logs saved: {logs1}")
        else:
            print("  ❌ Investigation 1 logs not saved")
            success = False

        if logs2 and logs2.exists():
            print(f"  ✅ Investigation 2 logs saved: {logs2}")
        else:
            print("  ❌ Investigation 2 logs not saved")
            success = False

        return success


def main():
    """Run all tests"""
    print("🔬 Server Log Capture Test Suite")
    print("=" * 50)

    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    results = []

    try:
        results.append(("Basic Log Capture", test_basic_log_capture()))
        results.append(("Context Manager", test_context_manager()))
        results.append(("Multiple Investigations", test_multiple_investigations()))

    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        return False

    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Results Summary:")

    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} {test_name}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\n🎉 All tests passed! Server log capture is working correctly.")
        return True
    else:
        print("\n💥 Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

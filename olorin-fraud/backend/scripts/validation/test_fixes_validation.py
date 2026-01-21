#!/usr/bin/env python3
"""
Quick validation script to test the 5 drop-in fixes.
"""

import asyncio
import sys
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Dict

# Add the project root to Python path
sys.path.append(".")


def test_bulletproof_timer():
    """Test 1: Bulletproof timer with perf counter."""
    print("🧪 Test 1: Bulletproof timer")

    from app.service.agent.orchestration.timing import domain_timer, run_timer

    class MockState:
        pass

    state = MockState()

    # Test run timer
    with run_timer(state):
        import time

        time.sleep(0.01)  # 10ms

    assert hasattr(state, "start_time"), "start_time not set"
    assert hasattr(state, "end_time"), "end_time not set"
    assert hasattr(state, "total_duration_ms"), "total_duration_ms not set"
    assert (
        state.total_duration_ms > 0
    ), f"total_duration_ms is {state.total_duration_ms}"
    assert (
        state.total_duration_ms >= 10
    ), f"Duration too small: {state.total_duration_ms}ms"
    print(f"   ✅ Duration: {state.total_duration_ms}ms")

    # Test domain timer
    state.performance_metrics = {}
    with domain_timer(state, "test_domain"):
        import time

        time.sleep(0.005)  # 5ms

    assert (
        "domain_durations_ms" in state.performance_metrics
    ), "domain_durations_ms not created"
    assert (
        "test_domain" in state.performance_metrics["domain_durations_ms"]
    ), "test_domain duration not recorded"
    domain_ms = state.performance_metrics["domain_durations_ms"]["test_domain"]
    assert domain_ms >= 5, f"Domain duration too small: {domain_ms}ms"
    print(f"   ✅ Domain duration: {domain_ms}ms")


def test_safe_division():
    """Test 2: Safe division everywhere."""
    print("\n🧪 Test 2: Safe division")

    from app.service.agent.orchestration.metrics.safe import safe_div

    # Test normal division
    assert safe_div(10, 5) == 2.0, "Normal division failed"

    # Test division by zero
    assert safe_div(10, 0) == 0.0, "Division by zero not handled"

    # Test None numerator
    assert safe_div(None, 5) == 0.0, "None numerator not handled"

    # Test None denominator
    assert safe_div(10, None) == 0.0, "None denominator not handled"

    # Test custom default
    assert safe_div(10, 0, default=99.9) == 99.9, "Custom default not used"

    print("   ✅ All safe division tests passed")


def test_text_deduplication():
    """Test 5: Deduplicate repeating recommendations."""
    print("\n🧪 Test 3: Text deduplication")

    from app.service.agent.orchestration.text.clean import dedupe_lines

    duplicate_text = """1. Block the IP address immediately
2. Investigate associated accounts
1. Block the IP address immediately
3. Implement enhanced monitoring
2. Investigate associated accounts
4. Share with fraud prevention networks"""

    clean_text = dedupe_lines(duplicate_text)
    lines = clean_text.split("\n")

    assert len(lines) == 4, f"Expected 4 unique lines, got {len(lines)}"
    assert "1. Block the IP address immediately" in lines
    assert "2. Investigate associated accounts" in lines
    assert "3. Implement enhanced monitoring" in lines
    assert "4. Share with fraud prevention networks" in lines

    print("   ✅ Text deduplication working")


def test_timing_fields():
    """Test 4: Timing fields validation."""
    print("\n🧪 Test 4: Timing fields format validation")

    class MockState:
        pass

    state = MockState()

    from app.service.agent.orchestration.timing import run_timer

    with run_timer(state):
        pass

    # Verify start_time and end_time are ISO format timestamps
    start_time = datetime.fromisoformat(state.start_time.replace("Z", "+00:00"))
    end_time = datetime.fromisoformat(state.end_time.replace("Z", "+00:00"))

    # Verify total_duration_ms is an integer (duration, not timestamp)
    assert isinstance(
        state.total_duration_ms, int
    ), f"total_duration_ms should be int, got {type(state.total_duration_ms)}"
    assert (
        state.total_duration_ms > 0
    ), f"total_duration_ms should be > 0, got {state.total_duration_ms}"

    # Verify timestamps make sense
    assert end_time > start_time, "end_time should be after start_time"

    print(
        f"   ✅ Timing fields: start={state.start_time[:19]}, end={state.end_time[:19]}, duration={state.total_duration_ms}ms"
    )


def main():
    """Run all validation tests."""
    print("🔍 QUICK VALIDATION: Drop-in Fixes")
    print("=" * 50)

    try:
        test_bulletproof_timer()
        test_safe_division()
        test_text_deduplication()
        test_timing_fields()

        print("\n" + "=" * 50)
        print("✅ ALL TESTS PASSED - Drop-in fixes working correctly!")
        print("📋 Quick checklist validated:")
        print("   ✅ Bulletproof timer (perf counter + UTC)")
        print("   ✅ Safe division (no NoneType errors)")
        print("   ✅ Text deduplication (no duplicate recommendations)")
        print("   ✅ Timing fields (durations not timestamps)")
        print("   Note: Safety override flag honesty requires integration test")

    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

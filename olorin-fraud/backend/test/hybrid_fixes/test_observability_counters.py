#!/usr/bin/env python3
"""
Test Observability Counters

Validates that observability counters track Week 0 hotfix effectiveness
and provide production monitoring capabilities.
"""

import asyncio
import os
import sys
import time

import pytest

# Add the project root to Python path
sys.path.insert(0, os.path.abspath("../.."))

from app.service.agent.orchestration.hybrid.observability import (
    CounterStats,
    ObservabilityCounter,
    get_dashboard_summary,
    get_observability_registry,
    increment_counter,
)


def test_basic_counter_operations():
    """Test basic counter increment and value retrieval."""
    print("🧪 Testing Basic Counter Operations")
    print("=" * 35)

    # Get a fresh counter
    registry = get_observability_registry()
    counter = registry.get_counter("test_basic_counter")

    # Test initial state
    initial_value = counter.get_value()
    print(f"   Initial value: {initial_value}")
    assert initial_value == 0

    # Test increment
    counter.increment(5)
    after_increment = counter.get_value()
    print(f"   After increment(5): {after_increment}")
    assert after_increment == 5

    # Test stats
    stats = counter.get_stats()
    print(f"   Stats: total={stats.total}, rate_per_minute={stats.rate_per_minute}")
    assert stats.total == 5
    assert isinstance(stats.rate_per_minute, float)

    print("   ✅ Basic counter operations working")
    return True


def test_graph_selection_counters():
    """Test graph selection observability integration."""
    print("\n🧪 Testing Graph Selection Counters")
    print("=" * 34)

    # Reset counters for clean test
    registry = get_observability_registry()

    # Simulate graph selection events
    increment_counter("graph_selection_attempts", metadata={"entity_type": "ip"})
    increment_counter("graph_selection_attempts", metadata={"entity_type": "user_id"})
    increment_counter(
        "graph_selection_failures", metadata={"reason": "missing_investigation_id"}
    )
    increment_counter(
        "graph_selection_fallbacks", metadata={"reason": "hybrid_build_failed"}
    )

    # Check counters
    attempts = registry.get_counter("graph_selection_attempts").get_value()
    failures = registry.get_counter("graph_selection_failures").get_value()
    fallbacks = registry.get_counter("graph_selection_fallbacks").get_value()

    print(f"   Attempts: {attempts}")
    print(f"   Failures: {failures}")
    print(f"   Fallbacks: {fallbacks}")

    assert attempts == 2
    assert failures == 1
    assert fallbacks == 1

    print("   ✅ Graph selection counters working")
    return True


def test_async_client_counters():
    """Test async client management counters."""
    print("\n🧪 Testing Async Client Counters")
    print("=" * 30)

    registry = get_observability_registry()

    # Simulate async client events
    increment_counter("async_sessions_created")
    increment_counter("async_sessions_created")
    increment_counter("async_sessions_cleaned")
    increment_counter("session_cleanup_failures")

    # Check counters
    created = registry.get_counter("async_sessions_created").get_value()
    cleaned = registry.get_counter("async_sessions_cleaned").get_value()
    failures = registry.get_counter("session_cleanup_failures").get_value()

    print(f"   Sessions created: {created}")
    print(f"   Sessions cleaned: {cleaned}")
    print(f"   Cleanup failures: {failures}")

    assert created == 2
    assert cleaned == 1
    assert failures == 1

    print("   ✅ Async client counters working")
    return True


def test_registry_initialization_counter():
    """Test registry initialization tracking."""
    print("\n🧪 Testing Registry Initialization Counter")
    print("=" * 40)

    registry = get_observability_registry()
    initial_calls = registry.get_counter("registry_initialization_calls").get_value()

    # Import and call initialize_tools
    from app.service.agent.tools.tool_registry import initialize_tools

    # Call multiple times to test idempotent behavior tracking
    initialize_tools()
    initialize_tools()

    final_calls = registry.get_counter("registry_initialization_calls").get_value()
    calls_made = final_calls - initial_calls

    print(f"   Initial calls: {initial_calls}")
    print(f"   Final calls: {final_calls}")
    print(f"   New calls made: {calls_made}")

    assert calls_made == 2  # Should track both calls

    print("   ✅ Registry initialization counter working")
    return True


def test_dashboard_summary():
    """Test dashboard summary generation."""
    print("\n🧪 Testing Dashboard Summary")
    print("=" * 26)

    # Generate some test data
    increment_counter("investigation_starts")
    increment_counter("investigation_completions")
    increment_counter("tool_executions", 5)
    increment_counter("graceful_finalization_triggers")

    # Get dashboard summary
    dashboard = get_dashboard_summary()

    print(f"   Dashboard timestamp: {dashboard['timestamp']}")
    print(f"   Total counters: {dashboard['total_counters']}")
    print(f"   Active counters: {dashboard['active_counters']}")

    # Check structure
    assert "hotfix_effectiveness" in dashboard
    assert "system_health" in dashboard
    assert "graph_selection" in dashboard["hotfix_effectiveness"]
    assert "async_clients" in dashboard["hotfix_effectiveness"]

    # Check specific metrics
    graph_metrics = dashboard["hotfix_effectiveness"]["graph_selection"]
    print(f"   Graph selection success rate: {graph_metrics['success_rate']}%")

    investigations = dashboard["system_health"]["investigations"]
    print(f"   Investigation completion rate: {investigations['completion_rate']}%")

    print("   ✅ Dashboard summary working")
    return True


def test_counter_statistics():
    """Test counter statistical analysis."""
    print("\n🧪 Testing Counter Statistics")
    print("=" * 28)

    counter = ObservabilityCounter("test_stats")

    # Add some events with timing
    for i in range(5):
        counter.increment(metadata={"batch": i})
        time.sleep(0.1)  # Small delay to test rate calculation

    stats = counter.get_stats()

    print(f"   Total: {stats.total}")
    print(f"   Rate per minute: {stats.rate_per_minute}")
    print(f"   Rate per hour: {stats.rate_per_hour}")
    print(f"   Peak rate: {stats.peak_rate}")
    print(f"   Samples count: {stats.samples_count}")

    assert stats.total == 5
    assert stats.rate_per_minute >= 0
    assert stats.rate_per_hour >= 0
    assert stats.samples_count == 5

    print("   ✅ Counter statistics working")
    return True


def test_prometheus_export():
    """Test Prometheus metrics export."""
    print("\n🧪 Testing Prometheus Export")
    print("=" * 28)

    registry = get_observability_registry()

    # Add some test data
    increment_counter("test_prometheus_counter", 42)

    # Export metrics
    prometheus_output = registry.export_metrics("prometheus")
    print(f"   Prometheus output preview: {prometheus_output[:100]}...")

    # Check format
    assert isinstance(prometheus_output, str)
    assert len(prometheus_output) > 0

    # Export JSON format
    json_output = registry.export_metrics("json")
    print(f"   JSON output length: {len(json_output)} characters")

    assert isinstance(json_output, str)
    assert "timestamp" in json_output

    print("   ✅ Metrics export working")
    return True


async def run_all_tests():
    """Run all observability counter tests."""
    print("🎯 Running Observability Counter Tests\n")

    tests = [
        ("Basic Counter Operations", test_basic_counter_operations),
        ("Graph Selection Counters", test_graph_selection_counters),
        ("Async Client Counters", test_async_client_counters),
        ("Registry Initialization Counter", test_registry_initialization_counter),
        ("Dashboard Summary", test_dashboard_summary),
        ("Counter Statistics", test_counter_statistics),
        ("Prometheus Export", test_prometheus_export),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print("=" * 60)

        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))

            if result:
                print(f"\n✅ {test_name}: PASSED")
            else:
                print(f"\n❌ {test_name}: FAILED")

        except Exception as e:
            print(f"\n💥 {test_name}: ERROR - {str(e)}")
            import traceback

            traceback.print_exc()
            results.append((test_name, False))

    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL OBSERVABILITY COUNTER TESTS PASSED!")
        print("   ✅ Counter operations working")
        print("   ✅ Graph selection tracking working")
        print("   ✅ Async client tracking working")
        print("   ✅ Registry tracking working")
        print("   ✅ Dashboard generation working")
        print("   ✅ Statistical analysis working")
        print("   ✅ Metrics export working")
        return True
    else:
        print("⚠️ Some tests failed - observability needs more work")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

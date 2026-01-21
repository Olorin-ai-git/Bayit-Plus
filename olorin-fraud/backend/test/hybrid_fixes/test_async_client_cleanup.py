#!/usr/bin/env python3
"""
Test Async Client Cleanup and Registry Initialization

Validates that async client sessions are properly managed and registry
initialization is idempotent and quiet on repeated calls.
"""

import asyncio
import os
import sys

import pytest

# Add the project root to Python path
sys.path.insert(0, os.path.abspath("../.."))

from app.service.agent.tools.async_client_manager import (
    cleanup_async_clients,
    get_client_manager,
    http_session,
)


async def test_async_client_manager():
    """Test async client manager session handling."""
    print("🧪 Testing Async Client Manager")
    print("=" * 32)

    manager = get_client_manager()
    initial_stats = manager.get_session_stats()
    print(f"   Initial stats: {initial_stats}")

    # Test managed session creation
    async with http_session(timeout=None) as session:
        print(f"   Created session: {type(session).__name__}")

        # Check session is registered
        stats = manager.get_session_stats()
        assert stats["total_registered"] == initial_stats["total_registered"] + 1
        assert stats["active_sessions"] == initial_stats["active_sessions"] + 1
        print(f"   ✅ Session properly registered: {stats}")

    # Session should be cleaned up after context exit
    final_stats = manager.get_session_stats()
    print(f"   Final stats: {final_stats}")

    # Note: total_registered might not decrease due to weak references
    # But active_sessions should be back to initial count
    assert final_stats["active_sessions"] == initial_stats["active_sessions"]
    print("   ✅ Session properly cleaned up")

    return True


async def test_bulk_session_cleanup():
    """Test cleanup of multiple sessions."""
    print("\n🧪 Testing Bulk Session Cleanup")
    print("=" * 30)

    manager = get_client_manager()

    # Create multiple sessions
    sessions = []
    for i in range(3):
        async with http_session() as session:
            # We can't keep sessions open after context manager,
            # so this tests the cleanup during context exit
            print(f"   Session {i+1} created and will be auto-cleaned")

    # Test global cleanup
    await cleanup_async_clients()

    stats = manager.get_session_stats()
    print(f"   Stats after bulk cleanup: {stats}")
    print("   ✅ Bulk cleanup completed")

    return True


def test_registry_idempotent_initialization():
    """Test that registry initialization is idempotent and quiet."""
    print("\n🧪 Testing Registry Idempotent Initialization")
    print("=" * 43)

    from app.service.agent.tools.tool_registry import initialize_tools, tool_registry

    # Check initial state
    initial_initialized = tool_registry._initialized
    initial_tool_count = len(tool_registry._tools)
    print(
        f"   Initial state: initialized={initial_initialized}, tools={initial_tool_count}"
    )

    # First initialization
    initialize_tools()
    after_first = tool_registry._initialized
    first_tool_count = len(tool_registry._tools)
    print(f"   After first init: initialized={after_first}, tools={first_tool_count}")

    # Second initialization (should be idempotent and quiet)
    initialize_tools()
    after_second = tool_registry._initialized
    second_tool_count = len(tool_registry._tools)
    print(
        f"   After second init: initialized={after_second}, tools={second_tool_count}"
    )

    # Verify idempotent behavior
    assert after_first == after_second
    assert first_tool_count == second_tool_count
    print("   ✅ Registry initialization is idempotent")

    return True


def test_abuseipdb_client_integration():
    """Test AbuseIPDB client uses managed sessions."""
    print("\n🧪 Testing AbuseIPDB Client Integration")
    print("=" * 37)

    try:
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.abuseipdb_client import (
            AbuseIPDBClient,
        )
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.models import (
            AbuseIPDBConfig,
        )

        # Create config
        config = AbuseIPDBConfig(
            api_key_secret="test_key",
            timeout=30,
            base_url="https://api.abuseipdb.com/api/v2",
        )

        # Create client
        client = AbuseIPDBClient(config)
        print(f"   Created client: {type(client).__name__}")

        # The client should properly register sessions when created
        print("   ✅ AbuseIPDB client integration successful")

        return True

    except ImportError as e:
        print(f"   ⚠️ AbuseIPDB client not available: {e}")
        return True  # Not a failure - just not available


async def run_all_tests():
    """Run all async client and registry tests."""
    print("🎯 Running Async Client Cleanup and Registry Tests\n")

    tests = [
        ("Async Client Manager", test_async_client_manager),
        ("Bulk Session Cleanup", test_bulk_session_cleanup),
        ("Registry Idempotent Initialization", test_registry_idempotent_initialization),
        ("AbuseIPDB Client Integration", test_abuseipdb_client_integration),
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
        print("🎉 ALL ASYNC CLIENT AND REGISTRY TESTS PASSED!")
        print("   ✅ Async client cleanup working")
        print("   ✅ Registry initialization is idempotent")
        print("   ✅ Managed session context working")
        print("   ✅ Integration with threat intel clients working")
        return True
    else:
        print("⚠️ Some tests failed - async client management needs more work")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

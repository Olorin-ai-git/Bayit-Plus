#!/usr/bin/env python3
"""
Test Graph Selection Hardening

Validates that graph selection returns typed results and prevents silent fallbacks.
"""

import asyncio
import sys
import os
import pytest

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))

from app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector import GraphSelector
from app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selection_result import (
    GraphSelectionSuccess, GraphSelectionFailure, GraphSelectionError,
    is_success, is_failure
)
from app.service.agent.orchestration.hybrid.migration.feature_flags.flag_manager import GraphType


async def test_typed_graph_selection():
    """Test that graph selection returns typed results."""
    print("🧪 Testing Typed Graph Selection Results")
    print("=" * 50)
    
    selector = GraphSelector()
    
    # Test 1: Valid selection should return success
    print("\n1. Testing valid graph selection...")
    result = await selector.select_investigation_graph(
        investigation_id="test_typed_001",
        entity_type="ip"
    )
    
    print(f"   Result type: {type(result).__name__}")
    
    if is_success(result):
        print("   ✅ Success result returned")
        print(f"     Graph type: {result.graph_type.value}")
        print(f"     Selection reason: {result.spec.selection_reason.value}")
        print(f"     Fallback occurred: {result.fallback_occurred}")
    else:
        print("   ❌ Unexpected failure result")
        print(f"     Error: {result.error}")
        return False
    
    # Test 2: Invalid investigation ID should return failure
    print("\n2. Testing invalid investigation ID...")
    result = await selector.select_investigation_graph(
        investigation_id="",  # Empty ID should fail
        entity_type="ip"
    )
    
    if is_failure(result):
        print("   ✅ Failure result returned for invalid ID")
        print(f"     Error: {result.error}")
    else:
        print("   ❌ Expected failure but got success")
        return False
    
    # Test 3: Forced graph type should work
    print("\n3. Testing forced graph type...")
    result = await selector.select_investigation_graph(
        investigation_id="test_forced_001",
        entity_type="ip",
        force_graph_type=GraphType.CLEAN
    )
    
    if is_success(result):
        print("   ✅ Forced graph type successful")
        print(f"     Graph type: {result.graph_type.value}")
        print(f"     Selection reason: {result.spec.selection_reason.value}")
        assert result.graph_type == GraphType.CLEAN
    else:
        print("   ❌ Forced graph type failed")
        print(f"     Error: {result.error}")
        return False
    
    return True


async def test_fallback_counter():
    """Test that fallback counter tracks silent degradations."""
    print("\n🧪 Testing Fallback Counter")
    print("=" * 30)
    
    selector = GraphSelector()
    initial_count = selector.get_fallback_counter()
    print(f"   Initial fallback counter: {initial_count}")
    
    # Normal selection should not increment counter
    result = await selector.select_investigation_graph(
        investigation_id="test_counter_001",
        entity_type="ip"
    )
    
    if is_success(result) and not result.fallback_occurred:
        normal_count = selector.get_fallback_counter()
        print(f"   After normal selection: {normal_count}")
        
        if normal_count == initial_count:
            print("   ✅ Normal selection didn't increment fallback counter")
        else:
            print("   ❌ Normal selection incorrectly incremented counter")
            return False
    
    return True


async def test_legacy_method_compatibility():
    """Test that legacy method raises typed exceptions."""
    print("\n🧪 Testing Legacy Method Compatibility")
    print("=" * 35)
    
    selector = GraphSelector()
    
    # Test valid case
    print("   Testing valid legacy call...")
    try:
        graph = await selector.get_investigation_graph(
            investigation_id="test_legacy_001",
            entity_type="ip"
        )
        print("   ✅ Legacy method returned graph successfully")
        print(f"     Graph type: {type(graph).__name__}")
    except Exception as e:
        print(f"   ❌ Legacy method failed unexpectedly: {e}")
        return False
    
    # Test invalid case - should raise typed exception
    print("   Testing invalid legacy call...")
    try:
        graph = await selector.get_investigation_graph(
            investigation_id="",  # Empty ID should fail
            entity_type="ip"
        )
        print("   ❌ Legacy method should have raised exception")
        return False
    except GraphSelectionError as e:
        print("   ✅ Legacy method raised typed exception")
        print(f"     Error: {e}")
        print(f"     Investigation ID: {e.investigation_id}")
        print(f"     Context: {e.context}")
    except Exception as e:
        print(f"   ❌ Legacy method raised wrong exception type: {type(e).__name__}")
        return False
    
    return True


async def test_selection_stats():
    """Test that selection stats include fallback tracking."""
    print("\n🧪 Testing Selection Statistics")
    print("=" * 30)
    
    selector = GraphSelector()
    
    # Perform a few selections
    await selector.select_investigation_graph("test_stats_001", "ip")
    await selector.select_investigation_graph("test_stats_002", "user_id")
    
    stats = selector.get_selection_stats()
    
    required_fields = ["total_selections", "graph_type_counts", "selection_reason_counts", "fallback_counter", "fallback_rate"]
    
    for field in required_fields:
        if field in stats:
            print(f"   ✅ {field}: {stats[field]}")
        else:
            print(f"   ❌ Missing required field: {field}")
            return False
    
    return True


async def run_all_tests():
    """Run all graph selection hardening tests."""
    print("🎯 Running Graph Selection Hardening Tests\n")
    
    tests = [
        ("Typed Graph Selection", test_typed_graph_selection),
        ("Fallback Counter", test_fallback_counter), 
        ("Legacy Method Compatibility", test_legacy_method_compatibility),
        ("Selection Statistics", test_selection_stats)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = await test_func()
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
    print('='*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL GRAPH SELECTION HARDENING TESTS PASSED!")
        return True
    else:
        print("⚠️ Some tests failed - graph selection needs more work")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
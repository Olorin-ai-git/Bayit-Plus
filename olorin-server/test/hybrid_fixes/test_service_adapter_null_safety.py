#!/usr/bin/env python3
"""
Test Service Adapter Null Safety Fixes

Validates that the service adapter handles null/None values safely
and prevents the NoneType crashes found in production.
"""

import asyncio
import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))

from app.service.agent.orchestration.hybrid.integration.service_adapter import ServiceAdapter


def test_service_adapter_initialization():
    """Test that service adapter initializes safely even with graph selector failures."""
    print("🧪 Testing Service Adapter Initialization")
    print("=" * 40)
    
    # Test normal initialization
    with patch('app.service.agent.orchestration.hybrid.integration.service_adapter.GraphSelector') as MockGraphSelector:
        adapter = ServiceAdapter()
        
        print(f"   Graph selector initialized: {adapter.graph_selector is not None}")
        assert adapter.graph_selector is not None
        MockGraphSelector.assert_called_once()
    
    # Test initialization with graph selector failure
    with patch('app.service.agent.orchestration.hybrid.integration.service_adapter.GraphSelector', side_effect=Exception("Mock init failure")):
        adapter = ServiceAdapter()
        
        print(f"   Graph selector after failure: {adapter.graph_selector}")
        assert adapter.graph_selector is None
    
    print("   ✅ Service adapter initialization working")
    return True


async def test_graph_selection_null_safety():
    """Test graph selection with null safety checks."""
    print("\n🧪 Testing Graph Selection Null Safety")
    print("=" * 35)
    
    adapter = ServiceAdapter()
    
    # Test with uninitialized graph selector
    adapter.graph_selector = None
    
    try:
        await adapter.get_investigation_graph("test-id", "ip")
        assert False, "Should have raised RuntimeError"
    except RuntimeError as e:
        print(f"   Caught expected error: {str(e)}")
        assert "Graph selector not initialized" in str(e)
    
    print("   ✅ Null safety checks working")
    return True


def test_service_statistics_null_safety():
    """Test service statistics with null safety."""
    print("\n🧪 Testing Service Statistics Null Safety")
    print("=" * 35)
    
    adapter = ServiceAdapter()
    
    # Test with uninitialized graph selector
    adapter.graph_selector = None
    stats = adapter.get_service_statistics()
    
    print(f"   Graph selector initialized: {stats['graph_selector_initialized']}")
    print(f"   Graph selector stats: {stats['graph_selector_stats']}")
    
    assert stats["graph_selector_initialized"] is False
    assert "error" in stats["graph_selector_stats"]
    assert "Graph selector not available" in stats["graph_selector_stats"]["error"]
    
    # Test with mock graph selector that fails
    mock_selector = Mock()
    mock_selector.get_selection_stats.side_effect = Exception("Mock stats failure")
    adapter.graph_selector = mock_selector
    
    stats = adapter.get_service_statistics()
    print(f"   Stats with mock failure: {stats['graph_selector_stats']}")
    
    assert "error" in stats["graph_selector_stats"]
    assert "Failed to get stats" in stats["graph_selector_stats"]["error"]
    
    print("   ✅ Statistics null safety working")
    return True


def test_graph_type_determination_null_safety():
    """Test graph type determination with null safety."""
    print("\n🧪 Testing Graph Type Determination")
    print("=" * 30)
    
    adapter = ServiceAdapter()
    
    # Test with None graph
    graph_type = adapter._determine_graph_type(None)
    print(f"   None graph type: {graph_type}")
    assert graph_type == "unknown"
    
    # Test with mock graph that has no _nodes
    mock_graph = Mock()
    mock_graph._nodes = None
    graph_type = adapter._determine_graph_type(mock_graph)
    print(f"   Graph with no nodes: {graph_type}")
    assert graph_type == "unknown"
    
    # Test with mock graph that has nodes
    mock_graph._nodes = {"start": {}, "end": {}, "ai_confidence_engine": {}}
    graph_type = adapter._determine_graph_type(mock_graph)
    print(f"   Graph with AI confidence nodes: {graph_type}")
    assert graph_type == "hybrid"
    
    # Test with mock graph that throws exception
    mock_graph._nodes = Mock()
    mock_graph._nodes.__iter__ = Mock(side_effect=Exception("Mock node iteration failure"))
    graph_type = adapter._determine_graph_type(mock_graph)
    print(f"   Graph with exception: {graph_type}")
    assert graph_type == "unknown"
    
    print("   ✅ Graph type determination working")
    return True


def test_hybrid_graph_config_validation():
    """Test hybrid graph configuration validation."""
    print("\n🧪 Testing Hybrid Graph Config Validation")
    print("=" * 40)
    
    adapter = ServiceAdapter()
    
    # Test with no graph selector
    adapter.graph_selector = None
    result = adapter.ensure_hybrid_graph_config()
    print(f"   No graph selector result: {result}")
    assert result is False
    
    # Test with mock graph selector that has no feature flags
    mock_selector = Mock()
    del mock_selector.feature_flags  # Remove the attribute
    adapter.graph_selector = mock_selector
    result = adapter.ensure_hybrid_graph_config()
    print(f"   No feature flags result: {result}")
    assert result is False
    
    # Test with mock feature flags that return error
    mock_selector = Mock()
    mock_selector.feature_flags.get_flag_status.return_value = {"error": "Flag not found"}
    adapter.graph_selector = mock_selector
    result = adapter.ensure_hybrid_graph_config()
    print(f"   Flag error result: {result}")
    assert result is False
    
    # Test with valid configuration
    mock_selector = Mock()
    mock_selector.feature_flags.get_flag_status.return_value = {
        "enabled": True,
        "rollout_percentage": 100
    }
    adapter.graph_selector = mock_selector
    result = adapter.ensure_hybrid_graph_config()
    print(f"   Valid config result: {result}")
    assert result is True
    
    print("   ✅ Hybrid graph config validation working")
    return True


async def test_investigation_completion_null_safety():
    """Test investigation completion with null safety."""
    print("\n🧪 Testing Investigation Completion Null Safety")
    print("=" * 42)
    
    adapter = ServiceAdapter()
    
    # Add a mock investigation
    adapter.active_investigations["test-123"] = {
        "entity_type": "ip",
        "start_time": "2024-01-01T00:00:00",
        "service_context": {},
        "graph_type": "hybrid"
    }
    
    # Test with no graph selector
    adapter.graph_selector = None
    await adapter.complete_investigation("test-123", True)
    
    # Should complete without crashing
    assert "test-123" not in adapter.active_investigations
    
    print("   ✅ Investigation completion null safety working")
    return True


async def run_all_tests():
    """Run all service adapter null safety tests."""
    print("🎯 Running Service Adapter Null Safety Tests\n")
    
    tests = [
        ("Service Adapter Initialization", test_service_adapter_initialization),
        ("Graph Selection Null Safety", test_graph_selection_null_safety),
        ("Service Statistics Null Safety", test_service_statistics_null_safety),
        ("Graph Type Determination", test_graph_type_determination_null_safety),
        ("Hybrid Graph Config Validation", test_hybrid_graph_config_validation),
        ("Investigation Completion Null Safety", test_investigation_completion_null_safety)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
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
    print('='*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL SERVICE ADAPTER NULL SAFETY TESTS PASSED!")
        print("   ✅ Service adapter initializes safely")
        print("   ✅ Graph selection handles null values")
        print("   ✅ Statistics generation is null-safe")
        print("   ✅ Graph type determination is safe")
        print("   ✅ Configuration validation works")
        print("   ✅ Investigation completion is safe")
        return True
    else:
        print("⚠️ Some tests failed - service adapter needs more work")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
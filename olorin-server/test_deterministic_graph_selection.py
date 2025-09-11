#!/usr/bin/env python3
"""
Deterministic Graph Selection Tests

Tests to ensure graph selection is deterministic and predictable:
1. Same inputs always select the same graph type
2. Rollback triggers fire predictably under specific conditions  
3. A/B test assignments are consistent with fixed seeds
4. Feature flag logic is deterministic

These tests ensure production reliability and prevent oscillation in graph selection.
"""

import pytest
import asyncio
from typing import Dict, Any
from unittest.mock import patch, MagicMock

# Test imports with error handling
try:
    from app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector import GraphSelector
    from app.service.agent.orchestration.hybrid.migration.feature_flags.flag_manager import GraphType, FeatureFlags
    from app.service.agent.orchestration.hybrid.migration.rollback.rollback_triggers import RollbackTriggers
    graph_selection_imports_available = True
except ImportError as e:
    print(f"⚠️ Graph selection imports not available: {e}")
    graph_selection_imports_available = False


class TestDeterministicGraphSelection:
    """Test deterministic behavior of graph selection logic."""
    
    @pytest.mark.skipif(not graph_selection_imports_available, reason="Graph selection imports not available")
    @pytest.mark.asyncio
    async def test_same_inputs_same_graph_determinism(self):
        """Test that identical inputs always produce identical graph selections."""
        
        # Mock the graph builders to avoid actual graph compilation
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            # Setup mock
            mock_graph_instance = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph_instance
            
            selector = GraphSelector()
            
            # Test data: identical inputs should produce identical results
            test_cases = [
                {
                    "investigation_id": "test-001",
                    "entity_type": "ip_address"
                },
                {
                    "investigation_id": "test-002", 
                    "entity_type": "user"
                },
                {
                    "investigation_id": "test-003",
                    "entity_type": "device"
                }
            ]
            
            for test_case in test_cases:
                # Run the same selection multiple times
                results = []
                
                for attempt in range(5):  # Test 5 identical runs
                    # Reset selector state to ensure clean test
                    selector.performance_metrics.clear()
                    
                    graph = await selector.get_investigation_graph(**test_case)
                    
                    # Record the selection decision
                    selection_record = selector.get_selection_history(test_case["investigation_id"])
                    graph_type = selection_record[test_case["investigation_id"]]["graph_type"]
                    selection_reason = selection_record[test_case["investigation_id"]]["selection_reason"]
                    
                    results.append((graph_type, selection_reason))
                
                # Verify all results are identical
                first_result = results[0]
                for i, result in enumerate(results[1:], 1):
                    assert result == first_result, f"Selection {i+1} differs from first: {result} vs {first_result}"
                
                print(f"✅ Deterministic selection for {test_case['investigation_id']}: {first_result}")
    
    @pytest.mark.skipif(not graph_selection_imports_available, reason="Graph selection imports not available")
    @pytest.mark.asyncio
    async def test_rollback_trigger_determinism(self):
        """Test that rollback triggers fire predictably under specific conditions."""
        
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            mock_graph_instance = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph_instance
            
            selector = GraphSelector()
            
            # Test rollback behavior determinism
            test_scenarios = [
                {"trigger_rollback": False, "expected_reason": "feature_flag"},
                {"trigger_rollback": True, "expected_reason": "rollback"}
            ]
            
            for scenario in test_scenarios:
                # Mock rollback trigger state
                with patch.object(selector.rollback_triggers, 'should_rollback', return_value=scenario["trigger_rollback"]):
                    
                    # Run multiple times with same conditions
                    results = []
                    for attempt in range(3):
                        selector.performance_metrics.clear()
                        
                        graph = await selector.get_investigation_graph("test-rollback-001")
                        selection_record = selector.get_selection_history("test-rollback-001")
                        selection_reason = selection_record["test-rollback-001"]["selection_reason"]
                        
                        results.append(selection_reason)
                    
                    # Verify consistent behavior
                    assert all(reason == scenario["expected_reason"] for reason in results), \
                        f"Inconsistent rollback behavior: {results}"
                    
                    print(f"✅ Rollback determinism: trigger={scenario['trigger_rollback']} → reason={scenario['expected_reason']}")
    
    @pytest.mark.skipif(not graph_selection_imports_available, reason="Graph selection imports not available") 
    @pytest.mark.asyncio
    async def test_feature_flag_determinism(self):
        """Test that feature flag logic produces consistent results."""
        
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            mock_graph_instance = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph_instance
            
            selector = GraphSelector()
            
            # Test different feature flag states
            flag_scenarios = [
                {"hybrid_enabled": True, "expected_graph": "HYBRID"},
                {"hybrid_enabled": False, "expected_graph": "CLEAN"}
            ]
            
            for scenario in flag_scenarios:
                # Mock feature flag state
                with patch.object(selector.feature_flags, 'is_enabled', return_value=scenario["hybrid_enabled"]):
                    # Mock rollback triggers to be inactive
                    with patch.object(selector.rollback_triggers, 'should_rollback', return_value=False):
                        # Mock A/B test to return None
                        with patch.object(selector.ab_test_manager, 'get_ab_test_assignment', return_value=None):
                            
                            # Run multiple times with same feature flag state
                            results = []
                            for attempt in range(3):
                                selector.performance_metrics.clear()
                                
                                graph = await selector.get_investigation_graph("test-flag-001")
                                selection_record = selector.get_selection_history("test-flag-001")
                                graph_type = selection_record["test-flag-001"]["graph_type"]
                                
                                results.append(graph_type)
                            
                            # Verify consistent results
                            expected_graph = scenario["expected_graph"]
                            assert all(graph_type == expected_graph for graph_type in results), \
                                f"Inconsistent feature flag behavior: {results}, expected: {expected_graph}"
                            
                            print(f"✅ Feature flag determinism: enabled={scenario['hybrid_enabled']} → graph={expected_graph}")
    
    @pytest.mark.skipif(not graph_selection_imports_available, reason="Graph selection imports not available")
    @pytest.mark.asyncio
    async def test_ab_test_assignment_consistency(self):
        """Test that A/B test assignments are consistent for the same investigation ID."""
        
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            mock_graph_instance = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph_instance
            
            selector = GraphSelector()
            
            # Mock rollback and feature flags to be inactive so A/B test takes precedence
            with patch.object(selector.rollback_triggers, 'should_rollback', return_value=False):
                
                # Test A/B assignment consistency
                test_investigation_ids = ["ab-test-001", "ab-test-002", "ab-test-003"]
                
                for investigation_id in test_investigation_ids:
                    # Mock A/B test to return a specific assignment
                    mock_assignment = GraphType.HYBRID
                    with patch.object(selector.ab_test_manager, 'get_ab_test_assignment', return_value=mock_assignment):
                        
                        # Run multiple times - should get same assignment
                        results = []
                        for attempt in range(3):
                            selector.performance_metrics.clear()
                            
                            graph = await selector.get_investigation_graph(investigation_id)
                            selection_record = selector.get_selection_history(investigation_id)
                            selection_reason = selection_record[investigation_id]["selection_reason"]
                            graph_type = selection_record[investigation_id]["graph_type"]
                            
                            results.append((graph_type, selection_reason))
                        
                        # Verify consistency
                        first_result = results[0]
                        assert all(result == first_result for result in results), \
                            f"Inconsistent A/B test assignment for {investigation_id}: {results}"
                        
                        assert first_result[1] == "ab_test", f"Expected ab_test reason, got {first_result[1]}"
                        
                        print(f"✅ A/B test consistency for {investigation_id}: {first_result}")
    
    @pytest.mark.skipif(not graph_selection_imports_available, reason="Graph selection imports not available")
    @pytest.mark.asyncio
    async def test_priority_order_determinism(self):
        """Test that selection priority order is deterministic and correct."""
        
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            mock_graph_instance = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph_instance
            
            # Test priority: forced > rollback > A/B test > feature flag > default
            
            # Test 1: Forced graph type (highest priority)
            selector = GraphSelector()
            graph = await selector.get_investigation_graph("test-001", force_graph_type=GraphType.ORCHESTRATOR)
            record = selector.get_selection_history("test-001")["test-001"]
            assert record["selection_reason"] == "forced"
            assert record["graph_type"] == "ORCHESTRATOR"
            print("✅ Forced graph type has highest priority")
            
            # Test 2: Rollback overrides everything except forced
            selector = GraphSelector()
            with patch.object(selector.rollback_triggers, 'should_rollback', return_value=True):
                with patch.object(selector.ab_test_manager, 'get_ab_test_assignment', return_value=GraphType.HYBRID):
                    with patch.object(selector.feature_flags, 'is_enabled', return_value=True):
                        
                        graph = await selector.get_investigation_graph("test-002")
                        record = selector.get_selection_history("test-002")["test-002"]
                        assert record["selection_reason"] == "rollback"
                        assert record["graph_type"] == "CLEAN"
                        print("✅ Rollback overrides A/B test and feature flags")
            
            # Test 3: A/B test overrides feature flags
            selector = GraphSelector()
            with patch.object(selector.rollback_triggers, 'should_rollback', return_value=False):
                with patch.object(selector.ab_test_manager, 'get_ab_test_assignment', return_value=GraphType.ORCHESTRATOR):
                    with patch.object(selector.feature_flags, 'is_enabled', return_value=True):
                        
                        graph = await selector.get_investigation_graph("test-003")
                        record = selector.get_selection_history("test-003")["test-003"]
                        assert record["selection_reason"] == "ab_test"
                        assert record["graph_type"] == "ORCHESTRATOR"
                        print("✅ A/B test overrides feature flags")


class TestGraphSelectionEdgeCases:
    """Test edge cases and error scenarios in graph selection."""
    
    @pytest.mark.skipif(not graph_selection_imports_available, reason="Graph selection imports not available")
    @pytest.mark.asyncio
    async def test_error_fallback_determinism(self):
        """Test that error scenarios always fall back to clean graph."""
        
        # Mock graph builders to simulate failures
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            
            def build_graph_side_effect(graph_type):
                if graph_type == GraphType.HYBRID:
                    raise Exception("Hybrid graph build failed")
                elif graph_type == GraphType.ORCHESTRATOR:
                    raise Exception("Orchestrator graph build failed")
                else:  # CLEAN
                    return MagicMock()  # Success
            
            mock_builders.return_value.build_graph.side_effect = build_graph_side_effect
            
            selector = GraphSelector()
            
            # Mock feature flags to prefer hybrid (which will fail)
            with patch.object(selector.feature_flags, 'is_enabled', return_value=True):
                with patch.object(selector.rollback_triggers, 'should_rollback', return_value=False):
                    with patch.object(selector.ab_test_manager, 'get_ab_test_assignment', return_value=None):
                        
                        # Should fallback to clean graph
                        graph = await selector.get_investigation_graph("test-error-001")
                        record = selector.get_selection_history("test-error-001")["test-error-001"]
                        
                        assert record["selection_reason"] == "emergency_fallback"
                        assert record["graph_type"] == "CLEAN"
                        print("✅ Error scenarios deterministically fall back to clean graph")


def run_manual_tests():
    """Run tests manually for development/debugging."""
    print("🧪 Running Deterministic Graph Selection Tests")
    
    if not graph_selection_imports_available:
        print("❌ Graph selection imports not available - skipping tests")
        return
    
    async def test_basic_determinism():
        """Test basic deterministic behavior."""
        print("\n✅ Testing basic determinism...")
        
        # Mock dependencies for isolated testing
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            mock_graph = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph
            
            selector = GraphSelector()
            
            # Test same input produces same result
            investigation_id = "determinism-test-001"
            results = []
            
            for i in range(3):
                selector.performance_metrics.clear()
                
                # Mock consistent state
                with patch.object(selector.rollback_triggers, 'should_rollback', return_value=False):
                    with patch.object(selector.feature_flags, 'is_enabled', return_value=True):
                        with patch.object(selector.ab_test_manager, 'get_ab_test_assignment', return_value=None):
                            
                            graph = await selector.get_investigation_graph(investigation_id)
                            record = selector.get_selection_history(investigation_id)[investigation_id]
                            results.append((record["graph_type"], record["selection_reason"]))
            
            # Verify consistency
            first_result = results[0]
            all_same = all(result == first_result for result in results)
            
            if all_same:
                print(f"   ✅ Consistent results: {first_result}")
            else:
                print(f"   ❌ Inconsistent results: {results}")
                
            return all_same
    
    async def test_rollback_consistency():
        """Test rollback trigger consistency."""
        print("\n✅ Testing rollback consistency...")
        
        with patch('app.service.agent.orchestration.hybrid.migration.graph_selection.graph_selector.GraphBuilders') as mock_builders:
            mock_graph = MagicMock()
            mock_builders.return_value.build_graph.return_value = mock_graph
            
            selector = GraphSelector()
            
            # Test rollback trigger determinism
            with patch.object(selector.rollback_triggers, 'should_rollback', return_value=True):
                results = []
                
                for i in range(3):
                    selector.performance_metrics.clear()
                    graph = await selector.get_investigation_graph(f"rollback-test-{i}")
                    record = selector.get_selection_history(f"rollback-test-{i}")[f"rollback-test-{i}"]
                    results.append(record["selection_reason"])
                
                consistent = all(reason == "rollback" for reason in results)
                
                if consistent:
                    print(f"   ✅ Rollback triggers consistently: {results}")
                else:
                    print(f"   ❌ Rollback triggers inconsistently: {results}")
                
                return consistent
    
    # Run async tests
    async def run_all_tests():
        basic_ok = await test_basic_determinism()
        rollback_ok = await test_rollback_consistency()
        
        print(f"\n🎯 Deterministic Graph Selection Test Results:")
        print(f"   Basic Determinism: {'✅ PASS' if basic_ok else '❌ FAIL'}")
        print(f"   Rollback Consistency: {'✅ PASS' if rollback_ok else '❌ FAIL'}")
        
        if basic_ok and rollback_ok:
            print("\n🎉 All deterministic tests passed!")
            print("   ✅ Same inputs → Same graph selection")
            print("   ✅ Rollback triggers are predictable")
            print("   ✅ Graph selection logic is deterministic")
        else:
            print("\n⚠️ Some deterministic tests failed - review graph selection logic")
    
    # Run the tests
    asyncio.run(run_all_tests())


if __name__ == "__main__":
    run_manual_tests()
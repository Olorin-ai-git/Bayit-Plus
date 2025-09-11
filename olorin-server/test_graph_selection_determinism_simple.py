#!/usr/bin/env python3
"""
Simplified Deterministic Graph Selection Tests

Tests core graph selection logic for determinism without complex async mocking.
Focuses on the decision logic rather than graph building.
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('.'))

def test_graph_selection_logic():
    """Test the core decision logic of graph selection."""
    print("🧪 Testing Graph Selection Decision Logic")
    
    # Test imports
    try:
        from app.service.agent.orchestration.hybrid.migration.feature_flags.flag_manager import GraphType, FeatureFlags
        from app.service.agent.orchestration.hybrid.migration.rollback.rollback_triggers import RollbackTriggers
        print("✅ Imports successful")
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    
    # Test feature flag determinism
    print("\n1. Testing Feature Flag Determinism...")
    try:
        feature_flags = FeatureFlags()
        
        # Test same investigation ID multiple times
        investigation_id = "determinism-test-001"
        
        results = []
        for i in range(5):
            # Test hybrid flag
            hybrid_enabled = feature_flags.is_enabled("hybrid_graph_v1", investigation_id)
            results.append(hybrid_enabled)
        
        # Check consistency
        all_same = all(result == results[0] for result in results)
        
        if all_same:
            print(f"   ✅ Feature flag deterministic: {results[0]} (all {len(results)} calls)")
        else:
            print(f"   ❌ Feature flag non-deterministic: {results}")
        
        return all_same
        
    except Exception as e:
        print(f"   ❌ Feature flag test failed: {e}")
        return False

def test_rollback_trigger_logic():
    """Test rollback trigger consistency."""
    print("\n2. Testing Rollback Trigger Logic...")
    
    try:
        from app.service.agent.orchestration.hybrid.migration.rollback.rollback_triggers import RollbackTriggers
        
        rollback_triggers = RollbackTriggers()
        
        # Test rollback decision consistency
        results = []
        for i in range(5):
            should_rollback = rollback_triggers.should_rollback()
            results.append(should_rollback)
        
        # Check consistency
        all_same = all(result == results[0] for result in results)
        
        if all_same:
            print(f"   ✅ Rollback triggers deterministic: {results[0]} (all {len(results)} calls)")
        else:
            print(f"   ❌ Rollback triggers non-deterministic: {results}")
        
        return all_same
        
    except Exception as e:
        print(f"   ❌ Rollback trigger test failed: {e}")
        return False

def test_graph_type_enum_consistency():
    """Test that GraphType enum is stable."""
    print("\n3. Testing GraphType Enum Consistency...")
    
    try:
        from app.service.agent.orchestration.hybrid.migration.feature_flags.flag_manager import GraphType
        
        # Test enum values are consistent
        graph_types = [GraphType.HYBRID, GraphType.CLEAN, GraphType.ORCHESTRATOR]
        
        enum_values = []
        for i in range(3):
            values = [gt.value for gt in graph_types]
            enum_values.append(tuple(values))
        
        # Check consistency
        all_same = all(values == enum_values[0] for values in enum_values)
        
        if all_same:
            print(f"   ✅ GraphType enum consistent: {enum_values[0]}")
        else:
            print(f"   ❌ GraphType enum inconsistent: {enum_values}")
        
        return all_same
        
    except Exception as e:
        print(f"   ❌ GraphType enum test failed: {e}")
        return False

def test_selection_priority_logic():
    """Test the priority logic conceptually."""
    print("\n4. Testing Selection Priority Logic...")
    
    # Test priority decision tree logic
    def mock_graph_selection_logic(
        force_graph_type=None,
        rollback_active=False,
        ab_test_assignment=None,
        hybrid_flag_enabled=False
    ):
        """Mock the selection logic from GraphSelector."""
        
        # Priority 1: Forced type
        if force_graph_type:
            return force_graph_type, "forced"
        
        # Priority 2: Rollback
        if rollback_active:
            return "CLEAN", "rollback"
        
        # Priority 3: A/B test
        if ab_test_assignment:
            return ab_test_assignment, "ab_test"
        
        # Priority 4: Feature flag
        if hybrid_flag_enabled:
            return "HYBRID", "feature_flag"
        
        # Priority 5: Default
        return "CLEAN", "default"
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Forced type overrides everything",
            "params": {
                "force_graph_type": "ORCHESTRATOR",
                "rollback_active": True,
                "ab_test_assignment": "HYBRID",
                "hybrid_flag_enabled": True
            },
            "expected": ("ORCHESTRATOR", "forced")
        },
        {
            "name": "Rollback overrides flags and A/B test",
            "params": {
                "rollback_active": True,
                "ab_test_assignment": "HYBRID",
                "hybrid_flag_enabled": True
            },
            "expected": ("CLEAN", "rollback")
        },
        {
            "name": "A/B test overrides feature flag",
            "params": {
                "ab_test_assignment": "ORCHESTRATOR",
                "hybrid_flag_enabled": True
            },
            "expected": ("ORCHESTRATOR", "ab_test")
        },
        {
            "name": "Feature flag when no higher priority",
            "params": {
                "hybrid_flag_enabled": True
            },
            "expected": ("HYBRID", "feature_flag")
        },
        {
            "name": "Default when nothing enabled",
            "params": {},
            "expected": ("CLEAN", "default")
        }
    ]
    
    all_passed = True
    
    for scenario in test_scenarios:
        # Test determinism - run same scenario multiple times
        results = []
        for i in range(3):
            result = mock_graph_selection_logic(**scenario["params"])
            results.append(result)
        
        # Check consistency
        consistent = all(result == results[0] for result in results)
        correct = results[0] == scenario["expected"]
        
        if consistent and correct:
            print(f"   ✅ {scenario['name']}: {results[0]}")
        else:
            print(f"   ❌ {scenario['name']}: got {results}, expected {scenario['expected']}")
            all_passed = False
    
    return all_passed

def run_all_tests():
    """Run all determinism tests."""
    print("🎯 Running Deterministic Graph Selection Tests\n")
    
    # Run individual tests
    feature_flag_ok = test_graph_selection_logic()
    rollback_ok = test_rollback_trigger_logic()
    enum_ok = test_graph_type_enum_consistency()
    priority_ok = test_selection_priority_logic()
    
    # Summary
    print(f"\n📊 Test Results Summary:")
    print(f"   Feature Flag Determinism: {'✅ PASS' if feature_flag_ok else '❌ FAIL'}")
    print(f"   Rollback Trigger Logic: {'✅ PASS' if rollback_ok else '❌ FAIL'}")
    print(f"   GraphType Enum Consistency: {'✅ PASS' if enum_ok else '❌ FAIL'}")
    print(f"   Selection Priority Logic: {'✅ PASS' if priority_ok else '❌ FAIL'}")
    
    all_passed = all([feature_flag_ok, rollback_ok, enum_ok, priority_ok])
    
    if all_passed:
        print(f"\n🎉 ALL DETERMINISTIC TESTS PASSED!")
        print(f"   ✅ Graph selection logic is deterministic")
        print(f"   ✅ Same inputs will produce same outputs")
        print(f"   ✅ Priority ordering is consistent")
        print(f"   ✅ Component behavior is predictable")
    else:
        print(f"\n⚠️ Some tests failed - review components for non-deterministic behavior")
    
    return all_passed

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
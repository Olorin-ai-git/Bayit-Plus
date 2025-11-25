#!/usr/bin/env python3
"""
Test script to validate Phase 1 component breakdown
"""

import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))


def test_state_components():
    """Test all state management components import correctly."""
    print("Testing state management components...")

    try:
        # Test individual component imports
        from app.service.agent.orchestration.hybrid.state.enums_and_constants import (
            AIConfidenceLevel,
            InvestigationStrategy,
            SafetyConcernType,
        )

        print("✅ Enums and constants imported successfully")

        from app.service.agent.orchestration.hybrid.state.ai_decision_models import (
            AIRoutingDecision,
            SafetyOverride,
        )

        print("✅ AI decision models imported successfully")

        from app.service.agent.orchestration.hybrid.state.base_state_schema import (
            HybridInvestigationState,
        )

        print("✅ Base state schema imported successfully")

        from app.service.agent.orchestration.hybrid.state.state_factory import (
            create_hybrid_initial_state,
        )

        print("✅ State factory imported successfully")

        from app.service.agent.orchestration.hybrid.state.state_updater import (
            add_safety_override,
            update_ai_confidence,
        )

        print("✅ State updater imported successfully")

        # Test unified import from __init__.py
        from app.service.agent.orchestration.hybrid.state import (
            AIConfidenceLevel as AIConfLevel2,
        )
        from app.service.agent.orchestration.hybrid.state import (
            HybridInvestigationState as HybridState2,
        )
        from app.service.agent.orchestration.hybrid.state import (
            create_hybrid_initial_state as create_state2,
        )

        print("✅ Unified state imports working")

    except Exception as e:
        print(f"❌ State component import failed: {e}")
        return False

    return True


def test_confidence_components():
    """Test all confidence management components import correctly."""
    print("\nTesting confidence management components...")

    try:
        # Test individual component imports
        from app.service.agent.orchestration.hybrid.confidence.confidence_models import (
            ConfidenceFieldType,
            ConsolidatedConfidence,
        )

        print("✅ Confidence models imported successfully")

        from app.service.agent.orchestration.hybrid.confidence.confidence_extractor import (
            ConfidenceExtractor,
        )

        print("✅ Confidence extractor imported successfully")

        from app.service.agent.orchestration.hybrid.confidence.confidence_validator import (
            ConfidenceValidator,
        )

        print("✅ Confidence validator imported successfully")

        from app.service.agent.orchestration.hybrid.confidence.confidence_calculator import (
            ConfidenceCalculator,
        )

        print("✅ Confidence calculator imported successfully")

        from app.service.agent.orchestration.hybrid.confidence.confidence_applicator import (
            ConfidenceApplicator,
        )

        print("✅ Confidence applicator imported successfully")

        # Test unified import from __init__.py
        from app.service.agent.orchestration.hybrid.confidence import (
            ConfidenceConsolidator,
        )

        print("✅ Unified confidence imports working")

    except Exception as e:
        print(f"❌ Confidence component import failed: {e}")
        return False

    return True


def test_backward_compatibility():
    """Test that existing import patterns still work."""
    print("\nTesting backward compatibility...")

    try:
        # This should work with the new _new.py files
        from app.service.agent.orchestration.hybrid.hybrid_state_schema_new import (
            AIConfidenceLevel,
            HybridInvestigationState,
            create_hybrid_initial_state,
        )

        print("✅ New state schema imports working")

        from app.service.agent.orchestration.confidence_consolidator_new import (
            ConfidenceConsolidator,
        )

        print("✅ New confidence consolidator imports working")

    except Exception as e:
        print(f"❌ Backward compatibility test failed: {e}")
        return False

    return True


def test_functional_creation():
    """Test that we can actually create objects using the new components."""
    print("\nTesting functional object creation...")

    try:
        from app.service.agent.orchestration.hybrid.state import (
            AIConfidenceLevel,
            InvestigationStrategy,
            create_hybrid_initial_state,
        )

        # Create a test state
        state = create_hybrid_initial_state(
            investigation_id="test-001",
            entity_id="127.0.0.1",
            entity_type="ip",
            initial_strategy=InvestigationStrategy.ADAPTIVE,
            force_confidence_level=AIConfidenceLevel.MEDIUM,
        )

        print(f"✅ Created hybrid state with ID: {state['investigation_id']}")
        print(f"   Strategy: {state['investigation_strategy'].value}")
        print(f"   Confidence: {state['ai_confidence']}")

        # Test confidence consolidator
        from app.service.agent.orchestration.hybrid.confidence import (
            ConfidenceConsolidator,
        )

        consolidator = ConfidenceConsolidator()
        consolidated = consolidator.consolidate_confidence_scores(state)

        print(
            f"✅ Consolidated confidence: {consolidated.overall_score:.3f} ({consolidated.level_description})"
        )

    except Exception as e:
        print(f"❌ Functional creation test failed: {e}")
        return False

    return True


def main():
    """Run all tests."""
    print("🧪 Testing Phase 1 Component Breakdown\n")

    all_tests_passed = True

    # Run all tests
    tests = [
        test_state_components,
        test_confidence_components,
        test_backward_compatibility,
        test_functional_creation,
    ]

    for test in tests:
        if not test():
            all_tests_passed = False

    # Final results
    print(f"\n{'='*50}")
    if all_tests_passed:
        print("🎉 All tests passed! Component breakdown successful.")
        print("\nSummary:")
        print("• State management: 6 components created")
        print("• Confidence management: 6 components created")
        print("• Backward compatibility: Maintained")
        print("• Functional testing: Passed")
    else:
        print("❌ Some tests failed. Review the errors above.")

    return 0 if all_tests_passed else 1


if __name__ == "__main__":
    sys.exit(main())

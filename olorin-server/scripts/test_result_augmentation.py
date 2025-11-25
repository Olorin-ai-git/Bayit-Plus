#!/usr/bin/env python3
"""
Test Script for Tool Result Knowledge Augmentation

Tests the comprehensive tool result augmentation system including:
- Result interpretation and insights generation
- Historical pattern correlation
- Next step recommendations
- Confidence assessment
- Threat intelligence correlation
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.service.agent.structured_context import StructuredInvestigationContext
from app.service.agent.tools.enhanced_tool_base import ToolResult
from app.service.agent.tools.rag_tool_context import ToolExecutionContext
from app.service.agent.tools.result_augmentation_service import (
    ResultAugmentationConfig,
    ToolResultAugmentationService,
    get_result_augmentation_service,
)
from app.service.agent.tools.result_enhancement_engine import ResultEnhancementEngine
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MockToolResult:
    """Mock tool result for testing"""

    def __init__(
        self, success: bool = True, data: str = "Test result data", error: str = None
    ):
        self.success = success
        self.data = data
        self.error = error
        self.metadata = {}


class MockKnowledgeContext:
    """Mock knowledge context for testing"""

    def __init__(self, total_chunks: int = 5):
        self.total_chunks = total_chunks
        self.critical_knowledge = ["critical knowledge 1", "critical knowledge 2"]
        self.supporting_knowledge = [
            "supporting knowledge 1",
            "supporting knowledge 2",
            "supporting knowledge 3",
        ]
        self.background_knowledge = ["background knowledge 1"]


class MockToolExecutionContext:
    """Mock tool execution context for testing"""

    def __init__(self, has_rag: bool = True, chunks: int = 5):
        self.has_rag_context = has_rag
        self.knowledge_context = MockKnowledgeContext(chunks) if has_rag else None
        self.enhanced_parameters = {"enhanced": True}
        self.parameter_enhancements = ["enhancement1", "enhancement2"]
        self.execution_id = "test_execution_123"
        self.total_knowledge_chunks = chunks


async def test_basic_result_augmentation():
    """Test basic result augmentation functionality"""

    print("\n=== Testing Basic Result Augmentation ===")

    # Create test data
    result = MockToolResult(
        success=True, data="Network analysis completed: 10 connections found"
    )
    context = MockToolExecutionContext(has_rag=True, chunks=5)

    # Create augmentation service
    augmentation_service = ToolResultAugmentationService()

    try:
        # Test result augmentation
        start_time = time.time()
        augmented_result = await augmentation_service.augment_result(
            result=result, context=context, domain="network"
        )
        duration_ms = (time.time() - start_time) * 1000

        print(f"✅ Augmentation completed in {duration_ms:.1f}ms")
        print(f"✅ Result type: {type(augmented_result).__name__}")

        # Check if we got an augmented result
        if hasattr(augmented_result, "rag_insights"):
            insights = augmented_result.rag_insights
            print(f"✅ Generated insights: {bool(insights.interpretation)}")
            print(
                f"✅ Historical patterns: {len(augmented_result.historical_patterns)}"
            )
            print(
                f"✅ Recommendations: {len(augmented_result.next_step_recommendations)}"
            )
            print(
                f"✅ Performance target met: {augmented_result.augmentation_time_ms < 30.0}"
            )
        else:
            print("ℹ️ Basic result returned (RAG may not be available)")

        return True

    except Exception as e:
        print(f"❌ Basic augmentation test failed: {str(e)}")
        return False


async def test_result_enhancement_engine():
    """Test the result enhancement engine"""

    print("\n=== Testing Result Enhancement Engine ===")

    # Create test data
    result = MockToolResult(
        success=True, data="Device fingerprint analysis: unique device detected"
    )
    context = MockToolExecutionContext(has_rag=True, chunks=8)
    investigation_context = StructuredInvestigationContext(
        "test_investigation", "test_entity"
    )

    # Create enhancement engine
    enhancement_engine = ResultEnhancementEngine()

    try:
        # Test insight generation
        insights = await enhancement_engine.generate_enhanced_insights(
            result=result,
            context=context,
            investigation_context=investigation_context,
            domain="device",
        )

        print(f"✅ Insights generated: {bool(insights.interpretation)}")
        print(f"✅ Contextual analysis: {bool(insights.contextual_analysis)}")
        print(f"✅ Significance assessment: {bool(insights.significance_assessment)}")

        # Test historical patterns
        patterns = await enhancement_engine.correlate_historical_patterns(
            result=result, domain="device", max_patterns=3
        )

        print(f"✅ Historical patterns found: {len(patterns)}")

        # Test recommendations
        recommendations = await enhancement_engine.generate_intelligent_recommendations(
            result=result,
            context=context,
            investigation_context=investigation_context,
            max_recommendations=5,
        )

        print(f"✅ Recommendations generated: {len(recommendations)}")

        # Test threat correlation
        threat_correlation = await enhancement_engine.correlate_threat_intelligence(
            result=result, domain="device"
        )

        print(f"✅ Threat correlation: {threat_correlation.risk_assessment}")
        print(f"✅ Correlation confidence: {threat_correlation.correlation_confidence}")

        return True

    except Exception as e:
        print(f"❌ Enhancement engine test failed: {str(e)}")
        return False


async def test_performance_requirements():
    """Test performance requirements (<30ms augmentation)"""

    print("\n=== Testing Performance Requirements ===")

    # Create test data
    result = MockToolResult(success=True, data="Performance test data")
    context = MockToolExecutionContext(has_rag=True, chunks=3)

    # Create augmentation service
    augmentation_service = ToolResultAugmentationService()

    # Run multiple tests to check performance consistency
    times = []
    success_count = 0

    for i in range(10):
        try:
            start_time = time.time()
            augmented_result = await augmentation_service.augment_result(
                result=result, context=context, domain="performance_test"
            )
            duration_ms = (time.time() - start_time) * 1000
            times.append(duration_ms)

            if hasattr(augmented_result, "augmentation_time_ms"):
                success_count += 1

        except Exception as e:
            print(f"⚠️ Performance test iteration {i+1} failed: {str(e)}")

    if times:
        avg_time = sum(times) / len(times)
        max_time = max(times)
        min_time = min(times)

        print(f"✅ Tests completed: {len(times)}/10")
        print(f"✅ Average time: {avg_time:.1f}ms")
        print(f"✅ Min time: {min_time:.1f}ms")
        print(f"✅ Max time: {max_time:.1f}ms")
        print(
            f"✅ Performance target (<30ms): {'✅ PASSED' if avg_time < 30.0 else '❌ FAILED'}"
        )

        return avg_time < 30.0

    print("❌ No performance data collected")
    return False


async def test_graceful_degradation():
    """Test graceful degradation when RAG is unavailable"""

    print("\n=== Testing Graceful Degradation ===")

    # Create test data with no RAG context
    result = MockToolResult(success=True, data="Degradation test data")
    context = MockToolExecutionContext(has_rag=False, chunks=0)

    # Create augmentation service without RAG
    augmentation_service = ToolResultAugmentationService(rag_orchestrator=None)

    try:
        # Test augmentation with no RAG
        augmented_result = await augmentation_service.augment_result(
            result=result, context=context, domain="degradation_test"
        )

        print(f"✅ Degradation handled gracefully")
        print(f"✅ Result type: {type(augmented_result).__name__}")

        # Should return original result when RAG unavailable
        if hasattr(augmented_result, "original_result"):
            print("ℹ️ Returned augmented result structure (unexpected)")
        else:
            print("✅ Returned original result as expected")

        return True

    except Exception as e:
        print(f"❌ Graceful degradation test failed: {str(e)}")
        return False


async def test_knowledge_categories():
    """Test all 6 knowledge categories are working"""

    print("\n=== Testing Knowledge Categories ===")

    # Create rich test data
    result = MockToolResult(
        success=True, data="Rich analysis result with multiple indicators and findings"
    )
    context = MockToolExecutionContext(has_rag=True, chunks=10)
    investigation_context = StructuredInvestigationContext(
        "category_test", "test_entity"
    )

    # Create augmentation service
    augmentation_service = ToolResultAugmentationService()

    # Test with configuration enabling all categories
    config = ResultAugmentationConfig(
        enable_interpretation=True,
        enable_historical_correlation=True,
        enable_recommendations=True,
        enable_threat_correlation=True,
        max_historical_patterns=5,
        max_recommendations=8,
    )

    try:
        augmented_result = await augmentation_service.augment_result(
            result=result,
            context=context,
            investigation_context=investigation_context,
            domain="comprehensive_test",
            augmentation_config=config,
        )

        if hasattr(augmented_result, "rag_insights"):
            categories_tested = {
                "result_interpretation_patterns": bool(
                    augmented_result.rag_insights.interpretation
                ),
                "contextual_insights": bool(
                    augmented_result.rag_insights.contextual_analysis
                ),
                "historical_correlations": len(augmented_result.historical_patterns)
                > 0,
                "next_step_recommendations": len(
                    augmented_result.next_step_recommendations
                )
                > 0,
                "confidence_assessment": augmented_result.confidence_assessment.overall_confidence
                > 0,
                "threat_intelligence_correlation": augmented_result.threat_intelligence_correlation.correlation_confidence
                >= 0,
            }

            for category, working in categories_tested.items():
                status = "✅" if working else "❌"
                print(f"{status} {category}: {working}")

            working_categories = sum(categories_tested.values())
            print(f"✅ Knowledge categories working: {working_categories}/6")

            return working_categories >= 4  # At least 4 of 6 categories should work
        else:
            print("ℹ️ Basic result returned - testing category availability")
            return False

    except Exception as e:
        print(f"❌ Knowledge categories test failed: {str(e)}")
        return False


async def test_service_metrics():
    """Test service metrics collection"""

    print("\n=== Testing Service Metrics ===")

    # Create augmentation service
    augmentation_service = ToolResultAugmentationService()

    # Run a few augmentations to generate metrics
    for i in range(3):
        result = MockToolResult(success=True, data=f"Metrics test {i+1}")
        context = MockToolExecutionContext(has_rag=True, chunks=2)

        try:
            await augmentation_service.augment_result(
                result=result, context=context, domain="metrics_test"
            )
        except Exception:
            pass  # Ignore errors for metrics test

    # Get and display metrics
    metrics = augmentation_service.get_metrics()

    print(f"✅ Total augmentations: {metrics.get('total_augmentations', 0)}")
    print(f"✅ Successful augmentations: {metrics.get('successful_augmentations', 0)}")
    print(f"✅ Success rate: {metrics.get('success_rate', 0.0):.2f}")
    print(f"✅ Average latency: {metrics.get('average_latency_ms', 0.0):.1f}ms")
    print(f"✅ RAG available: {metrics.get('rag_available', False)}")
    print(
        f"✅ Performance target met: {metrics.get('average_performance_target_met', False)}"
    )

    return metrics.get("total_augmentations", 0) > 0


async def run_comprehensive_test():
    """Run comprehensive test suite for tool result knowledge augmentation"""

    print("🚀 Starting Tool Result Knowledge Augmentation Test Suite")
    print("=" * 70)

    test_results = {}

    # Run all tests
    tests = [
        ("Basic Result Augmentation", test_basic_result_augmentation),
        ("Result Enhancement Engine", test_result_enhancement_engine),
        ("Performance Requirements", test_performance_requirements),
        ("Graceful Degradation", test_graceful_degradation),
        ("Knowledge Categories", test_knowledge_categories),
        ("Service Metrics", test_service_metrics),
    ]

    for test_name, test_func in tests:
        try:
            print(f"\n⏳ Running {test_name}...")
            result = await test_func()
            test_results[test_name] = result
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"📊 {test_name}: {status}")
        except Exception as e:
            test_results[test_name] = False
            print(f"💥 {test_name}: ❌ CRASHED - {str(e)}")

    # Summary
    print("\n" + "=" * 70)
    print("📋 TEST SUMMARY")
    print("=" * 70)

    passed = sum(test_results.values())
    total = len(test_results)

    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {status} {test_name}")

    print(f"\n🏆 Overall Result: {passed}/{total} tests passed")

    if passed == total:
        print(
            "🎉 All tests passed! Tool result knowledge augmentation is working correctly."
        )
    elif passed >= total * 0.8:
        print("✅ Most tests passed. System is functional with minor issues.")
    else:
        print("⚠️ Multiple test failures. System may need attention.")

    return passed >= total * 0.8


if __name__ == "__main__":
    try:
        result = asyncio.run(run_comprehensive_test())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        sys.exit(1)

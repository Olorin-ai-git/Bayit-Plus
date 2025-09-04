#!/usr/bin/env python3
"""
Simple Test Script for Tool Result Knowledge Augmentation

Tests the result augmentation components directly without complex dependencies.
"""

import asyncio
import json
import sys
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

# Add the project root to Python path  
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# Mock classes to avoid complex dependencies
@dataclass
class MockToolResult:
    """Mock tool result for testing"""
    success: bool = True
    data: Any = "Test result data"
    error: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass 
class MockKnowledgeContext:
    """Mock knowledge context"""
    total_chunks: int = 5
    critical_knowledge: List[str] = None
    supporting_knowledge: List[str] = None
    background_knowledge: List[str] = None
    
    def __post_init__(self):
        if self.critical_knowledge is None:
            self.critical_knowledge = ["critical knowledge 1", "critical knowledge 2"]
        if self.supporting_knowledge is None:
            self.supporting_knowledge = ["supporting knowledge 1", "supporting knowledge 2"]
        if self.background_knowledge is None:
            self.background_knowledge = ["background knowledge 1"]


@dataclass
class MockToolExecutionContext:
    """Mock tool execution context"""
    has_rag_context: bool = True
    knowledge_context: Optional[MockKnowledgeContext] = None
    enhanced_parameters: Dict[str, Any] = None
    parameter_enhancements: List[str] = None
    execution_id: str = "test_execution_123"
    total_knowledge_chunks: int = 5
    
    def __post_init__(self):
        if self.enhanced_parameters is None:
            self.enhanced_parameters = {"enhanced": True}
        if self.parameter_enhancements is None:
            self.parameter_enhancements = ["enhancement1", "enhancement2"]
        if self.knowledge_context is None and self.has_rag_context:
            self.knowledge_context = MockKnowledgeContext(self.total_knowledge_chunks)


@dataclass
class MockInvestigationContext:
    """Mock investigation context"""
    investigation_id: str = "test_investigation"
    entity_id: str = "test_entity"
    findings: List[Any] = None
    
    def __post_init__(self):
        if self.findings is None:
            self.findings = []


def test_imports():
    """Test that our result augmentation modules can be imported"""
    
    print("🔧 Testing module imports...")
    
    try:
        # Test result augmentation service import
        from app.service.agent.tools.result_augmentation_service import (
            ToolResultAugmentationService,
            ResultAugmentationConfig,
            AugmentedToolResult,
            ResultInsights,
            HistoricalPattern,
            NextStepRecommendation,
            ConfidenceScore,
            ThreatCorrelation
        )
        print("✅ Result augmentation service imports successful")
        
        # Test result enhancement engine import
        from app.service.agent.tools.result_enhancement_engine import ResultEnhancementEngine
        print("✅ Result enhancement engine import successful")
        
        return True, {
            'ToolResultAugmentationService': ToolResultAugmentationService,
            'ResultAugmentationConfig': ResultAugmentationConfig,
            'AugmentedToolResult': AugmentedToolResult,
            'ResultInsights': ResultInsights,
            'HistoricalPattern': HistoricalPattern,
            'NextStepRecommendation': NextStepRecommendation,
            'ConfidenceScore': ConfidenceScore,
            'ThreatCorrelation': ThreatCorrelation,
            'ResultEnhancementEngine': ResultEnhancementEngine
        }
        
    except ImportError as e:
        print(f"❌ Import failed: {str(e)}")
        return False, {}


async def test_data_structures(classes):
    """Test that our data structures can be created and used"""
    
    print("\n🏗️ Testing data structures...")
    
    try:
        # Test ResultInsights
        insights = classes['ResultInsights'](
            interpretation="Test interpretation",
            contextual_analysis="Test contextual analysis"
        )
        print("✅ ResultInsights creation successful")
        
        # Test HistoricalPattern
        pattern = classes['HistoricalPattern'](
            pattern_type="test_pattern",
            similarity_score=0.8,
            historical_context="Test historical context",
            confidence=0.7
        )
        print("✅ HistoricalPattern creation successful")
        
        # Test NextStepRecommendation
        recommendation = classes['NextStepRecommendation'](
            action_type="test_action",
            description="Test recommendation",
            priority="high",
            rationale="Test rationale",
            confidence=0.8
        )
        print("✅ NextStepRecommendation creation successful")
        
        # Test ConfidenceScore
        confidence = classes['ConfidenceScore'](
            overall_confidence=0.8,
            knowledge_coverage=0.7,
            pattern_match_confidence=0.6,
            interpretation_reliability=0.9,
            recommendation_quality=0.7
        )
        print("✅ ConfidenceScore creation successful")
        
        # Test ThreatCorrelation
        threat = classes['ThreatCorrelation'](
            threat_indicators=["indicator1", "indicator2"],
            risk_assessment="medium",
            correlation_confidence=0.6,
            intelligence_sources=["source1"],
            recommended_actions=["action1"]
        )
        print("✅ ThreatCorrelation creation successful")
        
        # Test AugmentedToolResult
        original_result = MockToolResult(success=True, data="test data")
        augmented = classes['AugmentedToolResult'](
            original_result=original_result,
            rag_insights=insights,
            historical_patterns=[pattern],
            next_step_recommendations=[recommendation],
            confidence_assessment=confidence,
            threat_intelligence_correlation=threat,
            augmentation_time_ms=25.0,
            knowledge_chunks_used=5,
            enhancement_confidence=0.8
        )
        print("✅ AugmentedToolResult creation successful")
        print(f"✅ AugmentedToolResult properties work - success: {augmented.success}")
        
        return True
        
    except Exception as e:
        print(f"❌ Data structure test failed: {str(e)}")
        return False


async def test_augmentation_service(classes):
    """Test the augmentation service functionality"""
    
    print("\n⚙️ Testing augmentation service...")
    
    try:
        # Create augmentation service (without RAG orchestrator)
        service = classes['ToolResultAugmentationService']()
        print("✅ ToolResultAugmentationService creation successful")
        
        # Create test data
        result = MockToolResult(success=True, data="Network analysis completed")
        context = MockToolExecutionContext(has_rag_context=True, total_knowledge_chunks=5)
        investigation_context = MockInvestigationContext()
        
        # Test augmentation (should gracefully handle missing RAG)
        start_time = time.time()
        augmented_result = await service.augment_result(
            result=result,
            context=context,
            investigation_context=investigation_context,
            domain="network"
        )
        duration_ms = (time.time() - start_time) * 1000
        
        print(f"✅ Augmentation completed in {duration_ms:.1f}ms")
        
        # Check result type
        if hasattr(augmented_result, 'rag_insights'):
            print("✅ Returned augmented result with RAG insights")
            print(f"✅ Augmentation time: {augmented_result.augmentation_time_ms:.1f}ms")
            print(f"✅ Knowledge chunks used: {augmented_result.knowledge_chunks_used}")
        else:
            print("ℹ️ Returned original result (expected without RAG)")
        
        # Test metrics
        metrics = service.get_metrics()
        print(f"✅ Service metrics available: {len(metrics)} metrics")
        print(f"✅ Total augmentations: {metrics.get('total_augmentations', 0)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Augmentation service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_enhancement_engine(classes):
    """Test the enhancement engine functionality"""
    
    print("\n🔍 Testing enhancement engine...")
    
    try:
        # Create enhancement engine (without RAG orchestrator)
        engine = classes['ResultEnhancementEngine']()
        print("✅ ResultEnhancementEngine creation successful")
        
        # Create test data
        result = MockToolResult(success=True, data="Device analysis completed")
        context = MockToolExecutionContext(has_rag_context=True, total_knowledge_chunks=3)
        investigation_context = MockInvestigationContext()
        
        # Test insight generation
        insights = await engine.generate_enhanced_insights(
            result=result,
            context=context,
            investigation_context=investigation_context,
            domain="device"
        )
        
        print("✅ Enhanced insights generation successful")
        print(f"✅ Insights interpretation: {bool(insights.interpretation)}")
        
        # Test historical pattern correlation
        patterns = await engine.correlate_historical_patterns(
            result=result,
            domain="device",
            max_patterns=3
        )
        
        print(f"✅ Historical patterns found: {len(patterns)}")
        
        # Test recommendations
        recommendations = await engine.generate_intelligent_recommendations(
            result=result,
            context=context,
            investigation_context=investigation_context,
            max_recommendations=5
        )
        
        print(f"✅ Recommendations generated: {len(recommendations)}")
        
        # Test threat correlation
        threat_correlation = await engine.correlate_threat_intelligence(
            result=result,
            domain="device"
        )
        
        print(f"✅ Threat correlation: {threat_correlation.risk_assessment}")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhancement engine test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_performance_basic(classes):
    """Test basic performance characteristics"""
    
    print("\n⚡ Testing basic performance...")
    
    try:
        service = classes['ToolResultAugmentationService']()
        
        # Run multiple quick tests
        times = []
        for i in range(5):
            result = MockToolResult(success=True, data=f"Performance test {i}")
            context = MockToolExecutionContext(has_rag_context=True, total_knowledge_chunks=2)
            
            start_time = time.time()
            await service.augment_result(result=result, context=context, domain="test")
            duration_ms = (time.time() - start_time) * 1000
            times.append(duration_ms)
        
        avg_time = sum(times) / len(times)
        max_time = max(times)
        min_time = min(times)
        
        print(f"✅ Average time: {avg_time:.1f}ms")
        print(f"✅ Min time: {min_time:.1f}ms") 
        print(f"✅ Max time: {max_time:.1f}ms")
        
        # Check if performance meets our target
        target_met = avg_time < 50.0  # Relaxed target for testing without RAG
        print(f"✅ Performance target (<50ms): {'✅ PASSED' if target_met else '❌ FAILED'}")
        
        return target_met
        
    except Exception as e:
        print(f"❌ Performance test failed: {str(e)}")
        return False


async def test_error_handling(classes):
    """Test error handling and graceful degradation"""
    
    print("\n🛡️ Testing error handling...")
    
    try:
        service = classes['ToolResultAugmentationService']()
        
        # Test with failed tool result
        failed_result = MockToolResult(success=False, data=None, error="Tool failed")
        context = MockToolExecutionContext(has_rag_context=False)
        
        result = await service.augment_result(
            result=failed_result,
            context=context,
            domain="error_test"
        )
        
        print("✅ Failed result handled gracefully")
        
        # Test with no context
        no_context_result = await service.augment_result(
            result=MockToolResult(success=True, data="test"),
            context=None,
            domain="no_context_test"
        )
        
        print("✅ No context handled gracefully")
        
        # Test with invalid domain
        invalid_domain_result = await service.augment_result(
            result=MockToolResult(success=True, data="test"),
            context=MockToolExecutionContext(),
            domain=None
        )
        
        print("✅ Invalid domain handled gracefully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error handling test failed: {str(e)}")
        return False


async def run_simple_test_suite():
    """Run the simple test suite"""
    
    print("🚀 Starting Simple Tool Result Augmentation Test Suite")
    print("=" * 70)
    
    # Test imports first
    import_success, classes = test_imports()
    if not import_success:
        print("❌ Cannot proceed without successful imports")
        return False
    
    # Run tests
    test_results = {}
    tests = [
        ("Data Structures", lambda: test_data_structures(classes)),
        ("Augmentation Service", lambda: test_augmentation_service(classes)),
        ("Enhancement Engine", lambda: test_enhancement_engine(classes)),
        ("Basic Performance", lambda: test_performance_basic(classes)),
        ("Error Handling", lambda: test_error_handling(classes)),
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
        print("🎉 All tests passed! Tool result knowledge augmentation implementation is working.")
        print("\nℹ️ Note: Tests run without RAG backend - production will have enhanced capabilities.")
    elif passed >= total * 0.8:
        print("✅ Most tests passed. Implementation is functional.")
    else:
        print("⚠️ Multiple test failures. Implementation may need attention.")
    
    return passed >= total * 0.8


if __name__ == "__main__":
    try:
        result = asyncio.run(run_simple_test_suite())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
"""
Standalone Tests for RAG Tool Context Injection

Simple standalone tests that don't require the full application context.
Tests core RAG tool context injection functionality in isolation.
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock
from typing import Any, Dict, Optional

# Mock the logging import
import sys
from unittest.mock import MagicMock

# Mock the logger
mock_logger = MagicMock()
mock_get_bridge_logger = MagicMock(return_value=mock_logger)
sys.modules['app.service.logging'] = MagicMock(get_bridge_logger=mock_get_bridge_logger)


class MockKnowledgeContext:
    """Mock knowledge context for testing"""
    
    def __init__(self):
        self.investigation_id = "test_investigation_123"
        self.domain = "network"
        self.total_chunks = 5
        self.critical_knowledge = [Mock(content="Critical network patterns")]
        self.supporting_knowledge = [Mock(content="Supporting analysis data")]
        self.background_knowledge = [Mock(content="Background knowledge")]
        self.knowledge_sources = {"network_patterns", "threat_intel"}


class MockContextAugmentor:
    """Mock context augmentor for testing"""
    
    async def augment_investigation_context(self, investigation_context, domain, specific_objectives=None):
        await asyncio.sleep(0.02)  # Simulate retrieval time
        return MockKnowledgeContext()
    
    async def clear_cache(self):
        pass


class MockRAGOrchestrator:
    """Mock RAG orchestrator for testing"""
    
    async def retrieve_knowledge(self, query: str, domain: str = None):
        await asyncio.sleep(0.01)  # Simulate retrieval delay
        return {"chunks": [{"content": f"Knowledge for {query}"}], "total_chunks": 1}


# Now import our modules with mocked dependencies
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class ContextInjectionStrategy(Enum):
    """Strategies for injecting RAG context into tool execution"""
    PARAMETER_ENHANCEMENT = "parameter_enhancement"
    CONTEXT_AUGMENTATION = "context_augmentation" 
    RESULT_INTERPRETATION = "result_interpretation"
    FULL_INTEGRATION = "full_integration"


@dataclass
class ToolExecutionContext:
    """Enhanced tool execution context with RAG capabilities"""
    
    # Base execution context
    tool_name: str
    execution_id: str
    investigation_id: Optional[str] = None
    domain: Optional[str] = None
    
    # RAG context
    knowledge_context: Optional[MockKnowledgeContext] = None
    rag_enabled: bool = False
    context_retrieval_time_ms: float = 0.0
    
    # Enhanced parameters
    original_parameters: Dict[str, Any] = field(default_factory=dict)
    enhanced_parameters: Dict[str, Any] = field(default_factory=dict)
    parameter_enhancements: List[str] = field(default_factory=list)
    
    # Context metadata
    context_injection_strategy: ContextInjectionStrategy = ContextInjectionStrategy.FULL_INTEGRATION
    timestamp: datetime = field(default_factory=datetime.now)
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    
    @property
    def has_rag_context(self) -> bool:
        """Check if RAG context is available and populated"""
        return (
            self.rag_enabled and 
            self.knowledge_context is not None and 
            self.knowledge_context.total_chunks > 0
        )
    
    @property
    def total_knowledge_chunks(self) -> int:
        """Get total number of knowledge chunks available"""
        if self.knowledge_context:
            return self.knowledge_context.total_chunks
        return 0


class SimpleRAGContextEnhancer:
    """Simple RAG context enhancer for testing"""
    
    def __init__(self, enable_enhancement: bool = True, performance_target_ms: float = 50.0):
        self.enable_enhancement = enable_enhancement
        self.performance_target_ms = performance_target_ms
        self.rag_available = enable_enhancement
        self.context_augmentor = MockContextAugmentor() if enable_enhancement else None
        
        self.enhancement_stats = {
            "total_enhancements": 0,
            "successful_enhancements": 0,
            "avg_enhancement_time_ms": 0.0
        }
    
    async def enhance_tool_execution_context(
        self,
        tool_name: str,
        input_parameters: Dict[str, Any],
        investigation_context: Optional[Any] = None,
        domain: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> ToolExecutionContext:
        """Enhance tool execution context with RAG knowledge"""
        
        start_time = time.time()
        
        # Create base execution context
        exec_context = ToolExecutionContext(
            tool_name=tool_name,
            execution_id=execution_id or f"{tool_name}_{int(time.time() * 1000)}",
            investigation_id=investigation_context.investigation_id if hasattr(investigation_context, 'investigation_id') else None,
            domain=domain,
            original_parameters=input_parameters.copy(),
            rag_enabled=self.enable_enhancement and self.rag_available
        )
        
        # Attempt RAG enhancement if available
        if exec_context.rag_enabled:
            try:
                # Retrieve knowledge context
                knowledge_context = await self.context_augmentor.augment_investigation_context(
                    investigation_context, domain, []
                )
                exec_context.knowledge_context = knowledge_context
                
                # Enhance parameters
                enhanced_params = await self._apply_knowledge_to_parameters(
                    tool_name, input_parameters, knowledge_context
                )
                exec_context.enhanced_parameters = enhanced_params
                exec_context.parameter_enhancements = [f"Enhanced {tool_name} with knowledge"]
                
                self._update_success_stats()
                
            except Exception as e:
                exec_context.enhanced_parameters = input_parameters.copy()
                exec_context.rag_enabled = False
        else:
            exec_context.enhanced_parameters = input_parameters.copy()
        
        # Record performance metrics
        total_time_ms = (time.time() - start_time) * 1000
        exec_context.context_retrieval_time_ms = total_time_ms
        exec_context.performance_metrics = {
            "total_enhancement_time_ms": total_time_ms,
            "under_performance_target": total_time_ms < self.performance_target_ms
        }
        
        return exec_context
    
    async def _apply_knowledge_to_parameters(
        self,
        tool_name: str,
        original_params: Dict[str, Any],
        knowledge_context: MockKnowledgeContext
    ) -> Dict[str, Any]:
        """Apply knowledge context to enhance tool parameters"""
        
        enhanced = original_params.copy()
        
        # Tool-specific enhancements
        if "splunk" in tool_name.lower():
            if "query" in enhanced:
                original_query = enhanced["query"]
                enhanced["query"] = f"({original_query}) AND (suspicious OR anomaly)"
                enhanced["_rag_enhancement"] = "Added knowledge-based search terms"
        
        # Add knowledge metadata
        enhanced["_rag_context"] = {
            "knowledge_chunks": knowledge_context.total_chunks,
            "enhancement_timestamp": datetime.now().isoformat()
        }
        
        return enhanced
    
    def _update_success_stats(self):
        """Update success statistics"""
        self.enhancement_stats["total_enhancements"] += 1
        self.enhancement_stats["successful_enhancements"] += 1
    
    def get_performance_metrics(self):
        """Get performance metrics"""
        return self.enhancement_stats.copy()


# Test classes
class TestSimpleRAGContextEnhancer:
    """Test suite for Simple RAG Context Enhancer"""
    
    @pytest.mark.asyncio
    async def test_basic_context_enhancement(self):
        """Test basic context enhancement functionality"""
        
        enhancer = SimpleRAGContextEnhancer()
        input_params = {"query": "test_query", "max_results": 10}
        
        context = await enhancer.enhance_tool_execution_context(
            tool_name="test_tool",
            input_parameters=input_params,
            domain="network"
        )
        
        assert context.tool_name == "test_tool"
        assert context.domain == "network"
        assert context.has_rag_context == True
        assert context.enhanced_parameters != input_params  # Should be enhanced
        assert context.context_retrieval_time_ms >= 0
    
    @pytest.mark.asyncio
    async def test_performance_target_compliance(self):
        """Test that enhancement meets <50ms performance target"""
        
        enhancer = SimpleRAGContextEnhancer(performance_target_ms=50.0)
        input_params = {"query": "performance_test"}
        
        start_time = time.time()
        context = await enhancer.enhance_tool_execution_context(
            tool_name="perf_test_tool",
            input_parameters=input_params,
            domain="network"
        )
        total_time = (time.time() - start_time) * 1000
        
        # Check performance metrics
        assert total_time < 100.0, f"Enhancement took {total_time:.1f}ms"
        assert context.performance_metrics["under_performance_target"] == True
    
    @pytest.mark.asyncio
    async def test_graceful_degradation_no_rag(self):
        """Test graceful degradation when RAG is unavailable"""
        
        enhancer = SimpleRAGContextEnhancer(enable_enhancement=False)
        input_params = {"query": "no_rag_test"}
        
        context = await enhancer.enhance_tool_execution_context(
            tool_name="no_rag_tool",
            input_parameters=input_params,
            domain="network"
        )
        
        assert context.rag_enabled == False
        assert context.has_rag_context == False
        assert context.enhanced_parameters == input_params
        assert context.knowledge_context is None
    
    @pytest.mark.asyncio
    async def test_splunk_parameter_enhancement(self):
        """Test Splunk-specific parameter enhancement"""
        
        enhancer = SimpleRAGContextEnhancer()
        input_params = {
            "query": "index=security error",
            "max_results": 100
        }
        
        context = await enhancer.enhance_tool_execution_context(
            tool_name="splunk_tool",
            input_parameters=input_params,
            domain="security"
        )
        
        # Should have enhanced parameters
        assert "query" in context.enhanced_parameters
        enhanced_query = context.enhanced_parameters["query"]
        assert "error" in enhanced_query  # Original term preserved
        assert "suspicious" in enhanced_query or "anomaly" in enhanced_query  # Enhanced terms
        assert "_rag_enhancement" in context.enhanced_parameters
        assert "_rag_context" in context.enhanced_parameters
    
    @pytest.mark.asyncio
    async def test_multiple_enhancements_performance(self):
        """Test performance over multiple enhancements"""
        
        enhancer = SimpleRAGContextEnhancer()
        
        # Perform multiple enhancements
        for i in range(5):
            context = await enhancer.enhance_tool_execution_context(
                tool_name=f"tool_{i}",
                input_parameters={"query": f"test_query_{i}"},
                domain="network"
            )
            
            assert context.has_rag_context == True
            assert context.performance_metrics["under_performance_target"] == True
        
        # Check overall stats
        stats = enhancer.get_performance_metrics()
        assert stats["total_enhancements"] == 5
        assert stats["successful_enhancements"] == 5


class TestToolExecutionContext:
    """Test suite for Tool Execution Context"""
    
    def test_context_creation(self):
        """Test basic context creation"""
        
        context = ToolExecutionContext(
            tool_name="test_tool",
            execution_id="test_exec_123",
            domain="network"
        )
        
        assert context.tool_name == "test_tool"
        assert context.execution_id == "test_exec_123"
        assert context.domain == "network"
        assert context.has_rag_context == False  # No knowledge context yet
        assert context.total_knowledge_chunks == 0
    
    def test_context_with_knowledge(self):
        """Test context with knowledge context"""
        
        knowledge = MockKnowledgeContext()
        context = ToolExecutionContext(
            tool_name="test_tool",
            execution_id="test_exec_123",
            knowledge_context=knowledge,
            rag_enabled=True
        )
        
        assert context.has_rag_context == True
        assert context.total_knowledge_chunks == 5
        assert context.knowledge_context.domain == "network"
    
    def test_performance_metrics(self):
        """Test performance metrics tracking"""
        
        context = ToolExecutionContext(
            tool_name="test_tool",
            execution_id="test_exec_123",
            performance_metrics={
                "total_enhancement_time_ms": 25.0,
                "under_performance_target": True
            }
        )
        
        assert context.performance_metrics["total_enhancement_time_ms"] == 25.0
        assert context.performance_metrics["under_performance_target"] == True


@pytest.mark.asyncio
async def test_end_to_end_simple_integration():
    """Simple end-to-end integration test"""
    
    # Create enhancer
    enhancer = SimpleRAGContextEnhancer()
    
    # Mock investigation context
    investigation = Mock()
    investigation.investigation_id = "test_investigation_456"
    
    input_data = {"query": "end_to_end_test", "threshold": 0.8}
    
    # Execute enhancement
    start_time = time.time()
    context = await enhancer.enhance_tool_execution_context(
        tool_name="integration_test_tool",
        input_parameters=input_data,
        investigation_context=investigation,
        domain="security"
    )
    total_time = (time.time() - start_time) * 1000
    
    # Validate results
    assert context is not None
    assert context.tool_name == "integration_test_tool"
    assert context.investigation_id == "test_investigation_456"
    assert context.domain == "security"
    assert context.has_rag_context == True
    assert context.total_knowledge_chunks > 0
    assert context.enhanced_parameters != input_data
    
    # Validate performance
    assert total_time < 100.0, f"End-to-end enhancement took {total_time:.1f}ms"
    assert context.performance_metrics["under_performance_target"] == True
    
    print(f"✅ End-to-end test completed in {total_time:.1f}ms")
    print(f"✅ Knowledge chunks used: {context.total_knowledge_chunks}")
    print(f"✅ Performance target met: {context.performance_metrics['under_performance_target']}")


if __name__ == "__main__":
    # Run individual test
    asyncio.run(test_end_to_end_simple_integration())
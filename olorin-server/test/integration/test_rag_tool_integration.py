"""
Integration Tests for RAG Tool Context Injection

Tests the complete RAG context injection system for tool execution
with performance monitoring and validation.
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch
from typing import Any, Dict, Optional

from app.service.agent.tools.rag_tool_context import (
    ToolExecutionContextEnhancer,
    ToolExecutionContext,
    ContextInjectionStrategy
)
from app.service.agent.tools.rag_enhanced_tool_base import RAGEnhancedToolBase
from app.service.agent.tools.enhanced_tool_base import ToolConfig, ToolResult, ValidationLevel
from app.service.agent.tools.rag_performance_monitor import RAGToolPerformanceMonitor
from app.service.agent.tools.rag_tool_integration import (
    AgentRAGToolOrchestrator,
    RAGToolFactory
)
from app.service.agent.autonomous_context import AutonomousInvestigationContext, EntityType


class MockRAGOrchestrator:
    """Mock RAG orchestrator for testing"""
    
    async def retrieve_knowledge(self, query: str, domain: str = None, max_chunks: int = 10):
        return {
            "chunks": [
                {"content": f"Mock knowledge for {query}", "score": 0.9},
                {"content": f"Additional context for {domain}", "score": 0.8}
            ],
            "total_chunks": 2
        }


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
        return MockKnowledgeContext()
    
    async def clear_cache(self):
        pass


class TestToolForRAG(RAGEnhancedToolBase):
    """Test tool for RAG enhancement testing"""
    
    def __init__(self, config: ToolConfig):
        super().__init__(config)
    
    async def _execute_impl(self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Any:
        # Simulate tool execution
        await asyncio.sleep(0.01)  # 10ms execution time
        
        # Return different results based on input
        if input_data.get("fail"):
            raise Exception("Simulated tool failure")
        
        result = {
            "status": "success",
            "data": input_data.get("query", "default_query"),
            "enhanced_params": input_data,
            "context_info": context.get("rag_enhanced", False) if context else False
        }
        
        return result


@pytest.fixture
async def mock_investigation_context():
    """Create mock investigation context"""
    return AutonomousInvestigationContext(
        investigation_id="test_investigation_123",
        entity_id="test_entity_456",
        entity_type=EntityType.USER,
        entity_data={"username": "test_user", "account_id": "12345"},
        investigation_data={"reason": "suspicious_activity"}
    )


@pytest.fixture 
async def test_tool():
    """Create test tool instance"""
    config = ToolConfig(
        name="test_rag_tool",
        version="1.0.0",
        timeout_seconds=30,
        validation_level=ValidationLevel.BASIC
    )
    
    return TestToolForRAG(config)


@pytest.fixture
async def context_enhancer():
    """Create tool execution context enhancer with mocks"""
    with patch('app.service.agent.tools.rag_tool_context.get_rag_orchestrator') as mock_rag, \
         patch('app.service.agent.tools.rag_tool_context.create_context_augmentor') as mock_augmentor:
        
        mock_rag.return_value = MockRAGOrchestrator()
        mock_augmentor.return_value = MockContextAugmentor()
        
        enhancer = ToolExecutionContextEnhancer()
        return enhancer


class TestToolExecutionContextEnhancer:
    """Test suite for ToolExecutionContextEnhancer"""
    
    @pytest.mark.asyncio
    async def test_context_enhancement_basic(self, context_enhancer, mock_investigation_context):
        """Test basic context enhancement functionality"""
        
        input_params = {"query": "test_query", "max_results": 10}
        
        context = await context_enhancer.enhance_tool_execution_context(
            tool_name="test_tool",
            input_parameters=input_params,
            investigation_context=mock_investigation_context,
            domain="network"
        )
        
        assert context.tool_name == "test_tool"
        assert context.investigation_id == "test_investigation_123"
        assert context.domain == "network"
        assert context.has_rag_context == True
        assert context.enhanced_parameters == input_params  # Should be enhanced
        assert context.context_retrieval_time_ms >= 0
    
    @pytest.mark.asyncio
    async def test_performance_target_compliance(self, context_enhancer, mock_investigation_context):
        """Test that enhancement meets <50ms performance target"""
        
        input_params = {"query": "performance_test"}
        
        start_time = time.time()
        context = await context_enhancer.enhance_tool_execution_context(
            tool_name="perf_test_tool",
            input_parameters=input_params,
            investigation_context=mock_investigation_context,
            domain="network"
        )
        total_time = (time.time() - start_time) * 1000
        
        # Check performance metrics
        assert total_time < 50.0, f"Enhancement took {total_time:.1f}ms, exceeding 50ms target"
        assert context.performance_metrics["under_performance_target"] == True
        assert context.performance_metrics["total_enhancement_time_ms"] < 50.0
    
    @pytest.mark.asyncio
    async def test_graceful_degradation_no_rag(self):
        """Test graceful degradation when RAG is unavailable"""
        
        # Create enhancer with RAG disabled
        enhancer = ToolExecutionContextEnhancer(enable_enhancement=False)
        
        input_params = {"query": "no_rag_test"}
        
        context = await enhancer.enhance_tool_execution_context(
            tool_name="no_rag_tool",
            input_parameters=input_params,
            investigation_context=None,
            domain="network"
        )
        
        assert context.rag_enabled == False
        assert context.has_rag_context == False
        assert context.enhanced_parameters == input_params
        assert context.knowledge_context is None
    
    @pytest.mark.asyncio
    async def test_parameter_enhancement_splunk(self, context_enhancer, mock_investigation_context):
        """Test Splunk-specific parameter enhancement"""
        
        input_params = {
            "query": "index=security error",
            "max_results": 100
        }
        
        context = await context_enhancer.enhance_tool_execution_context(
            tool_name="splunk",
            input_parameters=input_params,
            investigation_context=mock_investigation_context,
            domain="security"
        )
        
        # Should have enhanced parameters
        assert "query" in context.enhanced_parameters
        # Enhanced query might include additional terms
        enhanced_query = context.enhanced_parameters["query"]
        assert "error" in enhanced_query  # Original term preserved
    
    @pytest.mark.asyncio
    async def test_error_handling(self, mock_investigation_context):
        """Test error handling in context enhancement"""
        
        # Create enhancer with failing RAG components
        with patch('app.service.agent.tools.rag_tool_context.get_rag_orchestrator') as mock_rag:
            mock_rag.side_effect = Exception("RAG unavailable")
            
            enhancer = ToolExecutionContextEnhancer()
            
            input_params = {"query": "error_test"}
            
            # Should not raise exception, should degrade gracefully
            context = await enhancer.enhance_tool_execution_context(
                tool_name="error_test_tool",
                input_parameters=input_params,
                investigation_context=mock_investigation_context,
                domain="network"
            )
            
            assert context.rag_enabled == False
            assert context.enhanced_parameters == input_params


class TestRAGEnhancedToolBase:
    """Test suite for RAG-Enhanced Tool Base"""
    
    @pytest.mark.asyncio
    async def test_rag_enhanced_execution(self, test_tool, mock_investigation_context):
        """Test RAG-enhanced tool execution"""
        
        input_data = {"query": "test_enhanced_execution"}
        context = {
            "investigation_context": mock_investigation_context,
            "domain": "network",
            "agent_id": "test_agent"
        }
        
        with patch.object(test_tool, 'context_enhancer') as mock_enhancer:
            mock_enhancer.rag_available = True
            mock_enhancer.enhance_tool_execution_context = AsyncMock(return_value=ToolExecutionContext(
                tool_name="test_rag_tool",
                execution_id="test_exec_123",
                investigation_id="test_investigation_123",
                domain="network",
                enhanced_parameters=input_data,
                knowledge_context=MockKnowledgeContext(),
                rag_enabled=True,
                context_retrieval_time_ms=25.0
            ))
            
            result = await test_tool.execute(input_data, context)
            
            assert result.success == True
            assert result.metadata.get("rag_enhanced") == True
            assert result.metadata.get("knowledge_chunks_used") == 5
            assert result.metadata.get("performance_target_met") == True
    
    @pytest.mark.asyncio
    async def test_fallback_to_standard_execution(self, test_tool):
        """Test fallback to standard execution when RAG fails"""
        
        input_data = {"query": "fallback_test"}
        context = {"domain": "network"}
        
        # Disable RAG for this test
        test_tool.enable_rag = False
        test_tool.rag_available = False
        
        result = await test_tool.execute(input_data, context)
        
        assert result.success == True
        assert result.metadata.get("rag_enhanced", False) == False
    
    @pytest.mark.asyncio
    async def test_performance_monitoring(self, test_tool):
        """Test performance monitoring capabilities"""
        
        input_data = {"query": "performance_monitoring_test"}
        
        # Execute multiple times to build metrics
        for i in range(5):
            result = await test_tool.execute(input_data, {})
            assert result.success == True
        
        # Check RAG metrics
        rag_metrics = test_tool.get_rag_metrics()
        assert "rag_status" in rag_metrics
        assert "usage_metrics" in rag_metrics
        assert "performance_metrics" in rag_metrics
    
    @pytest.mark.asyncio
    async def test_health_status_with_rag(self, test_tool):
        """Test enhanced health status including RAG capabilities"""
        
        health_status = await test_tool.get_enhanced_health_status()
        
        assert "rag_capabilities" in health_status
        assert "rag_metrics" in health_status
        assert health_status["rag_capabilities"]["enabled"] == test_tool.enable_rag


class TestRAGToolPerformanceMonitor:
    """Test suite for RAG Tool Performance Monitor"""
    
    def test_performance_metric_creation(self):
        """Test performance metric creation and classification"""
        
        monitor = RAGToolPerformanceMonitor()
        
        timing_data = {
            "total_enhancement_ms": 35.0,
            "rag_overhead_ms": 35.0,
            "context_retrieval_ms": 25.0,
            "parameter_enhancement_ms": 5.0,
            "result_interpretation_ms": 5.0
        }
        
        context_data = {
            "knowledge_chunks_used": 8,
            "parameter_enhancements": 2,
            "interpretation_applied": True
        }
        
        metric = monitor.record_execution_performance(
            "test_tool", "exec_123", timing_data, context_data
        )
        
        assert metric.tool_name == "test_tool"
        assert metric.total_enhancement_ms == 35.0
        assert metric.meets_target == True  # <50ms
        assert metric.knowledge_chunks_used == 8
        assert metric.performance_level.value == "good"  # 25-50ms range
    
    def test_performance_target_violation_alert(self):
        """Test alert generation for performance target violations"""
        
        monitor = RAGToolPerformanceMonitor(alert_threshold_violations=3)
        
        # Generate multiple violations
        timing_data = {"total_enhancement_ms": 80.0}  # Over target
        context_data = {"knowledge_chunks_used": 10}
        
        for i in range(5):
            monitor.record_execution_performance(
                "slow_tool", f"exec_{i}", timing_data, context_data
            )
        
        # Check for alerts
        recent_alerts = monitor.get_recent_alerts()
        assert len(recent_alerts) > 0
        
        # Should have consecutive violations alert
        violation_alerts = [a for a in recent_alerts if a.alert_type == "consecutive_target_violations"]
        assert len(violation_alerts) > 0
    
    def test_system_health_calculation(self):
        """Test system health score calculation"""
        
        monitor = RAGToolPerformanceMonitor()
        
        # Generate mix of good and poor performance
        good_timing = {"total_enhancement_ms": 30.0}
        poor_timing = {"total_enhancement_ms": 90.0}
        context_data = {"knowledge_chunks_used": 5}
        
        # 70% good performance
        for i in range(7):
            monitor.record_execution_performance("good_tool", f"good_{i}", good_timing, context_data)
        
        for i in range(3):
            monitor.record_execution_performance("poor_tool", f"poor_{i}", poor_timing, context_data)
        
        summary = monitor.get_system_performance_summary()
        health_score = summary["system_health"]
        
        assert 0.6 <= health_score <= 0.8  # Should reflect 70% compliance with some penalties


class TestAgentRAGToolOrchestrator:
    """Test suite for Agent RAG Tool Orchestrator"""
    
    @pytest.mark.asyncio
    async def test_agent_tool_orchestration(self, test_tool, mock_investigation_context):
        """Test agent-level RAG tool orchestration"""
        
        with patch('app.service.agent.tools.rag_tool_integration.get_tool_context_enhancer') as mock_enhancer:
            mock_enhancer.return_value.rag_available = True
            
            orchestrator = AgentRAGToolOrchestrator()
            orchestrator.set_investigation_context("test_investigation", "network_agent")
            
            input_data = {"query": "orchestration_test"}
            agent_context = {
                "domain": "network",
                "agent_id": "network_agent"
            }
            
            result = await orchestrator.execute_tool_with_rag_context(
                test_tool, input_data, agent_context, mock_investigation_context
            )
            
            assert result is not None
            
            # Check performance metrics
            performance = orchestrator.get_agent_rag_performance()
            assert performance["investigation_id"] == "test_investigation"
            assert performance["agent_id"] == "network_agent"
            assert performance["execution_summary"]["total_tools_executed"] >= 1


class TestRAGToolFactory:
    """Test suite for RAG Tool Factory"""
    
    def test_create_rag_enhanced_tool(self):
        """Test creating RAG-enhanced version of existing tool"""
        
        config = ToolConfig(name="factory_test_tool", version="1.0.0")
        
        rag_tool = RAGToolFactory.create_rag_enhanced_tool(
            TestToolForRAG, config, enable_rag=True
        )
        
        assert isinstance(rag_tool, RAGEnhancedToolBase)
        assert rag_tool.config.name == "factory_test_tool"
        assert rag_tool.enable_rag == True
    
    def test_wrap_existing_tool_with_rag(self):
        """Test wrapping existing tool with RAG capabilities"""
        
        config = ToolConfig(name="wrapped_tool", version="1.0.0")
        original_tool = TestToolForRAG(config)
        
        wrapped_tool = RAGToolFactory.wrap_existing_tool_with_rag(original_tool, enable_rag=True)
        
        assert isinstance(wrapped_tool, RAGEnhancedToolBase)
        assert wrapped_tool.enable_rag == True
        assert wrapped_tool.wrapped_tool == original_tool


@pytest.mark.asyncio
async def test_end_to_end_integration(mock_investigation_context):
    """End-to-end integration test of RAG tool context injection"""
    
    with patch('app.service.agent.tools.rag_tool_context.get_rag_orchestrator') as mock_rag, \
         patch('app.service.agent.tools.rag_tool_context.create_context_augmentor') as mock_augmentor:
        
        mock_rag.return_value = MockRAGOrchestrator()
        mock_augmentor.return_value = MockContextAugmentor()
        
        # Create RAG-enhanced tool
        config = ToolConfig(name="integration_test_tool", version="1.0.0")
        tool = TestToolForRAG(config)
        
        # Create orchestrator
        orchestrator = AgentRAGToolOrchestrator()
        orchestrator.set_investigation_context("integration_test", "test_agent")
        
        input_data = {"query": "end_to_end_test"}
        agent_context = {
            "domain": "network",
            "agent_id": "test_agent"
        }
        
        # Execute tool with RAG context
        start_time = time.time()
        result = await orchestrator.execute_tool_with_rag_context(
            tool, input_data, agent_context, mock_investigation_context
        )
        total_time = (time.time() - start_time) * 1000
        
        # Validate results
        assert result is not None
        assert result.success == True
        
        # Validate performance
        assert total_time < 100.0, f"End-to-end execution took {total_time:.1f}ms"
        
        # Check agent performance metrics
        performance = orchestrator.get_agent_rag_performance()
        assert performance["execution_summary"]["total_tools_executed"] >= 1
        assert performance["rag_performance"]["avg_rag_overhead_ms"] >= 0.0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
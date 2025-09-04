"""
Unit tests for RAG-Enhanced Investigation Agent
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

from app.service.agent.rag_enhanced_agent import (
    RAGEnhancedInvestigationAgent,
    create_rag_enhanced_agent
)
from app.service.agent.rag import (
    RAGOrchestrator,
    ContextAugmentor,
    KnowledgeContext,
    ContextAugmentationConfig
)
from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    DomainFindings,
    EntityType
)
from langchain_core.runnables.config import RunnableConfig


# Global test fixtures available to all test classes
@pytest.fixture
def mock_tools():
    """Create mock tools"""
    tools = []
    for i in range(3):
        tool = Mock()
        tool.name = f"tool_{i}"
        tools.append(tool)
    return tools

@pytest.fixture
def mock_rag_orchestrator():
    """Create mock RAG orchestrator"""
    orchestrator = Mock(spec=RAGOrchestrator)
    orchestrator.knowledge_base = Mock()
    return orchestrator

@pytest.fixture
def mock_context_augmentor():
    """Create mock context augmentor"""
    augmentor = Mock(spec=ContextAugmentor)
    return augmentor

@pytest.fixture
def mock_investigation_context():
    """Create mock investigation context"""
    context = Mock(spec=AutonomousInvestigationContext)
    context.investigation_id = "test-investigation-123"
    context.entity_id = "test-entity-456"
    context.entity_type = EntityType.USER_ID
    context.generate_llm_context = Mock(return_value={"entity": "test"})
    return context

@pytest.fixture
def mock_knowledge_context():
    """Create mock knowledge context"""
    knowledge_ctx = Mock(spec=KnowledgeContext)
    knowledge_ctx.investigation_id = "test-investigation-123"
    knowledge_ctx.domain = "network"
    knowledge_ctx.entity_id = "test-entity-456"
    knowledge_ctx.total_chunks = 5
    knowledge_ctx.critical_knowledge = []
    knowledge_ctx.supporting_knowledge = []
    knowledge_ctx.background_knowledge = []
    knowledge_ctx.knowledge_sources = {"doc-1", "doc-2"}
    return knowledge_ctx


class TestRAGEnhancedInvestigationAgent:
    """Test RAG-enhanced investigation agent"""
    
    def test_init_with_rag_enabled(self, mock_tools, mock_rag_orchestrator):
        """Test initialization with RAG enabled"""
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor') as mock_create:
            mock_augmentor = Mock(spec=ContextAugmentor)
            mock_create.return_value = mock_augmentor
            
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            assert agent.domain == "network"
            assert agent.tools == mock_tools
            assert agent.enable_rag is True
            assert agent.rag_available is True
            assert agent.rag_orchestrator == mock_rag_orchestrator
            assert agent.context_augmentor == mock_augmentor
    
    def test_init_with_rag_disabled(self, mock_tools):
        """Test initialization with RAG disabled"""
        agent = RAGEnhancedInvestigationAgent(
            domain="network",
            tools=mock_tools,
            enable_rag=False
        )
        
        assert agent.domain == "network"
        assert agent.enable_rag is False
        assert agent.rag_available is False
        assert agent.rag_orchestrator is None
        assert agent.context_augmentor is None
    
    def test_init_with_rag_failure(self, mock_tools):
        """Test initialization with RAG initialization failure"""
        with patch('app.service.agent.rag_enhanced_agent.get_rag_orchestrator', side_effect=Exception("RAG failed")):
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                enable_rag=True
            )
            
            assert agent.enable_rag is False
            assert agent.rag_available is False
    
    def test_init_stats_tracking(self, mock_tools, mock_rag_orchestrator):
        """Test statistics initialization"""
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator
            )
            
            expected_keys = [
                "investigations_with_rag",
                "investigations_without_rag", 
                "rag_failures",
                "avg_context_retrieval_time_ms",
                "knowledge_chunks_used"
            ]
            
            for key in expected_keys:
                assert key in agent.rag_stats
                assert agent.rag_stats[key] == 0 or agent.rag_stats[key] == 0.0
    
    @pytest.mark.asyncio
    async def test_autonomous_investigate_rag_enhanced(
        self, 
        mock_tools, 
        mock_rag_orchestrator,
        mock_investigation_context
    ):
        """Test RAG-enhanced autonomous investigation"""
        
        # Setup mocks
        mock_findings = Mock(spec=DomainFindings)
        mock_findings.risk_score = 0.75
        mock_findings.confidence = 0.85
        mock_findings.key_findings = ["Test finding"]
        mock_findings.recommended_actions = []
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            # Mock the RAG-enhanced investigation method
            agent._rag_enhanced_investigation = AsyncMock(return_value=mock_findings)
            
            config = RunnableConfig()
            objectives = ["Test network analysis"]
            
            result = await agent.autonomous_investigate(
                mock_investigation_context,
                config,
                objectives
            )
            
            assert result == mock_findings
            assert agent.rag_stats["investigations_with_rag"] == 1
            agent._rag_enhanced_investigation.assert_called_once_with(
                mock_investigation_context, config, objectives
            )
    
    @pytest.mark.asyncio
    async def test_autonomous_investigate_rag_failure_fallback(
        self,
        mock_tools,
        mock_rag_orchestrator,
        mock_investigation_context
    ):
        """Test fallback to standard investigation when RAG fails"""
        
        mock_findings = Mock(spec=DomainFindings)
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="network", 
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            # Mock RAG method to fail
            agent._rag_enhanced_investigation = AsyncMock(side_effect=Exception("RAG failed"))
            
            # Mock parent class method
            with patch.object(agent.__class__.__bases__[0], 'autonomous_investigate', new_callable=AsyncMock) as mock_parent:
                mock_parent.return_value = mock_findings
                
                config = RunnableConfig()
                
                result = await agent.autonomous_investigate(
                    mock_investigation_context,
                    config,
                    None
                )
                
                assert result == mock_findings
                assert agent.rag_stats["rag_failures"] == 1
                assert agent.rag_stats["investigations_without_rag"] == 1
                mock_parent.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_autonomous_investigate_rag_disabled(
        self,
        mock_tools,
        mock_investigation_context
    ):
        """Test investigation with RAG disabled"""
        
        mock_findings = Mock(spec=DomainFindings)
        
        agent = RAGEnhancedInvestigationAgent(
            domain="network",
            tools=mock_tools,
            enable_rag=False
        )
        
        # Mock parent class method
        with patch.object(agent.__class__.__bases__[0], 'autonomous_investigate', new_callable=AsyncMock) as mock_parent:
            mock_parent.return_value = mock_findings
            
            config = RunnableConfig()
            
            result = await agent.autonomous_investigate(
                mock_investigation_context,
                config,
                None
            )
            
            assert result == mock_findings
            assert agent.rag_stats["investigations_without_rag"] == 1
            mock_parent.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_rag_enhanced_investigation_full_flow(
        self,
        mock_tools,
        mock_rag_orchestrator,
        mock_investigation_context,
        mock_knowledge_context
    ):
        """Test full RAG-enhanced investigation flow"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor') as mock_create:
            mock_augmentor = Mock(spec=ContextAugmentor)
            mock_augmentor.augment_investigation_context = AsyncMock(return_value=mock_knowledge_context)
            mock_create.return_value = mock_augmentor
            
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            # Mock the methods
            agent._create_rag_enhanced_prompt = AsyncMock(return_value="enhanced prompt")
            agent._execute_enhanced_investigation = AsyncMock()
            agent._augment_findings_with_rag_metadata = Mock()
            
            mock_findings = Mock(spec=DomainFindings)
            mock_findings.risk_score = 0.8
            agent._execute_enhanced_investigation.return_value = mock_findings
            agent._augment_findings_with_rag_metadata.return_value = mock_findings
            
            config = RunnableConfig()
            objectives = ["Test objective"]
            
            result = await agent._rag_enhanced_investigation(
                mock_investigation_context,
                config, 
                objectives
            )
            
            # Verify the flow
            mock_augmentor.augment_investigation_context.assert_called_once()
            agent._create_rag_enhanced_prompt.assert_called_once()
            agent._execute_enhanced_investigation.assert_called_once()
            agent._augment_findings_with_rag_metadata.assert_called_once()
            
            assert result == mock_findings
            assert agent.rag_stats["investigations_with_rag"] == 1
    
    @pytest.mark.asyncio
    async def test_create_rag_enhanced_prompt(
        self,
        mock_tools,
        mock_rag_orchestrator,
        mock_investigation_context,
        mock_knowledge_context
    ):
        """Test RAG-enhanced prompt creation"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor') as mock_create:
            mock_augmentor = Mock(spec=ContextAugmentor)
            mock_augmentor.inject_context_into_prompt = AsyncMock(return_value="enhanced prompt with context")
            mock_create.return_value = mock_augmentor
            
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            with patch('app.service.agent.rag_enhanced_agent.create_investigation_prompt') as mock_create_prompt:
                mock_create_prompt.return_value = "base prompt"
                
                result = await agent._create_rag_enhanced_prompt(
                    mock_investigation_context,
                    mock_knowledge_context,
                    ["objective1"]
                )
                
                assert "enhanced prompt with context" in result
                assert "RAG ENHANCEMENT INSTRUCTIONS" in result
                assert "Critical knowledge pieces: 0" in result
                mock_augmentor.inject_context_into_prompt.assert_called_once()
    
    def test_augment_findings_with_rag_metadata(
        self,
        mock_tools,
        mock_rag_orchestrator,
        mock_knowledge_context
    ):
        """Test findings augmentation with RAG metadata"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            findings = Mock(spec=DomainFindings)
            findings.recommended_actions = []
            findings.key_findings = []
            findings.data_quality = "good"
            
            result = agent._augment_findings_with_rag_metadata(findings, mock_knowledge_context)
            
            assert len(result.recommended_actions) > 0
            assert any("enhanced with" in action for action in result.recommended_actions)
            assert len(result.key_findings) > 0
            assert "sources consulted" in result.key_findings[0]
            assert result.data_quality == "excellent"  # Upgraded from "good"
    
    def test_update_rag_stats(self, mock_tools, mock_rag_orchestrator):
        """Test RAG statistics updates"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            # Update stats
            agent._update_rag_stats(150.0, 5)
            
            assert agent.rag_stats["avg_context_retrieval_time_ms"] == 150.0
            assert agent.rag_stats["knowledge_chunks_used"] == 5
            
            # Update again to test running average
            agent.rag_stats["investigations_with_rag"] = 1  # Simulate one investigation
            agent._update_rag_stats(100.0, 3)
            
            assert agent.rag_stats["avg_context_retrieval_time_ms"] == 125.0  # (150 + 100) / 2
            assert agent.rag_stats["knowledge_chunks_used"] == 8  # 5 + 3
    
    def test_get_rag_performance_stats(self, mock_tools, mock_rag_orchestrator):
        """Test RAG performance statistics"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            # Set some test data
            agent.rag_stats.update({
                "investigations_with_rag": 8,
                "investigations_without_rag": 2,
                "knowledge_chunks_used": 40
            })
            
            stats = agent.get_rag_performance_stats()
            
            assert stats["rag_status"]["enabled"] is True
            assert stats["rag_status"]["available"] is True
            assert stats["rag_status"]["domain"] == "network"
            
            assert stats["performance_metrics"]["rag_usage_rate"] == 0.8  # 8/10
            assert stats["performance_metrics"]["avg_chunks_per_investigation"] == 5.0  # 40/8
            assert stats["performance_metrics"]["total_investigations"] == 10
    
    @pytest.mark.asyncio
    async def test_clear_rag_cache(self, mock_tools, mock_rag_orchestrator):
        """Test RAG cache clearing"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor') as mock_create:
            mock_augmentor = Mock(spec=ContextAugmentor)
            mock_augmentor.clear_cache = AsyncMock()
            mock_create.return_value = mock_augmentor
            
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            await agent.clear_rag_cache()
            
            mock_augmentor.clear_cache.assert_called_once()
    
    def test_is_rag_enhanced(self, mock_tools, mock_rag_orchestrator):
        """Test RAG enhancement check"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            # RAG enabled and available
            agent1 = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            assert agent1.is_rag_enhanced() is True
            
            # RAG disabled
            agent2 = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                enable_rag=False
            )
            assert agent2.is_rag_enhanced() is False


class TestRAGEnhancedAgentIntegration:
    """Integration tests for RAG-enhanced agent"""
    
    def test_create_rag_enhanced_agent_factory(self):
        """Test RAG-enhanced agent factory function"""
        mock_orchestrator = Mock(spec=RAGOrchestrator)
        mock_tools = [Mock() for _ in range(2)]
        config = ContextAugmentationConfig(max_critical_chunks=3)
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = create_rag_enhanced_agent(
                domain="device",
                tools=mock_tools,
                rag_orchestrator=mock_orchestrator,
                enable_rag=True,
                rag_config=config
            )
            
            assert isinstance(agent, RAGEnhancedInvestigationAgent)
            assert agent.domain == "device"
            assert agent.tools == mock_tools
            assert agent.rag_orchestrator == mock_orchestrator
            assert agent.enable_rag is True
    
    def test_backward_compatibility_with_base_agent(self):
        """Test backward compatibility with AutonomousInvestigationAgent"""
        mock_tools = [Mock() for _ in range(2)]
        
        agent = RAGEnhancedInvestigationAgent(
            domain="logs",
            tools=mock_tools,
            enable_rag=False
        )
        
        # Should have all base agent attributes and methods
        assert hasattr(agent, 'domain')
        assert hasattr(agent, 'tools')
        assert hasattr(agent, 'tool_map')
        assert hasattr(agent, 'llm_with_tools')
        assert callable(getattr(agent, 'autonomous_investigate'))
    
    @pytest.mark.asyncio
    async def test_enhanced_logging_integration(self, mock_tools, mock_rag_orchestrator):
        """Test integration with enhanced logging"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor'):
            agent = RAGEnhancedInvestigationAgent(
                domain="risk",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            # Test that agent maintains logging compatibility
            assert hasattr(agent, 'domain')
            assert agent.domain == "risk"
            
            # Verify RAG-specific stats are available for logging
            stats = agent.get_rag_performance_stats()
            assert "rag_status" in stats
            assert "usage_statistics" in stats
            assert "performance_metrics" in stats


class TestRAGEnhancedAgentErrorHandling:
    """Test error handling scenarios"""
    
    def test_rag_initialization_graceful_failure(self, mock_tools):
        """Test graceful failure during RAG initialization"""
        
        with patch('app.service.agent.rag_enhanced_agent.get_rag_orchestrator') as mock_get_rag:
            mock_get_rag.side_effect = Exception("RAG initialization failed")
            
            # Should not raise exception, just disable RAG
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                enable_rag=True
            )
            
            assert agent.enable_rag is False
            assert agent.rag_available is False
            assert agent.rag_orchestrator is None
    
    @pytest.mark.asyncio
    async def test_context_augmentor_failure_handling(self, mock_tools, mock_rag_orchestrator):
        """Test handling of context augmentor failures"""
        
        with patch('app.service.agent.rag_enhanced_agent.create_context_augmentor') as mock_create:
            mock_create.side_effect = Exception("Context augmentor failed")
            
            agent = RAGEnhancedInvestigationAgent(
                domain="network",
                tools=mock_tools,
                rag_orchestrator=mock_rag_orchestrator,
                enable_rag=True
            )
            
            assert agent.enable_rag is False
            assert agent.rag_available is False


if __name__ == "__main__":
    pytest.main([__file__])
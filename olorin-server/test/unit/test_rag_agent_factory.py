"""
Unit tests for RAG-Enhanced Agent Factory
"""

import pytest
from unittest.mock import Mock, patch

from app.service.agent.agent_factory import (
    AgentFactory,
    create_rag_agent,
    create_agent,
    get_agent_factory,
    get_rag_enhanced_factory,
    get_standard_factory
)
from app.service.agent.structured_base import StructuredInvestigationAgent
from app.service.agent.rag import ContextAugmentationConfig


class TestEnhancedAgentFactory:
    """Test enhanced agent factory functionality"""
    
    @pytest.fixture
    def mock_tools(self):
        """Create mock tools"""
        tools = []
        for i in range(3):
            tool = Mock()
            tool.name = f"tool_{i}"
            tools.append(tool)
        return tools
    
    @pytest.fixture
    def mock_rag_orchestrator(self):
        """Create mock RAG orchestrator"""
        orchestrator = Mock()
        return orchestrator
    
    def test_factory_init_with_rag_enabled(self):
        """Test factory initialization with RAG enabled"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.get_rag_orchestrator') as mock_get_rag:
                mock_orchestrator = Mock()
                mock_get_rag.return_value = mock_orchestrator
                
                factory = AgentFactory(enable_rag=True)
                
                assert factory.enable_rag is True
                assert factory.stats["rag_enabled"] is True
                assert factory.stats["rag_available"] is True
                assert factory.rag_orchestrator == mock_orchestrator
    
    def test_factory_init_with_rag_disabled(self):
        """Test factory initialization with RAG disabled"""
        factory = AgentFactory(enable_rag=False)
        
        assert factory.enable_rag is False
        assert factory.stats["rag_enabled"] is False
        assert factory.rag_orchestrator is None
    
    def test_factory_init_rag_unavailable(self):
        """Test factory initialization when RAG is unavailable"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', False):
            factory = AgentFactory(enable_rag=True)
            
            assert factory.enable_rag is False
            assert factory.stats["rag_enabled"] is False
            assert factory.stats["rag_available"] is False
    
    def test_factory_init_rag_orchestrator_failure(self):
        """Test factory initialization with RAG orchestrator failure"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.get_rag_orchestrator') as mock_get_rag:
                mock_get_rag.side_effect = Exception("RAG orchestrator failed")
                
                factory = AgentFactory(enable_rag=True)
                
                assert factory.enable_rag is False
                assert factory.stats["rag_enabled"] is False
    
    def test_create_agent_rag_enhanced(self, mock_tools, mock_rag_orchestrator):
        """Test creating RAG-enhanced agent"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.create_rag_enhanced_agent') as mock_create_rag:
                mock_agent = Mock()
                mock_create_rag.return_value = mock_agent
                
                factory = AgentFactory(enable_rag=True)
                factory.rag_orchestrator = mock_rag_orchestrator
                
                agent = factory.create_agent("network", mock_tools, enable_rag=True)
                
                assert agent == mock_agent
                assert factory.stats["agents_created"] == 1
                assert factory.stats["rag_enhanced_agents_created"] == 1
                assert factory.stats["standard_agents_created"] == 0
                
                mock_create_rag.assert_called_once_with(
                    domain="network",
                    tools=mock_tools,
                    rag_orchestrator=mock_rag_orchestrator,
                    enable_rag=True,
                    rag_config=None
                )
    
    def test_create_agent_standard(self, mock_tools):
        """Test creating standard agent"""
        with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create_standard:
            mock_agent = Mock()
            mock_create_standard.return_value = mock_agent
            
            factory = AgentFactory(enable_rag=False)
            
            agent = factory.create_agent("network", mock_tools)
            
            assert agent == mock_agent
            assert factory.stats["agents_created"] == 1
            assert factory.stats["rag_enhanced_agents_created"] == 0
            assert factory.stats["standard_agents_created"] == 1
            
            mock_create_standard.assert_called_once_with("network", mock_tools)
    
    def test_create_agent_fallback_to_standard(self, mock_tools):
        """Test fallback to standard agent when RAG unavailable"""
        with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create_standard:
            mock_agent = Mock()
            mock_create_standard.return_value = mock_agent
            
            factory = AgentFactory(enable_rag=True)
            factory.rag_orchestrator = None  # RAG not available
            
            agent = factory.create_agent("network", mock_tools, enable_rag=True)
            
            assert agent == mock_agent
            assert factory.stats["standard_agents_created"] == 1
    
    def test_create_rag_enhanced_agent_explicit(self, mock_tools, mock_rag_orchestrator):
        """Test explicitly creating RAG-enhanced agent"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.create_rag_enhanced_agent') as mock_create_rag:
                mock_agent = Mock()
                mock_create_rag.return_value = mock_agent
                
                factory = AgentFactory(enable_rag=True)
                factory.rag_orchestrator = mock_rag_orchestrator
                
                config = ContextAugmentationConfig(max_critical_chunks=5)
                agent = factory.create_rag_enhanced_agent("device", mock_tools, config)
                
                assert agent == mock_agent
                assert factory.stats["rag_enhanced_agents_created"] == 1
                
                mock_create_rag.assert_called_once_with(
                    domain="device",
                    tools=mock_tools,
                    rag_orchestrator=mock_rag_orchestrator,
                    enable_rag=True,
                    rag_config=config
                )
    
    def test_create_rag_enhanced_agent_unavailable(self, mock_tools):
        """Test creating RAG-enhanced agent when RAG unavailable"""
        with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create_standard:
            mock_agent = Mock()
            mock_create_standard.return_value = mock_agent
            
            factory = AgentFactory(enable_rag=False)
            
            agent = factory.create_rag_enhanced_agent("device", mock_tools)
            
            assert agent == mock_agent
            assert factory.stats["standard_agents_created"] == 1
    
    def test_create_standard_agent_explicit(self, mock_tools):
        """Test explicitly creating standard agent"""
        with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create_standard:
            mock_agent = Mock()
            mock_create_standard.return_value = mock_agent
            
            factory = AgentFactory()
            
            agent = factory.create_standard_agent("logs", mock_tools)
            
            assert agent == mock_agent
            assert factory.stats["standard_agents_created"] == 1
    
    def test_set_rag_config(self):
        """Test setting RAG configuration"""
        factory = AgentFactory()
        config = ContextAugmentationConfig(max_critical_chunks=8)
        
        factory.set_rag_config(config)
        
        assert factory.rag_config == config
    
    def test_is_rag_available(self, mock_rag_orchestrator):
        """Test RAG availability check"""
        factory1 = AgentFactory(enable_rag=True)
        factory1.rag_orchestrator = mock_rag_orchestrator
        assert factory1.is_rag_available() is True
        
        factory2 = AgentFactory(enable_rag=False)
        assert factory2.is_rag_available() is False
        
        factory3 = AgentFactory(enable_rag=True)
        factory3.rag_orchestrator = None
        assert factory3.is_rag_available() is False
    
    def test_get_factory_stats(self):
        """Test factory statistics"""
        factory = AgentFactory(enable_rag=True)
        
        stats = factory.get_factory_stats()
        
        expected_keys = [
            "agents_created",
            "rag_enhanced_agents_created", 
            "standard_agents_created",
            "domains_supported",
            "ml_ai_tools_enabled",
            "rag_enabled",
            "rag_available"
        ]
        
        for key in expected_keys:
            assert key in stats


class TestFactoryFunctions:
    """Test factory utility functions"""
    
    @pytest.fixture
    def mock_tools(self):
        """Create mock tools"""
        return [Mock() for _ in range(2)]
    
    def test_get_agent_factory_singleton(self):
        """Test singleton pattern for agent factory"""
        factory1 = get_agent_factory()
        factory2 = get_agent_factory()
        
        assert factory1 is factory2
    
    def test_get_rag_enhanced_factory(self):
        """Test getting RAG-enhanced factory"""
        factory = get_rag_enhanced_factory()
        
        assert isinstance(factory, AgentFactory)
        # Should attempt to enable RAG (though may fail if not available)
    
    def test_get_standard_factory(self):
        """Test getting standard factory"""
        factory = get_standard_factory()
        
        assert isinstance(factory, AgentFactory)
        assert factory.enable_rag is False
    
    def test_create_agent_function(self, mock_tools):
        """Test create_agent utility function"""
        with patch('app.service.agent.agent_factory.get_agent_factory') as mock_get_factory:
            mock_factory = Mock()
            mock_agent = Mock()
            mock_factory.create_agent.return_value = mock_agent
            mock_get_factory.return_value = mock_factory
            
            agent = create_agent("network", mock_tools, enable_rag=True)
            
            assert agent == mock_agent
            mock_get_factory.assert_called_once_with(enable_rag=True)
            mock_factory.create_agent.assert_called_once_with("network", mock_tools)
    
    def test_create_rag_agent_function(self, mock_tools):
        """Test create_rag_agent utility function"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.get_rag_enhanced_factory') as mock_get_factory:
                mock_factory = Mock()
                mock_agent = Mock()
                mock_factory.create_rag_enhanced_agent.return_value = mock_agent
                mock_get_factory.return_value = mock_factory
                
                config = ContextAugmentationConfig(max_critical_chunks=3)
                agent = create_rag_agent("device", mock_tools, config)
                
                assert agent == mock_agent
                mock_factory.create_rag_enhanced_agent.assert_called_once_with(
                    "device", mock_tools, config
                )
    
    def test_create_rag_agent_function_unavailable(self, mock_tools):
        """Test create_rag_agent when RAG unavailable"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', False):
            with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create:
                mock_agent = Mock()
                mock_create.return_value = mock_agent
                
                agent = create_rag_agent("device", mock_tools)
                
                assert agent == mock_agent
                mock_create.assert_called_once_with("device", mock_tools)


class TestFactoryIntegration:
    """Integration tests for agent factory"""
    
    @pytest.fixture
    def mock_tools(self):
        """Create mock tools"""
        return [Mock() for _ in range(2)]
    
    def test_factory_domain_support(self):
        """Test factory domain support"""
        factory = AgentFactory()
        
        supported_domains = factory.stats["domains_supported"]
        expected_domains = ["network", "device", "location", "logs", "risk"]
        
        for domain in expected_domains:
            assert domain in supported_domains
    
    def test_factory_ml_ai_tools_enabled(self):
        """Test ML/AI tools support"""
        factory = AgentFactory()
        
        assert factory.stats["ml_ai_tools_enabled"] is True
    
    def test_agent_creation_stats_tracking(self, mock_tools):
        """Test agent creation statistics tracking"""
        with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create:
            mock_create.return_value = Mock()
            
            factory = AgentFactory(enable_rag=False)
            
            # Create several agents
            factory.create_agent("network", mock_tools)
            factory.create_standard_agent("device", mock_tools)
            
            stats = factory.get_factory_stats()
            
            assert stats["agents_created"] == 2
            assert stats["standard_agents_created"] == 2
            assert stats["rag_enhanced_agents_created"] == 0
    
    def test_mixed_agent_creation(self, mock_tools):
        """Test creating both RAG and standard agents"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.get_rag_orchestrator') as mock_get_rag:
                with patch('app.service.agent.agent_factory.create_rag_enhanced_agent') as mock_create_rag:
                    with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create_standard:
                        mock_get_rag.return_value = Mock()
                        mock_create_rag.return_value = Mock()
                        mock_create_standard.return_value = Mock()
                        
                        factory = AgentFactory(enable_rag=True)
                        
                        # Create RAG agent
                        factory.create_agent("network", mock_tools, enable_rag=True)
                        
                        # Create standard agent
                        factory.create_standard_agent("device", mock_tools)
                        
                        stats = factory.get_factory_stats()
                        
                        assert stats["agents_created"] == 2
                        assert stats["rag_enhanced_agents_created"] == 1
                        assert stats["standard_agents_created"] == 1


class TestFactoryErrorHandling:
    """Test factory error handling"""
    
    @pytest.fixture
    def mock_tools(self):
        """Create mock tools"""
        return [Mock() for _ in range(2)]
    
    def test_rag_orchestrator_initialization_failure(self):
        """Test handling RAG orchestrator initialization failure"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.get_rag_orchestrator') as mock_get_rag:
                mock_get_rag.side_effect = Exception("RAG initialization failed")
                
                # Should not raise exception
                factory = AgentFactory(enable_rag=True)
                
                assert factory.enable_rag is False
                assert factory.stats["rag_enabled"] is False
    
    def test_rag_agent_creation_failure_fallback(self, mock_tools):
        """Test fallback when RAG agent creation fails"""
        with patch('app.service.agent.agent_factory.RAG_AVAILABLE', True):
            with patch('app.service.agent.agent_factory.create_rag_enhanced_agent') as mock_create_rag:
                with patch('app.service.agent.agent_factory.create_structured_agent') as mock_create_standard:
                    mock_create_rag.side_effect = Exception("RAG agent creation failed")
                    mock_standard_agent = Mock()
                    mock_create_standard.return_value = mock_standard_agent
                    
                    factory = AgentFactory(enable_rag=True)
                    factory.rag_orchestrator = Mock()  # RAG available
                    
                    # Should fall back to standard agent creation
                    with patch.object(factory, 'create_agent') as mock_create_method:
                        mock_create_method.return_value = mock_standard_agent
                        
                        agent = factory.create_rag_enhanced_agent("network", mock_tools)
                        
                        # Should have fallen back
                        assert agent == mock_standard_agent


if __name__ == "__main__":
    pytest.main([__file__])
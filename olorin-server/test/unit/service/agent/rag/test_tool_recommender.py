"""
Unit tests for Knowledge-Based Tool Recommender

Tests RAG-enhanced tool selection, effectiveness analysis, and integration
with existing tool registry system.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import List

from langchain_core.tools import BaseTool

# Import the classes to test
from app.service.agent.rag.tool_recommender import (
    KnowledgeBasedToolRecommender,
    ToolRecommendation,
    ToolEffectivenessMetrics,
    ToolRecommendationStrategy,
    ToolRecommenderConfig,
    create_tool_recommender
)
from app.service.agent.rag.context_augmentor import (
    KnowledgeContext,
    ContextAugmentationConfig
)
from app.service.agent.rag.knowledge_base import DocumentChunk, DocumentMetadata
from app.service.agent.autonomous_context import AutonomousInvestigationContext, EntityType


class MockTool(BaseTool):
    """Mock tool for testing"""
    
    def __init__(self, name: str, description: str = "Mock tool"):
        self.name = name
        self.description = description
    
    def _run(self, *args, **kwargs):
        return f"Mock result from {self.name}"


@pytest.fixture
def mock_tools() -> List[BaseTool]:
    """Create mock tools for testing"""
    return [
        MockTool("threat_intelligence_scanner", "Scans for threat intelligence data"),
        MockTool("network_analyzer", "Analyzes network traffic patterns"),
        MockTool("risk_scorer", "Calculates risk scores using ML models"),
        MockTool("log_parser", "Parses and analyzes system logs"),
        MockTool("device_fingerprinter", "Generates device fingerprints"),
        MockTool("geo_locator", "Determines geographic location"),
        MockTool("abuse_ip_checker", "Checks IP reputation using AbuseIPDB"),
        MockTool("virus_total_scanner", "Scans files and URLs with VirusTotal")
    ]


@pytest.fixture
def mock_tool_registry():
    """Create mock tool registry"""
    registry = Mock()
    registry.is_initialized.return_value = True
    registry.get_tool_names.return_value = [
        "threat_intelligence_scanner", "network_analyzer", "risk_scorer",
        "log_parser", "device_fingerprinter", "geo_locator",
        "abuse_ip_checker", "virus_total_scanner"
    ]
    
    def mock_get_tool(name):
        tools_dict = {
            "threat_intelligence_scanner": MockTool("threat_intelligence_scanner", "Threat intel tool"),
            "network_analyzer": MockTool("network_analyzer", "Network analysis tool"),
            "risk_scorer": MockTool("risk_scorer", "Risk scoring tool"),
            "log_parser": MockTool("log_parser", "Log parsing tool"),
            "abuse_ip_checker": MockTool("abuse_ip_checker", "IP reputation checker"),
            "virus_total_scanner": MockTool("virus_total_scanner", "File/URL scanner")
        }
        return tools_dict.get(name)
    
    registry.get_tool = mock_get_tool
    registry.get_tools_by_category.return_value = [
        MockTool("threat_intelligence_scanner"),
        MockTool("network_analyzer"),
        MockTool("risk_scorer")
    ]
    
    return registry


@pytest.fixture
def mock_knowledge_context():
    """Create mock knowledge context"""
    critical_chunk = DocumentChunk(
        chunk_id="critical_001",
        document_id="effectiveness_study_2023",
        content="threat_intelligence_scanner achieved 95% success rate in network fraud detection cases with high confidence scores",
        metadata=DocumentMetadata(
            tags={"network", "threat_intelligence", "effectiveness"},
            entity_types={"ip_address", "network_connection"}
        )
    )
    critical_chunk.similarity_score = 0.92
    
    supporting_chunk = DocumentChunk(
        chunk_id="supporting_001", 
        document_id="case_studies_2023",
        content="network_analyzer and abuse_ip_checker combination showed excellent results in similar fraud investigations",
        metadata=DocumentMetadata(
            tags={"network", "case_study"},
            entity_types={"ip_address"}
        )
    )
    supporting_chunk.similarity_score = 0.78
    
    return KnowledgeContext(
        investigation_id="inv_12345",
        domain="network",
        entity_id="192.168.1.100",
        entity_type="ip_address",
        critical_knowledge=[critical_chunk],
        supporting_knowledge=[supporting_chunk],
        background_knowledge=[],
        total_chunks=2,
        knowledge_sources={"effectiveness_study_2023", "case_studies_2023"}
    )


@pytest.fixture
def mock_rag_orchestrator():
    """Create mock RAG orchestrator"""
    orchestrator = Mock()
    orchestrator.knowledge_base = Mock()
    return orchestrator


@pytest.fixture
def mock_context_augmentor(mock_knowledge_context):
    """Create mock context augmentor"""
    augmentor = Mock()
    augmentor.augment_investigation_context = AsyncMock(return_value=mock_knowledge_context)
    return augmentor


@pytest.fixture
def investigation_context():
    """Create investigation context for testing"""
    return AutonomousInvestigationContext(
        investigation_id="inv_12345",
        entity_id="192.168.1.100", 
        entity_type=EntityType.IP_ADDRESS,
        investigation_type="fraud_investigation"
    )


@pytest.fixture
def tool_recommender(mock_rag_orchestrator, mock_tool_registry, mock_context_augmentor):
    """Create tool recommender for testing"""
    return KnowledgeBasedToolRecommender(
        rag_orchestrator=mock_rag_orchestrator,
        tool_registry=mock_tool_registry,
        context_augmentor=mock_context_augmentor,
        config=ToolRecommenderConfig(
            max_recommended_tools=5,
            min_confidence_threshold=0.6
        )
    )


class TestKnowledgeBasedToolRecommender:
    """Test cases for Knowledge-Based Tool Recommender"""
    
    def test_init(self, tool_recommender):
        """Test tool recommender initialization"""
        assert tool_recommender is not None
        assert tool_recommender.config.max_recommended_tools == 5
        assert tool_recommender.config.min_confidence_threshold == 0.6
        assert "tool_effectiveness_patterns" in tool_recommender.tool_knowledge_categories
    
    @pytest.mark.asyncio
    async def test_recommend_tools_effectiveness_strategy(
        self, 
        tool_recommender,
        investigation_context,
        mock_knowledge_context
    ):
        """Test effectiveness-based tool recommendations"""
        # Mock the knowledge retrieval
        tool_recommender._retrieve_tool_knowledge = AsyncMock(return_value=mock_knowledge_context)
        
        recommendations = await tool_recommender.recommend_tools(
            investigation_context=investigation_context,
            domain="network",
            strategy=ToolRecommendationStrategy.EFFECTIVENESS_BASED
        )
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        
        # Check that recommendations have required fields
        for rec in recommendations:
            assert isinstance(rec, ToolRecommendation)
            assert rec.tool is not None
            assert rec.confidence >= 0.0
            assert isinstance(rec.reasoning, str)
    
    @pytest.mark.asyncio
    async def test_recommend_tools_hybrid_strategy(
        self,
        tool_recommender, 
        investigation_context
    ):
        """Test hybrid tool recommendation strategy"""
        recommendations = await tool_recommender.recommend_tools(
            investigation_context=investigation_context,
            domain="network",
            strategy=ToolRecommendationStrategy.HYBRID
        )
        
        assert isinstance(recommendations, list)
        # Should get some recommendations even with mocked data
        
        # Verify statistics are updated
        assert tool_recommender.recommendation_stats["total_recommendations"] > 0
    
    @pytest.mark.asyncio
    async def test_get_enhanced_tool_list(
        self,
        tool_recommender,
        investigation_context
    ):
        """Test enhanced tool list generation"""
        tools = await tool_recommender.get_enhanced_tool_list(
            investigation_context=investigation_context,
            domain="network",
            categories=["threat_intelligence", "network"]
        )
        
        assert isinstance(tools, list)
        assert len(tools) <= tool_recommender.config.max_recommended_tools
        
        # All returned items should be BaseTool instances
        for tool in tools:
            assert isinstance(tool, BaseTool)
    
    @pytest.mark.asyncio
    async def test_fallback_recommendations(
        self,
        tool_recommender
    ):
        """Test fallback to standard tool selection"""
        with patch('app.service.agent.rag.tool_recommender.get_tools_for_agent') as mock_get_tools:
            mock_get_tools.return_value = [MockTool("fallback_tool")]
            
            recommendations = await tool_recommender._fallback_recommendations(
                domain="network",
                categories=["threat_intelligence"]
            )
            
            assert len(recommendations) > 0
            assert recommendations[0].reasoning == "Standard tool selection (RAG enhancement unavailable)"
            assert tool_recommender.recommendation_stats["fallback_recommendations"] > 0
    
    def test_extract_tool_mentions(self, tool_recommender):
        """Test tool mention extraction from text"""
        content = "Using threat_intelligence_scanner and network_analyzer for analysis"
        
        mentioned_tools = tool_recommender._extract_tool_mentions(content)
        
        assert "threat_intelligence_scanner" in mentioned_tools
        assert "network_analyzer" in mentioned_tools
    
    def test_extract_success_indicators(self, tool_recommender):
        """Test success indicator extraction"""
        success_content = "The tool was very successful and effective in detecting fraud"
        failure_content = "The tool failed to provide accurate results and was unreliable"
        
        success_indicators_good = tool_recommender._extract_success_indicators(success_content)
        success_indicators_bad = tool_recommender._extract_success_indicators(failure_content)
        
        assert success_indicators_good["success_rate"] > 0.7
        assert success_indicators_bad["success_rate"] < 0.7
    
    def test_calculate_domain_relevance(self, tool_recommender):
        """Test domain relevance calculation"""
        network_tool = MockTool("network_analyzer", "Analyzes network traffic and connections")
        generic_tool = MockTool("generic_tool", "Generic utility tool")
        
        network_relevance = tool_recommender._calculate_domain_relevance(
            network_tool, 
            "network",
            {"network_analyzer": 0.2}
        )
        
        generic_relevance = tool_recommender._calculate_domain_relevance(
            generic_tool,
            "network", 
            {}
        )
        
        assert network_relevance > generic_relevance
        assert network_relevance > 0.7  # Should be high relevance
    
    def test_determine_tool_category(self, tool_recommender):
        """Test tool category determination"""
        threat_tool = MockTool("threat_scanner", "Scans for threats")
        splunk_tool = MockTool("splunk_query", "Queries Splunk logs")
        api_tool = MockTool("http_request", "Makes HTTP requests")
        
        assert tool_recommender._determine_tool_category(threat_tool) == "threat_intelligence"
        assert tool_recommender._determine_tool_category(splunk_tool) == "olorin"
        assert tool_recommender._determine_tool_category(api_tool) == "api"
    
    def test_get_performance_stats(self, tool_recommender):
        """Test performance statistics retrieval"""
        # Generate some activity
        tool_recommender.recommendation_stats["total_recommendations"] = 10
        tool_recommender.recommendation_stats["knowledge_enhanced_recommendations"] = 7
        tool_recommender.recommendation_stats["fallback_recommendations"] = 3
        
        stats = tool_recommender.get_performance_stats()
        
        assert "knowledge_enhancement_rate" in stats
        assert "fallback_rate" in stats
        assert stats["knowledge_enhancement_rate"] == 0.7
        assert stats["fallback_rate"] == 0.3
        assert stats["knowledge_categories"] == 4  # Number of knowledge categories
    
    @pytest.mark.asyncio
    async def test_clear_cache(self, tool_recommender):
        """Test cache clearing"""
        # Mock context augmentor with cache
        tool_recommender.context_augmentor.clear_cache = AsyncMock()
        
        await tool_recommender.clear_cache()
        
        tool_recommender.context_augmentor.clear_cache.assert_called_once()
    
    def test_get_default_categories(self, tool_recommender):
        """Test default category selection for domains"""
        risk_categories = tool_recommender._get_default_categories("risk")
        network_categories = tool_recommender._get_default_categories("network")
        logs_categories = tool_recommender._get_default_categories("logs")
        
        assert "threat_intelligence" in risk_categories
        assert "ml_ai" in risk_categories
        
        assert "threat_intelligence" in network_categories
        assert "intelligence" in network_categories
        
        assert "database" in logs_categories
        assert "search" in logs_categories


class TestToolRecommenderConfig:
    """Test tool recommender configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ToolRecommenderConfig()
        
        assert config.max_recommended_tools == 12
        assert config.min_confidence_threshold == 0.6
        assert config.effectiveness_weight == 0.4
        assert config.case_similarity_weight == 0.3
        assert config.domain_relevance_weight == 0.3
        assert config.enable_fallback_recommendations is True
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = ToolRecommenderConfig(
            max_recommended_tools=8,
            min_confidence_threshold=0.8,
            effectiveness_weight=0.5
        )
        
        assert config.max_recommended_tools == 8
        assert config.min_confidence_threshold == 0.8
        assert config.effectiveness_weight == 0.5


class TestToolEffectivenessMetrics:
    """Test tool effectiveness metrics"""
    
    def test_metrics_creation(self):
        """Test effectiveness metrics creation"""
        metrics = ToolEffectivenessMetrics(
            tool_name="test_tool",
            success_rate=0.85,
            avg_confidence=0.78,
            usage_frequency=15
        )
        
        assert metrics.tool_name == "test_tool"
        assert metrics.success_rate == 0.85
        assert metrics.avg_confidence == 0.78
        assert metrics.usage_frequency == 15


class TestToolRecommendation:
    """Test tool recommendation data structure"""
    
    def test_recommendation_creation(self):
        """Test recommendation creation"""
        tool = MockTool("test_tool")
        recommendation = ToolRecommendation(
            tool=tool,
            confidence=0.85,
            reasoning="Test reasoning",
            domain_match=True
        )
        
        assert recommendation.tool == tool
        assert recommendation.confidence == 0.85
        assert recommendation.reasoning == "Test reasoning"
        assert recommendation.domain_match is True


def test_create_tool_recommender(mock_rag_orchestrator, mock_tool_registry):
    """Test tool recommender factory function"""
    recommender = create_tool_recommender(
        rag_orchestrator=mock_rag_orchestrator,
        tool_registry=mock_tool_registry
    )
    
    assert isinstance(recommender, KnowledgeBasedToolRecommender)
    assert recommender.rag_orchestrator == mock_rag_orchestrator
    assert recommender.tool_registry == mock_tool_registry


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
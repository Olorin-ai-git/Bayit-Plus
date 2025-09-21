"""
Test Multi-Agent Pattern Implementation

Test the OpenAI Multi-Agent Pattern for coordinated fraud investigations.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.service.agent.patterns.base import PatternConfig, PatternType, OpenAIPatternConfig
from app.service.agent.patterns.openai.multi_agent_pattern import OpenAIMultiAgentPattern
from langchain_core.messages import HumanMessage


class TestOpenAIMultiAgentPattern:
    """Test cases for OpenAI Multi-Agent Pattern"""
    
    @pytest.fixture
    def pattern_config(self):
        """Create test pattern configuration"""
        return PatternConfig(
            pattern_type=PatternType.OPENAI_MULTI_AGENT,
            max_iterations=3,
            timeout_seconds=60
        )
    
    @pytest.fixture  
    def openai_config(self):
        """Create test OpenAI configuration"""
        return OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1,
            stream=False
        )
    
    @pytest.fixture
    def mock_tools(self):
        """Create mock tools for testing"""
        tool1 = MagicMock()
        tool1.name = "splunk_query"
        tool2 = MagicMock()
        tool2.name = "device_analysis"
        return [tool1, tool2]
    
    @pytest.fixture
    def multi_agent_pattern(self, pattern_config, openai_config, mock_tools):
        """Create multi-agent pattern instance"""
        return OpenAIMultiAgentPattern(
            config=pattern_config,
            openai_config=openai_config,
            tools=mock_tools
        )
    
    def test_initialization(self, multi_agent_pattern):
        """Test pattern initialization"""
        assert multi_agent_pattern.pattern_type == PatternType.OPENAI_MULTI_AGENT
        assert multi_agent_pattern._coordinator is None
        assert multi_agent_pattern._handoff_manager is None
        assert multi_agent_pattern._synthesizer is None
        assert len(multi_agent_pattern._function_definitions) == 0  # Mock tools don't convert
    
    @pytest.mark.asyncio
    async def test_coordinator_routing(self, multi_agent_pattern):
        """Test investigation routing logic"""
        # Initialize components
        await multi_agent_pattern._initialize_components()
        
        # Test ATO investigation routing
        context_ato = {
            "investigation_type": "ato",
            "data_types": ["ip", "device_fingerprint", "location_data", "logs"]
        }
        
        agents = await multi_agent_pattern._coordinator.route_investigation(context_ato)
        assert "network" in agents
        assert "device" in agents  
        assert "location" in agents
        assert "logs" in agents
    
    @pytest.mark.asyncio
    async def test_execution_strategy(self, multi_agent_pattern):
        """Test execution strategy determination"""
        await multi_agent_pattern._initialize_components()
        
        # High priority should be parallel
        context_high = {"priority": "high"}
        strategy = await multi_agent_pattern._coordinator.determine_execution_strategy(
            ["network", "device"], context_high
        )
        assert strategy == "parallel"
        
        # Dependencies should be sequential
        context_deps = {"data_dependencies": ["network_first"]}
        strategy = await multi_agent_pattern._coordinator.determine_execution_strategy(
            ["network", "device"], context_deps
        )
        assert strategy == "sequential"
    
    @pytest.mark.asyncio
    async def test_result_synthesis(self, multi_agent_pattern):
        """Test result synthesis functionality"""
        await multi_agent_pattern._initialize_components()
        
        # Mock agent results
        agent_results = {
            "network": {
                "success": True,
                "risk_score": 0.7,
                "confidence": 0.8,
                "risk_factors": ["VPN detected", "Suspicious IP"],
                "findings": {"vpn_detected": True}
            },
            "device": {
                "success": True, 
                "risk_score": 0.5,
                "confidence": 0.9,
                "risk_factors": ["New device"],
                "findings": {"new_device": True}
            }
        }
        
        synthesis = await multi_agent_pattern._synthesizer.synthesize_results(agent_results)
        
        assert "overall_risk_score" in synthesis
        assert "confidence_score" in synthesis
        assert "investigation_summary" in synthesis
        assert synthesis["overall_risk_score"] > 0
        assert len(synthesis["risk_factors"]) > 0
    
    @pytest.mark.asyncio 
    async def test_handoff_context_creation(self, multi_agent_pattern):
        """Test agent handoff context creation"""
        await multi_agent_pattern._initialize_components()
        
        investigation_data = {
            "investigation_id": "test-123",
            "user_id": "user-456", 
            "findings": {"vpn_detected": True}
        }
        
        handoff_context = await multi_agent_pattern._handoff_manager.create_handoff_context(
            "network", "device", investigation_data
        )
        
        assert handoff_context["from_agent"] == "network"
        assert handoff_context["to_agent"] == "device"
        assert handoff_context["investigation_id"] == "test-123"
        assert handoff_context["user_id"] == "user-456"
        assert "device_consistency_check" in handoff_context["priority_areas"]


if __name__ == "__main__":
    # Simple test runner
    async def run_basic_test():
        """Run a basic test of the multi-agent pattern"""
        pattern_config = PatternConfig(pattern_type=PatternType.OPENAI_MULTI_AGENT)
        openai_config = OpenAIPatternConfig()
        
        pattern = OpenAIMultiAgentPattern(pattern_config, openai_config, [])
        
        # Test initialization
        await pattern._initialize_components()
        print("Multi-agent pattern components initialized successfully")
        
        # Test routing
        context = {"investigation_type": "ato", "data_types": ["ip", "device_fingerprint"]}
        agents = await pattern._coordinator.route_investigation(context)
        print(f"Routed to agents: {agents}")
        
        # Test result synthesis
        mock_results = {
            "network": {"success": True, "risk_score": 0.6, "confidence": 0.8, "risk_factors": ["VPN"]},
            "device": {"success": True, "risk_score": 0.4, "confidence": 0.9, "risk_factors": ["New device"]}
        }
        synthesis = await pattern._synthesizer.synthesize_results(mock_results)
        print(f"Synthesis result: {synthesis['overall_risk_score']:.2f}")
        
        print("All basic tests passed!")
    
    asyncio.run(run_basic_test())
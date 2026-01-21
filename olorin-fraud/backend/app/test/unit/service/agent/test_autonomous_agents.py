"""
Tests for Structured Agent System

Comprehensive tests for structured investigation agents, context management,
and LLM-driven tool selection behavior.
"""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.service.agent.recursion_guard import RecursionGuard
from app.service.agent.structured_agents import (
    StructuredInvestigationAgent,
    structured_device_agent,
    structured_location_agent,
    structured_logs_agent,
    structured_network_agent,
    structured_risk_agent,
)
from app.service.agent.structured_context import (
    DomainFindings,
    EntityType,
    InvestigationPhase,
    RiskLevel,
    StructuredInvestigationContext,
)


class TestStructuredInvestigationContext:
    """Test the structured investigation context system"""

    def test_context_initialization(self):
        """Test context is properly initialized"""
        context = StructuredInvestigationContext(
            investigation_id="test_inv_001",
            entity_id="user_123",
            entity_type=EntityType.USER_ID,
            investigation_type="fraud_investigation",
        )

        assert context.investigation_id == "test_inv_001"
        assert context.entity_id == "user_123"
        assert context.entity_type == EntityType.USER_ID
        assert context.investigation_type == "fraud_investigation"
        assert context.current_phase == InvestigationPhase.INITIALIZATION
        assert len(context.objectives) > 0  # Should have default objectives
        assert len(context.available_tools) > 0  # Should have tool capabilities

    def test_domain_findings_recording(self):
        """Test recording domain findings"""
        context = StructuredInvestigationContext(
            investigation_id="test_inv_001",
            entity_id="user_123",
            entity_type=EntityType.USER_ID,
        )

        findings = DomainFindings(
            domain="network",
            risk_score=0.7,
            confidence=0.8,
            key_findings=["Suspicious IP detected", "Unusual traffic pattern"],
            suspicious_indicators=["High risk IP: 192.168.1.1"],
            data_quality="good",
            timestamp=datetime.now(),
        )

        context.record_domain_findings("network", findings)

        assert "network" in context.progress.domain_findings
        assert "network" in context.progress.completed_domains
        assert context.progress.overall_risk_score > 0  # Should be updated

    def test_llm_context_generation(self):
        """Test LLM context generation for structured decision making"""
        context = StructuredInvestigationContext(
            investigation_id="test_inv_001",
            entity_id="user_123",
            entity_type=EntityType.USER_ID,
        )

        # Add some findings
        findings = DomainFindings(
            domain="device",
            risk_score=0.6,
            confidence=0.9,
            key_findings=["Device fingerprint anomaly"],
            suspicious_indicators=["Unknown device characteristics"],
            data_quality="excellent",
            timestamp=datetime.now(),
        )
        context.record_domain_findings("device", findings)

        llm_context = context.generate_llm_context("network")

        assert "FRAUD INVESTIGATION CONTEXT" in llm_context
        assert "test_inv_001" in llm_context
        assert "user_123" in llm_context
        assert "AVAILABLE TOOLS" in llm_context
        assert "splunk_query_tool" in llm_context
        assert "INVESTIGATION OBJECTIVES" in llm_context
        assert "DEVICE ANALYSIS" in llm_context  # Should show completed findings
        assert "CURRENT DOMAIN FOCUS" in llm_context
        assert "NETWORK ANALYSIS" in llm_context

    def test_anomaly_detection(self):
        """Test anomaly detection and correlation"""
        context = StructuredInvestigationContext(
            investigation_id="test_inv_001",
            entity_id="user_123",
            entity_type=EntityType.USER_ID,
        )

        context.add_anomaly("Impossible travel detected", "location")
        context.add_correlation(
            {
                "type": "cross_domain",
                "domains": ["location", "device"],
                "description": "Location anomaly correlates with device change",
            }
        )

        assert len(context.anomalies_detected) == 1
        assert "[location]" in context.anomalies_detected[0]
        assert len(context.cross_domain_correlations) == 1
        assert "cross_domain" in context.cross_domain_correlations[0]["type"]


class TestRecursionGuard:
    """Test the recursion guard system"""

    def test_guard_initialization(self):
        """Test recursion guard initialization"""
        guard = RecursionGuard()

        stats = guard.get_system_stats()
        assert stats["active_investigations"] == 0
        assert stats["max_concurrent_limit"] == 10

    def test_context_creation_and_management(self):
        """Test execution context creation and lifecycle"""
        guard = RecursionGuard()

        context = guard.create_context(
            investigation_id="test_001",
            thread_id="thread_001",
            max_depth=5,
            max_tool_calls=10,
        )

        assert context.investigation_id == "test_001"
        assert context.thread_id == "thread_001"
        assert context.max_depth == 5
        assert context.max_tool_calls == 10

        # Test node entry/exit
        assert guard.enter_node("test_001", "thread_001", "network_agent")
        assert context.current_depth == 1
        assert "network_agent" in context.node_stack

        guard.exit_node("test_001", "thread_001", "network_agent")
        assert context.current_depth == 0
        assert len(context.node_stack) == 0

    def test_recursion_prevention(self):
        """Test recursion prevention mechanisms"""
        guard = RecursionGuard()

        context = guard.create_context(
            investigation_id="test_001",
            thread_id="thread_001",
            max_depth=3,
            max_tool_calls=5,
        )

        # Test depth limit
        assert guard.enter_node("test_001", "thread_001", "node1")
        assert guard.enter_node("test_001", "thread_001", "node2")
        assert guard.enter_node("test_001", "thread_001", "node3")

        # Should hit depth limit
        assert not guard.enter_node("test_001", "thread_001", "node4")

        # Test tool call limit
        for i in range(5):
            assert guard.record_tool_call("test_001", "thread_001", f"tool_{i}")

        # Should hit tool limit
        assert not guard.record_tool_call("test_001", "thread_001", "tool_overflow")

    def test_immediate_loop_detection(self):
        """Test immediate loop detection"""
        guard = RecursionGuard()

        context = guard.create_context(
            investigation_id="test_001", thread_id="thread_001"
        )

        # Enter same node twice should be allowed
        assert guard.enter_node("test_001", "thread_001", "test_node")
        assert guard.enter_node("test_001", "thread_001", "test_node")

        # But third consecutive entry should be blocked
        assert not guard.enter_node("test_001", "thread_001", "test_node")


class TestStructuredInvestigationAgent:
    """Test the structured investigation agent"""

    @pytest.fixture
    def mock_tools(self):
        """Create mock tools for testing"""
        mock_tool1 = MagicMock()
        mock_tool1.name = "test_tool_1"
        mock_tool1.description = "Test tool 1"

        mock_tool2 = MagicMock()
        mock_tool2.name = "test_tool_2"
        mock_tool2.description = "Test tool 2"

        return [mock_tool1, mock_tool2]

    @pytest.fixture
    def structured_context(self):
        """Create test structured context"""
        return StructuredInvestigationContext(
            investigation_id="test_inv_001",
            entity_id="user_123",
            entity_type=EntityType.USER_ID,
            investigation_type="fraud_investigation",
        )

    def test_agent_initialization(self, mock_tools):
        """Test structured agent initialization"""
        agent = StructuredInvestigationAgent("network", mock_tools)

        assert agent.domain == "network"
        assert len(agent.tools) == 2
        assert "test_tool_1" in agent.tool_map
        assert "test_tool_2" in agent.tool_map

    @patch("app.service.agent.structured_agents.structured_llm")
    async def test_structured_investigation(
        self, mock_llm, mock_tools, structured_context
    ):
        """Test structured investigation execution"""
        # Mock LLM response
        mock_response = MagicMock()
        mock_response.content = json.dumps(
            {
                "risk_score": 0.75,
                "confidence": 0.85,
                "key_findings": ["Suspicious network pattern", "High risk IP detected"],
                "suspicious_indicators": ["192.168.1.100 flagged"],
                "data_quality": "good",
                "recommended_actions": [
                    "Block suspicious IP",
                    "Monitor network traffic",
                ],
            }
        )

        mock_llm.bind_tools.return_value.ainvoke = AsyncMock(return_value=mock_response)

        agent = StructuredInvestigationAgent("network", mock_tools)
        config = {"configurable": {"agent_context": {}, "thread_id": "test_thread"}}

        findings = await agent.structured_investigate(
            context=structured_context,
            config=config,
            specific_objectives=["Test network analysis"],
        )

        assert findings.domain == "network"
        assert findings.risk_score == 0.75
        assert findings.confidence == 0.85
        assert "Suspicious network pattern" in findings.key_findings
        assert "192.168.1.100 flagged" in findings.suspicious_indicators
        assert "Block suspicious IP" in findings.recommended_actions

    def test_default_domain_objectives(self, mock_tools):
        """Test default domain objectives generation"""
        network_agent = StructuredInvestigationAgent("network", mock_tools)
        device_agent = StructuredInvestigationAgent("device", mock_tools)

        network_objectives = network_agent._get_default_domain_objectives()
        device_objectives = device_agent._get_default_domain_objectives()

        assert len(network_objectives) > 0
        assert any("network" in obj.lower() for obj in network_objectives)

        assert len(device_objectives) > 0
        assert any("device" in obj.lower() for obj in device_objectives)


class TestStructuredDomainAgents:
    """Test structured domain agent functions"""

    @pytest.fixture
    def mock_config(self):
        """Mock LangGraph config"""
        return {
            "configurable": {
                "agent_context": MagicMock(),
                "thread_id": "test_thread_001",
            }
        }

    @pytest.fixture
    def mock_agent_context(self):
        """Mock agent context with investigation metadata"""
        mock_context = MagicMock()
        mock_context.metadata = MagicMock()
        mock_context.metadata.additional_metadata = {
            "investigationId": "test_inv_001",
            "entityId": "user_123",
            "entity_id": "user_123",
            "investigation_id": "test_inv_001",
        }
        return mock_context

    @patch("app.service.agent.structured_agents._get_or_create_structured_context")
    @patch("app.service.agent.structured_agents.websocket_manager")
    @patch("app.service.agent.agent.tools")
    async def test_structured_network_agent(
        self,
        mock_tools,
        mock_ws_manager,
        mock_get_context,
        mock_config,
        mock_agent_context,
    ):
        """Test structured network agent execution"""
        # Setup mocks
        mock_config["configurable"]["agent_context"] = mock_agent_context
        mock_context = MagicMock(spec=StructuredInvestigationContext)
        mock_get_context.return_value = mock_context

        mock_findings = DomainFindings(
            domain="network",
            risk_score=0.8,
            confidence=0.9,
            key_findings=["Network anomaly detected"],
            suspicious_indicators=["Suspicious IP traffic"],
            data_quality="excellent",
            timestamp=datetime.now(),
        )

        # Mock the structured investigation
        with patch(
            "app.service.agent.structured_agents.StructuredInvestigationAgent"
        ) as mock_agent_class:
            mock_agent_instance = AsyncMock()
            mock_agent_instance.structured_investigate.return_value = mock_findings
            mock_agent_class.return_value = mock_agent_instance

            # Execute structured network agent
            result = await structured_network_agent({}, mock_config)

            # Verify result structure
            assert "messages" in result
            message_content = json.loads(result["messages"][0].content)
            assert "risk_assessment" in message_content
            assert message_content["risk_assessment"]["structured_execution"] is True
            assert message_content["risk_assessment"]["domain"] == "network"

            # Verify context interactions
            mock_context.start_domain_analysis.assert_called_with("network")
            mock_context.record_domain_findings.assert_called_with(
                "network", mock_findings
            )

    @patch("app.service.agent.structured_agents._get_or_create_structured_context")
    @patch("app.service.agent.structured_agents.websocket_manager")
    @patch("app.service.agent.agent.tools")
    async def test_structured_device_agent(
        self,
        mock_tools,
        mock_ws_manager,
        mock_get_context,
        mock_config,
        mock_agent_context,
    ):
        """Test structured device agent execution"""
        # Setup mocks
        mock_config["configurable"]["agent_context"] = mock_agent_context
        mock_context = MagicMock(spec=StructuredInvestigationContext)
        mock_get_context.return_value = mock_context

        mock_findings = DomainFindings(
            domain="device",
            risk_score=0.6,
            confidence=0.85,
            key_findings=["Device fingerprint analysis complete"],
            suspicious_indicators=["Unknown device characteristics"],
            data_quality="good",
            timestamp=datetime.now(),
        )

        with patch(
            "app.service.agent.structured_agents.StructuredInvestigationAgent"
        ) as mock_agent_class:
            mock_agent_instance = AsyncMock()
            mock_agent_instance.structured_investigate.return_value = mock_findings
            mock_agent_class.return_value = mock_agent_instance

            # Execute structured device agent
            result = await structured_device_agent({}, mock_config)

            # Verify result structure
            assert "messages" in result
            message_content = json.loads(result["messages"][0].content)
            assert (
                "llm_assessment" in message_content
            )  # Device agent uses llm_assessment
            assert message_content["llm_assessment"]["structured_execution"] is True
            assert message_content["llm_assessment"]["domain"] == "device"

    async def test_agent_error_handling(self, mock_config):
        """Test error handling in structured agents"""
        # Test with missing investigation context
        mock_config["configurable"]["agent_context"] = None

        result = await structured_network_agent({}, mock_config)

        # Should return error response
        assert "messages" in result
        message_content = json.loads(result["messages"][0].content)
        assert "error" in message_content
        assert message_content["structured_execution"] is False


class TestIntegration:
    """Integration tests for structured mode"""

    @patch("app.service.agent.structured_agents.structured_llm")
    @patch("app.service.agent.structured_agents.websocket_manager")
    async def test_end_to_end_structured_investigation(self, mock_ws_manager, mock_llm):
        """Test complete structured investigation flow"""
        # Mock LLM responses for different domains
        mock_responses = {
            "network": {
                "risk_score": 0.8,
                "confidence": 0.9,
                "key_findings": ["High risk IP detected", "Unusual traffic patterns"],
                "suspicious_indicators": ["192.168.1.100 flagged as malicious"],
                "recommended_actions": ["Block IP", "Monitor traffic"],
            },
            "device": {
                "risk_score": 0.6,
                "confidence": 0.85,
                "key_findings": ["Device fingerprint anomaly"],
                "suspicious_indicators": ["Unknown device type"],
                "recommended_actions": ["Verify device authenticity"],
            },
        }

        def mock_llm_response(domain):
            mock_response = MagicMock()
            mock_response.content = json.dumps(mock_responses.get(domain, {}))
            return mock_response

        # Create investigation context
        context = StructuredInvestigationContext(
            investigation_id="integration_test_001",
            entity_id="user_test_123",
            entity_type=EntityType.USER_ID,
            investigation_type="fraud_investigation",
        )

        # Test context evolution throughout investigation
        initial_summary = context.get_investigation_summary()
        assert initial_summary["progress"]["overall_risk_score"] == 0.0

        # Simulate findings from multiple domains
        network_findings = DomainFindings(
            domain="network",
            risk_score=0.8,
            confidence=0.9,
            key_findings=mock_responses["network"]["key_findings"],
            suspicious_indicators=mock_responses["network"]["suspicious_indicators"],
            data_quality="excellent",
            timestamp=datetime.now(),
        )

        device_findings = DomainFindings(
            domain="device",
            risk_score=0.6,
            confidence=0.85,
            key_findings=mock_responses["device"]["key_findings"],
            suspicious_indicators=mock_responses["device"]["suspicious_indicators"],
            data_quality="good",
            timestamp=datetime.now(),
        )

        # Record findings and verify context updates
        context.record_domain_findings("network", network_findings)
        context.record_domain_findings("device", device_findings)

        final_summary = context.get_investigation_summary()

        # Verify investigation progression
        assert "network" in final_summary["progress"]["completed_domains"]
        assert "device" in final_summary["progress"]["completed_domains"]
        assert final_summary["progress"]["overall_risk_score"] > 0.0
        assert final_summary["progress"]["confidence_score"] > 0.0

        # Verify comprehensive context for final risk assessment
        final_context = context.generate_llm_context("risk")
        assert "NETWORK ANALYSIS" in final_context
        assert "DEVICE ANALYSIS" in final_context
        assert "Risk Score: 0.80" in final_context  # Network findings
        assert "Risk Score: 0.60" in final_context  # Device findings
        assert (
            "CROSS-DOMAIN CORRELATIONS" in final_context
            or "DETECTED ANOMALIES" in final_context
        )

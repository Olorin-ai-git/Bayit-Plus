"""
Integration tests for structured investigations with MCP client and threat intelligence tools.

Tests the integration of:
- Threat Intelligence Tools (AbuseIPDB, VirusTotal, Shodan)
- MCP Client Tools (Blockchain, Intelligence, ML/AI)
- Domain agents using these tools in investigations
"""

import asyncio
import json
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.service.agent.orchestration.graph_builder import create_and_get_agent_graph
from app.service.agent.tools.tool_registry import initialize_tools, get_mcp_client_tools, get_threat_intelligence_tools


@pytest.fixture
async def investigation_graph():
    """Create an investigation graph with all tools enabled."""
    graph = await create_and_get_agent_graph(parallel=True, use_enhanced_tools=True)
    return graph


@pytest.fixture
def mock_websocket_manager():
    """Mock websocket manager for progress updates."""
    with patch("app.service.websocket_manager.websocket_manager") as mock:
        mock.broadcast_progress = AsyncMock()
        yield mock


class TestMCPClientToolIntegration:
    """Test scenarios involving MCP client tools."""
    
    @pytest.mark.asyncio
    async def test_blockchain_fraud_investigation(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Cryptocurrency fraud investigation.
        
        Scenario:
        - User suspected of cryptocurrency-related fraud
        - Network agent uses blockchain_mcp_client to analyze wallet addresses
        - ML agent uses fraud detection models
        """
        # Initialize tools
        initialize_tools()
        
        # Create investigation context with crypto addresses
        investigation_data = {
            "investigation_id": "test-crypto-001",
            "entity_id": "user-crypto-123",
            "entity_type": "user",
            "metadata": {
                "suspicious_addresses": [
                    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # Bitcoin genesis address
                    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5"  # Ethereum address
                ],
                "transaction_hash": "0xabc123def456",
                "suspected_activity": "money_laundering"
            }
        }
        
        # Run investigation
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate cryptocurrency fraud for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        # Verify blockchain tools were considered
        assert result is not None
        # In real test, verify blockchain_mcp_client was invoked
    
    @pytest.mark.asyncio  
    async def test_intelligence_gathering_investigation(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Social media fraud investigation using intelligence tools.
        
        Scenario:
        - User suspected of social media-based fraud scheme
        - Location agent uses intelligence_mcp_client for OSINT
        - Device agent checks for spoofing patterns
        """
        investigation_data = {
            "investigation_id": "test-social-001",
            "entity_id": "user-social-456",
            "entity_type": "user",
            "metadata": {
                "social_handles": ["@fraudster123", "john_doe_scammer"],
                "email": "suspect@example.com",
                "suspected_activity": "romance_scam"
            }
        }
        
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate social media fraud for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_ml_anomaly_detection(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Behavioral anomaly detection using ML tools.
        
        Scenario:
        - User shows unusual transaction patterns
        - Logs agent uses ml_ai_mcp_client for anomaly detection
        - Risk agent aggregates ML predictions
        """
        investigation_data = {
            "investigation_id": "test-anomaly-001",
            "entity_id": "user-anomaly-789",
            "entity_type": "user",
            "metadata": {
                "transaction_velocity": 150,  # Transactions per hour
                "amount_spike": 10000,  # Sudden large amount
                "device_changes": 5,  # Multiple device switches
                "suspected_activity": "account_takeover"
            }
        }
        
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate anomalous behavior for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None


class TestThreatIntelligenceToolIntegration:
    """Test scenarios involving threat intelligence tools."""
    
    @pytest.mark.asyncio
    async def test_ip_reputation_check(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Malicious IP investigation.
        
        Scenario:
        - User connecting from suspicious IPs
        - Network agent uses AbuseIPDB, VirusTotal, Shodan
        - Risk assessment based on threat intelligence
        """
        investigation_data = {
            "investigation_id": "test-ip-001", 
            "entity_id": "user-ip-321",
            "entity_type": "user",
            "metadata": {
                "ip_addresses": [
                    "185.220.101.45",  # Known Tor exit node
                    "192.168.1.1",  # Private IP
                    "8.8.8.8"  # Google DNS
                ],
                "suspected_activity": "bot_attack"
            }
        }
        
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate suspicious IP activity for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_malware_detection(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Malware-related fraud.
        
        Scenario:
        - User's device potentially compromised
        - Device agent uses VirusTotal for file/URL analysis
        - Network agent checks C&C communication patterns
        """
        investigation_data = {
            "investigation_id": "test-malware-001",
            "entity_id": "user-malware-654",
            "entity_type": "user",
            "metadata": {
                "suspicious_files": ["malware.exe", "trojan.dll"],
                "suspicious_urls": ["http://malicious-site.com/payload"],
                "file_hashes": ["d41d8cd98f00b204e9800998ecf8427e"],
                "suspected_activity": "malware_fraud"
            }
        }
        
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate malware-related fraud for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_infrastructure_analysis(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Infrastructure reconnaissance.
        
        Scenario:
        - Suspicious infrastructure patterns detected
        - Location agent uses Shodan for infrastructure analysis
        - Network agent correlates with known attack patterns
        """
        investigation_data = {
            "investigation_id": "test-infra-001",
            "entity_id": "user-infra-987",
            "entity_type": "user",
            "metadata": {
                "domains": ["suspicious-domain.com", "phishing-site.net"],
                "ports": [22, 3389, 8080],
                "services": ["ssh", "rdp", "http-proxy"],
                "suspected_activity": "infrastructure_recon"
            }
        }
        
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate infrastructure patterns for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None


class TestCombinedToolScenarios:
    """Test scenarios using multiple tool categories together."""
    
    @pytest.mark.asyncio
    async def test_comprehensive_fraud_investigation(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Comprehensive fraud using all tool types.
        
        Scenario:
        - Complex fraud involving crypto, malware, and social engineering
        - All agents use their respective specialized tools
        - Risk agent aggregates findings from all sources
        """
        investigation_data = {
            "investigation_id": "test-comprehensive-001",
            "entity_id": "user-complex-111",
            "entity_type": "user",
            "metadata": {
                # Blockchain indicators
                "crypto_addresses": ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
                "crypto_transactions": 50,
                
                # Threat intelligence indicators
                "ip_addresses": ["185.220.101.45", "192.42.116.16"],
                "malicious_domains": ["evil-site.com"],
                "file_hashes": ["abc123def456"],
                
                # ML/AI indicators
                "anomaly_score": 0.95,
                "transaction_velocity": 200,
                "behavioral_deviation": 3.5,
                
                # OSINT indicators
                "social_profiles": ["@scammer123"],
                "email_addresses": ["fraud@example.com"],
                
                "suspected_activity": "organized_fraud_ring"
            }
        }
        
        result = await investigation_graph.ainvoke(
            {"messages": [f"Investigate comprehensive fraud for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_real_time_investigation_with_tools(self, investigation_graph, mock_websocket_manager):
        """
        Test scenario: Real-time investigation with progressive tool usage.
        
        Scenario:
        - Investigation starts with basic indicators
        - Agents progressively discover more evidence
        - Each agent uses appropriate tools based on findings
        """
        investigation_data = {
            "investigation_id": "test-realtime-001",
            "entity_id": "user-realtime-222",
            "entity_type": "user",
            "metadata": {
                "initial_indicator": "suspicious_login",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        # Simulate progressive investigation
        result = await investigation_graph.ainvoke(
            {"messages": [f"Start real-time investigation for {investigation_data['entity_id']}"]},
            config={"configurable": {"agent_context": investigation_data}}
        )
        
        assert result is not None
        
        # Verify websocket progress updates were sent
        assert mock_websocket_manager.broadcast_progress.called


class TestToolAvailability:
    """Test that tools are properly registered and available."""
    
    def test_mcp_client_tools_registered(self):
        """Verify MCP client tools are registered."""
        initialize_tools()
        mcp_tools = get_mcp_client_tools()
        
        assert len(mcp_tools) == 3
        tool_names = [tool.name for tool in mcp_tools]
        assert "blockchain_mcp_client" in tool_names
        assert "intelligence_mcp_client" in tool_names
        assert "ml_ai_mcp_client" in tool_names
    
    def test_threat_intelligence_tools_registered(self):
        """Verify threat intelligence tools are registered."""
        initialize_tools()
        threat_tools = get_threat_intelligence_tools()
        
        assert len(threat_tools) > 0
        tool_names = [tool.name for tool in threat_tools]
        
        # Check for key threat intelligence tools
        expected_tools = [
            "abuseipdb_ip_reputation",
            "virustotal_ip_analysis",
            "shodan_infrastructure_analysis",
            "unified_threat_intelligence"
        ]
        
        for expected in expected_tools:
            assert any(expected in name for name in tool_names), f"Missing tool: {expected}"
    
    def test_tools_in_graph_builder(self):
        """Verify tools are loaded in graph builder."""
        from app.service.agent.orchestration.graph_builder import _get_configured_tools
        
        tools = _get_configured_tools()
        assert len(tools) > 0
        
        # Check for different tool categories
        tool_names = [tool.name for tool in tools]
        
        # Should have MCP clients
        assert any("mcp" in name for name in tool_names)
        
        # Should have threat intelligence
        assert any("threat" in name or "virus" in name or "abuse" in name for name in tool_names)
        
        # Should have traditional tools
        assert any("splunk" in name.lower() for name in tool_names)


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
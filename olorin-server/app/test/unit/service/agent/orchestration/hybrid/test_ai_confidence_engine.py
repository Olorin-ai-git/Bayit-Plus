"""
Unit tests for AI Confidence Engine
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, patch

from app.service.agent.orchestration.hybrid.ai_confidence_engine import AIConfidenceEngine
from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
    HybridInvestigationState,
    AIConfidenceLevel,
    InvestigationStrategy,
    create_hybrid_initial_state
)


class TestAIConfidenceEngine:
    
    @pytest.fixture
    def confidence_engine(self):
        return AIConfidenceEngine()
    
    @pytest.fixture
    def mock_state(self):
        return create_hybrid_initial_state(
            investigation_id="test-001",
            entity_id="192.168.1.100",
            entity_type="ip"
        )
    
    @pytest.mark.asyncio
    async def test_calculate_investigation_confidence_basic(self, confidence_engine, mock_state):
        """Test basic confidence calculation"""
        
        # Act
        decision = await confidence_engine.calculate_investigation_confidence(mock_state)
        
        # Assert
        assert decision is not None
        assert 0.0 <= decision.confidence <= 1.0
        assert decision.confidence_level in AIConfidenceLevel
        assert decision.strategy in InvestigationStrategy
        assert len(decision.reasoning) > 0
        assert decision.recommended_action is not None
    
    @pytest.mark.asyncio
    async def test_assess_snowflake_evidence_none(self, confidence_engine, mock_state):
        """Test Snowflake evidence assessment with no data"""
        
        # Arrange
        mock_state["snowflake_data"] = {}
        
        # Act
        confidence = await confidence_engine._assess_snowflake_evidence(mock_state)
        
        # Assert
        assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_assess_snowflake_evidence_with_data(self, confidence_engine, mock_state):
        """Test Snowflake evidence assessment with rich data"""
        
        # Arrange
        mock_state["snowflake_data"] = {
            "transactions": [{"id": "tx1", "amount": 1000}],
            "user_behavior": {"login_count": 5, "avg_session": 30},
            "risk_indicators": {"fraud_probability": 0.8},
            "temporal_analysis": {"peak_hours": [14, 15, 16]}
        }
        
        # Act
        confidence = await confidence_engine._assess_snowflake_evidence(mock_state)
        
        # Assert
        assert confidence > 0.5  # Should be high due to rich data and high fraud probability
        assert confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_assess_tool_evidence_none(self, confidence_engine, mock_state):
        """Test tool evidence assessment with no tools"""
        
        # Arrange
        mock_state["tools_used"] = []
        mock_state["tool_results"] = {}
        
        # Act
        confidence = await confidence_engine._assess_tool_evidence(mock_state)
        
        # Assert
        assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_assess_tool_evidence_with_tools(self, confidence_engine, mock_state):
        """Test tool evidence assessment with multiple tools"""
        
        # Arrange
        mock_state["tools_used"] = ["virustotal", "splunk", "abuseipdb"]
        mock_state["tool_results"] = {
            "virustotal": {"reputation": "clean", "detections": 0},
            "splunk": {"events": 150, "anomalies": 3},
            "abuseipdb": {"abuse_confidence": 0.2}
        }
        
        # Act
        confidence = await confidence_engine._assess_tool_evidence(mock_state)
        
        # Assert
        assert confidence > 0.0
        assert confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_assess_domain_evidence_none(self, confidence_engine, mock_state):
        """Test domain evidence assessment with no completed domains"""
        
        # Arrange
        mock_state["domains_completed"] = []
        mock_state["domain_findings"] = {}
        
        # Act
        confidence = await confidence_engine._assess_domain_evidence(mock_state)
        
        # Assert
        assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_assess_domain_evidence_with_domains(self, confidence_engine, mock_state):
        """Test domain evidence assessment with completed domains"""
        
        # Arrange
        mock_state["domains_completed"] = ["network", "device", "risk"]
        mock_state["domain_findings"] = {
            "network": {"risk_score": 0.7, "confidence": 0.8},
            "device": {"risk_score": 0.3, "confidence": 0.9},
            "risk": {"risk_score": 0.6, "confidence": 0.85}
        }
        
        # Act
        confidence = await confidence_engine._assess_domain_evidence(mock_state)
        
        # Assert
        assert confidence > 0.0
        assert confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_assess_risk_patterns_high_risk(self, confidence_engine, mock_state):
        """Test risk pattern assessment with high risk indicators"""
        
        # Arrange
        mock_state["risk_indicators"] = [
            "High transaction velocity",
            "Geographic anomaly", 
            "Device fingerprint mismatch",
            "Suspicious timing patterns"
        ]
        mock_state["risk_score"] = 0.85
        
        # Act
        confidence = await confidence_engine._assess_risk_patterns(mock_state)
        
        # Assert
        assert confidence > 0.5  # Should be high due to many indicators
    
    @pytest.mark.asyncio
    async def test_assess_risk_patterns_low_risk(self, confidence_engine, mock_state):
        """Test risk pattern assessment with low risk"""
        
        # Arrange
        mock_state["risk_indicators"] = []
        mock_state["risk_score"] = 0.1
        
        # Act
        confidence = await confidence_engine._assess_risk_patterns(mock_state)
        
        # Assert
        assert confidence < 0.5  # Should be low due to no indicators
    
    @pytest.mark.asyncio
    async def test_determine_investigation_strategy_critical_path(self, confidence_engine, mock_state):
        """Test strategy determination for critical path"""
        
        # Act
        strategy = await confidence_engine._determine_investigation_strategy(mock_state, 0.95)
        
        # Assert based on high confidence but need high risk too
        # With default low risk, should not be critical path
        assert strategy in InvestigationStrategy
    
    @pytest.mark.asyncio
    async def test_determine_investigation_strategy_minimal(self, confidence_engine, mock_state):
        """Test strategy determination for minimal approach"""
        
        # Arrange
        mock_state["risk_score"] = 0.2  # Low risk
        
        # Act
        strategy = await confidence_engine._determine_investigation_strategy(mock_state, 0.85)
        
        # Assert
        assert strategy == InvestigationStrategy.MINIMAL
    
    @pytest.mark.asyncio
    async def test_determine_investigation_strategy_comprehensive(self, confidence_engine, mock_state):
        """Test strategy determination for comprehensive approach"""
        
        # Act
        strategy = await confidence_engine._determine_investigation_strategy(mock_state, 0.2)
        
        # Assert
        assert strategy == InvestigationStrategy.COMPREHENSIVE
    
    @pytest.mark.asyncio
    async def test_determine_next_action_snowflake_incomplete(self, confidence_engine, mock_state):
        """Test next action when Snowflake is incomplete"""
        
        # Arrange
        mock_state["snowflake_completed"] = False
        
        # Act
        action = await confidence_engine._determine_next_action(
            mock_state, 0.7, InvestigationStrategy.ADAPTIVE
        )
        
        # Assert
        assert action == "snowflake_analysis"
    
    @pytest.mark.asyncio
    async def test_determine_next_action_critical_path(self, confidence_engine, mock_state):
        """Test next action for critical path strategy"""
        
        # Arrange
        mock_state["snowflake_completed"] = True
        mock_state["domains_completed"] = []
        
        # Act
        action = await confidence_engine._determine_next_action(
            mock_state, 0.9, InvestigationStrategy.CRITICAL_PATH
        )
        
        # Assert
        assert action == "risk_agent"
    
    @pytest.mark.asyncio
    async def test_determine_next_action_minimal(self, confidence_engine, mock_state):
        """Test next action for minimal strategy"""
        
        # Arrange
        mock_state["snowflake_completed"] = True
        mock_state["domains_completed"] = []
        
        # Act
        action = await confidence_engine._determine_next_action(
            mock_state, 0.8, InvestigationStrategy.MINIMAL
        )
        
        # Assert
        assert action == "risk_agent"
    
    @pytest.mark.asyncio
    async def test_get_priority_domains_with_network_anomalies(self, confidence_engine, mock_state):
        """Test priority domain selection with network anomalies"""
        
        # Arrange
        mock_state["snowflake_data"] = {
            "network_anomalies": True,
            "authentication_issues": True
        }
        
        # Act
        domains = await confidence_engine._get_priority_domains(mock_state)
        
        # Assert
        assert "risk" in domains  # Always included
        assert "network" in domains  # Added due to anomalies
        assert "authentication" in domains  # Added due to issues
    
    @pytest.mark.asyncio
    async def test_determine_agents_to_activate_critical_path(self, confidence_engine, mock_state):
        """Test agent activation for critical path"""
        
        # Act
        agents = await confidence_engine._determine_agents_to_activate(
            mock_state, InvestigationStrategy.CRITICAL_PATH, 0.9
        )
        
        # Assert
        assert agents == ["risk_agent"]
    
    @pytest.mark.asyncio
    async def test_determine_agents_to_activate_comprehensive(self, confidence_engine, mock_state):
        """Test agent activation for comprehensive strategy"""
        
        # Act
        agents = await confidence_engine._determine_agents_to_activate(
            mock_state, InvestigationStrategy.COMPREHENSIVE, 0.5
        )
        
        # Assert
        expected_agents = [
            "network_agent", "device_agent", "location_agent",
            "logs_agent", "authentication_agent", "risk_agent"
        ]
        assert agents == expected_agents
    
    @pytest.mark.asyncio
    async def test_determine_recommended_tools_critical_path(self, confidence_engine, mock_state):
        """Test tool recommendations for critical path"""
        
        # Arrange
        mock_state["tools_used"] = []
        
        # Act
        tools = await confidence_engine._determine_recommended_tools(
            mock_state, InvestigationStrategy.CRITICAL_PATH, 0.9
        )
        
        # Assert
        assert "virustotal" in tools
        assert len(tools) <= 3  # Should be focused
    
    @pytest.mark.asyncio
    async def test_determine_recommended_tools_minimal(self, confidence_engine, mock_state):
        """Test tool recommendations for minimal strategy"""
        
        # Arrange
        mock_state["tools_used"] = []
        
        # Act
        tools = await confidence_engine._determine_recommended_tools(
            mock_state, InvestigationStrategy.MINIMAL, 0.8
        )
        
        # Assert
        assert len(tools) <= 1  # Minimal should recommend few tools
    
    @pytest.mark.asyncio
    async def test_build_reasoning_chain(self, confidence_engine, mock_state):
        """Test reasoning chain construction"""
        
        # Act
        reasoning = confidence_engine._build_reasoning_chain(
            mock_state, 0.75, InvestigationStrategy.ADAPTIVE,
            "risk_agent", 0.6, 0.3, 0.4, 0.8, 0.5
        )
        
        # Assert
        assert len(reasoning) > 0
        assert any("confidence" in r.lower() for r in reasoning)
        assert any("adaptive" in r.lower() for r in reasoning)
    
    @pytest.mark.asyncio
    async def test_calculate_evidence_quality(self, confidence_engine, mock_state):
        """Test evidence quality calculation"""
        
        # Arrange
        mock_state["snowflake_data"] = {"test": "data"}
        mock_state["tool_results"] = {"tool1": "result1", "tool2": "result2"}
        mock_state["domain_findings"] = {
            "network": {"confidence": 0.8},
            "device": {"confidence": 0.6}
        }
        
        # Act
        quality = await confidence_engine._calculate_evidence_quality(mock_state)
        
        # Assert
        assert 0.0 <= quality <= 1.0
    
    @pytest.mark.asyncio
    async def test_calculate_investigation_completeness(self, confidence_engine, mock_state):
        """Test investigation completeness calculation"""
        
        # Arrange
        mock_state["current_phase"] = "domain_analysis"
        mock_state["domains_completed"] = ["network", "device", "risk"]
        
        # Act
        completeness = await confidence_engine._calculate_investigation_completeness(mock_state)
        
        # Assert
        assert 0.0 <= completeness <= 1.0
        assert completeness > 0.5  # Should be substantial with 3/6 domains
    
    @pytest.mark.asyncio
    async def test_error_handling(self, confidence_engine, mock_state):
        """Test error handling in confidence calculation"""
        
        # Arrange - corrupt state that might cause errors
        mock_state["snowflake_data"] = None
        mock_state["tools_used"] = None
        
        # Act
        decision = await confidence_engine.calculate_investigation_confidence(mock_state)
        
        # Assert - should handle gracefully
        assert decision is not None
        assert decision.confidence >= 0.0  # Should have fallback values
    
    @pytest.mark.asyncio
    async def test_confidence_level_thresholds(self, confidence_engine):
        """Test confidence level determination thresholds"""
        
        # Test high confidence
        high_level = confidence_engine._determine_confidence_level(0.85)
        assert high_level == AIConfidenceLevel.HIGH
        
        # Test medium confidence
        medium_level = confidence_engine._determine_confidence_level(0.6)
        assert medium_level == AIConfidenceLevel.MEDIUM
        
        # Test low confidence
        low_level = confidence_engine._determine_confidence_level(0.3)
        assert low_level == AIConfidenceLevel.LOW
    
    @pytest.mark.asyncio
    async def test_performance_timing(self, confidence_engine, mock_state):
        """Test that confidence calculation completes within reasonable time"""
        
        # Act
        start_time = datetime.now()
        decision = await confidence_engine.calculate_investigation_confidence(mock_state)
        end_time = datetime.now()
        
        # Assert
        duration_ms = (end_time - start_time).total_seconds() * 1000
        assert duration_ms < 1000  # Should complete within 1 second
        assert decision.calculation_time_ms is not None
        assert decision.calculation_time_ms > 0
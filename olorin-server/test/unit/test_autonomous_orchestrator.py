"""
<<<<<<< HEAD
Comprehensive Test Suite for Autonomous Investigation Orchestrator
=======
Comprehensive Test Suite for Structured Investigation Orchestrator
>>>>>>> 001-modify-analyzer-method

Tests for the core orchestrator functionality, AI-driven decision making,
agent coordination, and bulletproof resilience patterns.

Author: Gil Klainert  
Date: 2025-09-06
<<<<<<< HEAD
Plan Reference: /docs/plans/2025-09-06-autonomous-investigation-orchestrator-langgraph-plan.md
=======
Plan Reference: /docs/plans/2025-09-06-structured-investigation-orchestrator-langgraph-plan.md
>>>>>>> 001-modify-analyzer-method
Phase: 5.1 - Comprehensive Test Suite
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import Dict, Any, List

<<<<<<< HEAD
from app.service.agent.autonomous_orchestrator import AutonomousInvestigationOrchestrator, OrchestratorDecision
=======
from app.service.agent.structured_orchestrator import StructuredInvestigationOrchestrator, OrchestratorDecision
>>>>>>> 001-modify-analyzer-method
from app.service.agent.orchestrator_state import OrchestratorStateManager, InvestigationPhase
from app.service.agent.agent_coordination import IntelligentAgentCoordinator, CoordinationMode
from app.service.agent.flow_continuity import FlowContinuityManager, ContinuityStrategy
from app.service.agent.orchestrator_resilience import BulletproofExceptionHandler
from app.service.monitoring.orchestrator_monitoring import OrchestratorMonitoring, AlertType, AlertSeverity


@pytest.fixture
async def orchestrator():
    """Create orchestrator instance for testing"""
<<<<<<< HEAD
    orchestrator = AutonomousInvestigationOrchestrator()
=======
    orchestrator = StructuredInvestigationOrchestrator()
>>>>>>> 001-modify-analyzer-method
    await orchestrator.initialize()
    return orchestrator


@pytest.fixture
def sample_investigation_data():
    """Sample investigation data for testing"""
    return {
        "investigation_id": "test_inv_12345",
        "entity_id": "entity_67890",
        "investigation_type": "fraud_detection",
        "priority": "high",
        "data_sources": ["device_logs", "network_logs", "transaction_logs"],
        "metadata": {
            "user_id": "user_123",
            "timestamp": datetime.now().isoformat(),
            "risk_score": 0.75
        }
    }


@pytest.fixture
def mock_ai_client():
    """Mock AI client for testing decision making"""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.content = [Mock(text=json.dumps({
        "decision": "proceed_with_investigation",
        "reasoning": "High risk score detected, comprehensive investigation required",
        "confidence": 0.9,
        "next_agents": ["device_analysis", "network_analysis"],
        "coordination_strategy": "parallel",
        "estimated_duration": 300
    }))]
    mock_client.messages.create = AsyncMock(return_value=mock_response)
    return mock_client


<<<<<<< HEAD
class TestAutonomousInvestigationOrchestrator:
=======
class TestStructuredInvestigationOrchestrator:
>>>>>>> 001-modify-analyzer-method
    """Test cases for the main orchestrator class"""
    
    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self, orchestrator):
        """Test orchestrator proper initialization"""
        assert orchestrator.state_manager is not None
        assert orchestrator.agent_coordinator is not None
        assert orchestrator.flow_continuity is not None
        assert orchestrator.exception_handler is not None
        assert orchestrator.monitoring is not None
        assert orchestrator.initialized is True
    
    @pytest.mark.asyncio
    async def test_orchestrate_investigation_success(self, orchestrator, sample_investigation_data, mock_ai_client):
        """Test successful investigation orchestration"""
        with patch.object(orchestrator, 'ai_client', mock_ai_client):
            result = await orchestrator.orchestrate_investigation(sample_investigation_data)
            
            assert result is not None
            assert "investigation_id" in result
            assert "status" in result
            assert result["status"] == "completed"
            assert "decisions" in result
            assert len(result["decisions"]) > 0
    
    @pytest.mark.asyncio
    async def test_ai_decision_making(self, orchestrator, sample_investigation_data, mock_ai_client):
        """Test AI-driven decision making process"""
        with patch.object(orchestrator, 'ai_client', mock_ai_client):
            context = {"investigation_data": sample_investigation_data, "current_phase": "initialization"}
            
            decision = await orchestrator._make_ai_decision(context, "strategy_selection")
            
            assert isinstance(decision, OrchestratorDecision)
            assert decision.decision_type == "strategy_selection"
            assert decision.confidence_score >= 0.0
            assert decision.confidence_score <= 1.0
            assert decision.reasoning is not None
            assert len(decision.reasoning) > 0
    
    @pytest.mark.asyncio
    async def test_orchestrator_resilience_on_ai_failure(self, orchestrator, sample_investigation_data):
        """Test orchestrator resilience when AI service fails"""
        # Mock AI client to raise exception
        mock_failing_client = AsyncMock()
        mock_failing_client.messages.create.side_effect = Exception("AI service unavailable")
        
        with patch.object(orchestrator, 'ai_client', mock_failing_client):
            # Should not raise exception, should use fallback logic
            result = await orchestrator.orchestrate_investigation(sample_investigation_data)
            
            assert result is not None
            assert result["status"] in ["completed", "partial_completion"]
            # Should have used fallback decisions
            assert any("fallback" in decision.get("reasoning", "").lower() 
                     for decision in result.get("decisions", []))
    
    @pytest.mark.asyncio
    async def test_investigation_phase_progression(self, orchestrator, sample_investigation_data, mock_ai_client):
        """Test proper investigation phase progression"""
        with patch.object(orchestrator, 'ai_client', mock_ai_client):
            # Track phase changes
            phase_changes = []
            
            async def mock_update_phase(inv_id, phase, metadata=None):
                phase_changes.append(phase)
                return {"status": "success"}
            
            with patch.object(orchestrator.state_manager, 'update_investigation_phase', side_effect=mock_update_phase):
                await orchestrator.orchestrate_investigation(sample_investigation_data)
                
                # Should have progressed through multiple phases
                assert len(phase_changes) >= 2
                assert InvestigationPhase.INITIALIZATION in phase_changes
    
    @pytest.mark.asyncio
    async def test_agent_coordination_integration(self, orchestrator, sample_investigation_data, mock_ai_client):
        """Test integration with agent coordination system"""
        mock_coordination_result = {
            "coordination_id": "coord_123",
            "status": "success",
            "agents_involved": ["device_analysis", "network_analysis"],
            "data_shared": {"risk_indicators": ["suspicious_login", "unusual_location"]}
        }
        
        with patch.object(orchestrator, 'ai_client', mock_ai_client):
            with patch.object(orchestrator.agent_coordinator, 'coordinate_agents', 
                            return_value=mock_coordination_result) as mock_coord:
                
                await orchestrator.orchestrate_investigation(sample_investigation_data)
                
                # Should have called agent coordination
                mock_coord.assert_called()
                
                # Verify coordination parameters
                call_args = mock_coord.call_args
                assert "source_agent" in call_args[1]
                assert "target_agent" in call_args[1]
                assert "coordination_mode" in call_args[1]


class TestAgentCoordination:
    """Test cases for agent coordination functionality"""
    
    @pytest.fixture
    async def agent_coordinator(self):
        """Create agent coordinator for testing"""
        coordinator = IntelligentAgentCoordinator()
        await coordinator.initialize()
        return coordinator
    
    @pytest.mark.asyncio
    async def test_intelligent_agent_selection(self, agent_coordinator):
        """Test intelligent agent selection based on capability factors"""
        context = {
            "investigation_type": "fraud_detection",
            "data_types": ["device_logs", "network_logs"],
            "complexity_score": 0.8,
            "required_capabilities": ["device_analysis", "network_forensics"]
        }
        
        selected_agent = await agent_coordinator.select_optimal_agent(
            context, 
            exclude_agents=[]
        )
        
        assert selected_agent is not None
        assert selected_agent in agent_coordinator.available_agents
    
    @pytest.mark.asyncio
    async def test_coordination_mode_selection(self, agent_coordinator):
        """Test coordination mode selection logic"""
        # Test parallel coordination for independent tasks
        parallel_context = {
            "task_dependencies": [],
            "resource_requirements": {"cpu": "low", "memory": "low"},
            "urgency": "high"
        }
        
        mode = await agent_coordinator._determine_coordination_mode(parallel_context)
        assert mode in [CoordinationMode.PARALLEL, CoordinationMode.HYBRID]
        
        # Test sequential coordination for dependent tasks
        sequential_context = {
            "task_dependencies": ["agent_a_output"],
            "resource_requirements": {"cpu": "high", "memory": "high"},
            "urgency": "medium"
        }
        
        mode = await agent_coordinator._determine_coordination_mode(sequential_context)
        assert mode in [CoordinationMode.SEQUENTIAL, CoordinationMode.HYBRID]
    
    @pytest.mark.asyncio
    async def test_agent_handoff_with_data_transfer(self, agent_coordinator):
        """Test agent handoff with data transfer"""
        handoff_data = {
            "investigation_findings": {
                "device_risk_score": 0.7,
                "suspicious_patterns": ["unusual_location", "new_device"]
            },
            "metadata": {
                "confidence": 0.8,
                "quality_score": 0.9
            }
        }
        
        result = await agent_coordinator.coordinate_agents(
            source_agent="device_analysis",
            target_agent="network_analysis", 
            coordination_mode=CoordinationMode.SEQUENTIAL,
            investigation_id="test_inv_123",
            handoff_data=handoff_data
        )
        
        assert result["status"] == "success"
        assert "coordination_id" in result
        assert "data_transferred" in result
    
    @pytest.mark.asyncio
    async def test_coordination_failure_recovery(self, agent_coordinator):
        """Test coordination failure recovery mechanisms"""
        # Mock agent failure
        with patch.object(agent_coordinator, '_execute_agent_task', 
                         side_effect=Exception("Agent unavailable")):
            
            result = await agent_coordinator.coordinate_agents(
                source_agent="device_analysis",
                target_agent="unavailable_agent",
                coordination_mode=CoordinationMode.SEQUENTIAL,
                investigation_id="test_inv_123"
            )
            
            # Should have fallback mechanism
            assert result["status"] in ["partial_success", "fallback_success"]
            assert "fallback_strategy" in result


class TestFlowContinuity:
    """Test cases for flow continuity and recovery"""
    
    @pytest.fixture
    async def flow_continuity_manager(self):
        """Create flow continuity manager for testing"""
        manager = FlowContinuityManager()
        await manager.initialize()
        return manager
    
    @pytest.mark.asyncio
    async def test_investigation_checkpoint_creation(self, flow_continuity_manager):
        """Test investigation checkpoint creation"""
        checkpoint_data = {
            "investigation_id": "test_inv_123",
            "current_phase": InvestigationPhase.DATA_COLLECTION,
            "completed_agents": ["device_analysis"],
            "collected_data": {"device_risk": 0.7},
            "progress_percentage": 40.0
        }
        
        checkpoint_id = await flow_continuity_manager.create_checkpoint(checkpoint_data)
        
        assert checkpoint_id is not None
        assert checkpoint_id.startswith("checkpoint_")
    
    @pytest.mark.asyncio
    async def test_investigation_recovery_from_checkpoint(self, flow_continuity_manager):
        """Test investigation recovery from checkpoint"""
        # Create checkpoint first
        checkpoint_data = {
            "investigation_id": "test_inv_123",
            "current_phase": InvestigationPhase.ANALYSIS,
            "completed_agents": ["device_analysis", "network_analysis"],
            "collected_data": {"device_risk": 0.7, "network_risk": 0.8},
            "progress_percentage": 75.0
        }
        
        checkpoint_id = await flow_continuity_manager.create_checkpoint(checkpoint_data)
        
        # Test recovery
        recovered_data = await flow_continuity_manager.recover_from_checkpoint(
            "test_inv_123", 
            checkpoint_id
        )
        
        assert recovered_data is not None
        assert recovered_data["investigation_id"] == "test_inv_123"
        assert recovered_data["progress_percentage"] == 75.0
        assert len(recovered_data["completed_agents"]) == 2
    
    @pytest.mark.asyncio
    async def test_continuity_strategy_selection(self, flow_continuity_manager):
        """Test continuity strategy selection for different failure scenarios"""
        # Test retry strategy for temporary failures
        failure_context = {
            "failure_type": "network_timeout",
            "failure_count": 1,
            "agent_availability": "high",
            "investigation_priority": "high"
        }
        
        strategy = await flow_continuity_manager.select_continuity_strategy(failure_context)
        assert strategy in [ContinuityStrategy.RETRY, ContinuityStrategy.FALLBACK]
        
        # Test fallback strategy for persistent failures
        persistent_failure_context = {
            "failure_type": "agent_unavailable",
            "failure_count": 3,
            "agent_availability": "low", 
            "investigation_priority": "medium"
        }
        
        strategy = await flow_continuity_manager.select_continuity_strategy(persistent_failure_context)
        assert strategy in [ContinuityStrategy.FALLBACK, ContinuityStrategy.DELEGATE]
    
    @pytest.mark.asyncio
    async def test_partial_result_synthesis(self, flow_continuity_manager):
        """Test synthesis of partial investigation results"""
        partial_results = [
            {
                "agent": "device_analysis",
                "status": "completed",
                "findings": {"risk_score": 0.7, "confidence": 0.9},
                "quality_score": 0.85
            },
            {
                "agent": "network_analysis", 
                "status": "partial",
                "findings": {"risk_score": 0.6, "confidence": 0.7},
                "quality_score": 0.75
            },
            {
                "agent": "logs_analysis",
                "status": "failed",
                "error": "Service unavailable"
            }
        ]
        
        synthesized_result = await flow_continuity_manager.synthesize_partial_results(
            "test_inv_123",
            partial_results
        )
        
        assert synthesized_result is not None
        assert "overall_risk_score" in synthesized_result
        assert "confidence_score" in synthesized_result
        assert "completion_percentage" in synthesized_result
        assert synthesized_result["completion_percentage"] > 0
        assert synthesized_result["completion_percentage"] < 100  # Not complete due to failures


class TestOrchestratorResilience:
    """Test cases for bulletproof exception handling and resilience"""
    
    @pytest.fixture
    def exception_handler(self):
        """Create exception handler for testing"""
        return BulletproofExceptionHandler()
    
    @pytest.mark.asyncio
    async def test_universal_exception_transformation(self, exception_handler):
        """Test universal exception transformation to recoverable format"""
        # Test network exception
        network_error = ConnectionError("Unable to connect to service")
        transformed = await exception_handler.transform_exception(
            network_error, 
            "network_operation",
            {"service": "device_analysis"}
        )
        
        assert transformed["category"] == "network"
        assert transformed["severity"] in ["medium", "high"]
        assert transformed["recoverable"] is True
        assert "retry" in transformed["recovery_strategies"]
        
        # Test authentication exception
        auth_error = PermissionError("Authentication failed")
        transformed = await exception_handler.transform_exception(
            auth_error,
            "api_call", 
            {"service": "ai_client"}
        )
        
        assert transformed["category"] == "authentication"
        assert transformed["recoverable"] is True
        assert "refresh_token" in transformed["recovery_strategies"]
    
    @pytest.mark.asyncio 
    async def test_circuit_breaker_functionality(self, exception_handler):
        """Test circuit breaker pattern for cascading failure prevention"""
        service_name = "test_service"
        
        # Simulate multiple failures to trigger circuit breaker
        for i in range(exception_handler.circuit_breaker_threshold + 1):
            await exception_handler.record_failure(service_name)
        
        # Circuit should be open now
        assert exception_handler.is_circuit_open(service_name) is True
        
        # Should prevent further calls
        with pytest.raises(Exception) as exc_info:
            await exception_handler.execute_with_circuit_breaker(
                service_name,
                lambda: asyncio.sleep(0.1)  # Mock operation
            )
        
        assert "circuit breaker" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_resilient_operation_decorator(self, exception_handler):
        """Test resilient operation decorator functionality"""
        call_count = 0
        
        @exception_handler.resilient_orchestrator_operation
        async def failing_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Temporary failure")
            return {"status": "success", "attempt": call_count}
        
        result = await failing_operation()
        
        assert result["status"] == "success"
        assert call_count == 3  # Should have retried 2 times before success
    
    @pytest.mark.asyncio
    async def test_exception_handling_with_fallback(self, exception_handler):
        """Test exception handling with automatic fallback execution"""
        primary_operation = AsyncMock(side_effect=Exception("Primary failed"))
        fallback_operation = AsyncMock(return_value={"status": "fallback_success"})
        
        result = await exception_handler.execute_with_fallback(
            primary_operation,
            fallback_operation,
            "test_operation"
        )
        
        assert result["status"] == "fallback_success"
        primary_operation.assert_called_once()
        fallback_operation.assert_called_once()


class TestOrchestratorMonitoring:
    """Test cases for monitoring and alerting system"""
    
    @pytest.fixture
    async def monitoring_system(self):
        """Create monitoring system for testing"""
        monitoring = OrchestratorMonitoring()
        await monitoring.start_monitoring()
        yield monitoring
        await monitoring.stop_monitoring()
    
    @pytest.mark.asyncio
    async def test_metric_recording(self, monitoring_system):
        """Test metric recording functionality"""
        from app.service.monitoring.orchestrator_monitoring import MonitoringMetric
        
        await monitoring_system.record_metric(
            MonitoringMetric.DECISION_LATENCY,
            1500.0,  # 1.5 seconds
            investigation_id="test_inv_123"
        )
        
        # Verify metric was recorded
        metrics_history = monitoring_system.metrics_history[MonitoringMetric.DECISION_LATENCY]
        assert len(metrics_history) == 1
        assert metrics_history[0]["value"] == 1500.0
    
    @pytest.mark.asyncio
    async def test_alert_raising(self, monitoring_system):
        """Test alert raising functionality"""
        alert_id = await monitoring_system.raise_alert(
            alert_type=AlertType.PERFORMANCE_DEGRADATION,
            severity=AlertSeverity.HIGH,
            title="High Decision Latency Detected",
            description="Decision latency exceeded 5 seconds threshold",
            investigation_id="test_inv_123",
            metric_values={"decision_latency_ms": 6000},
            threshold_values={"warning_threshold": 1000, "critical_threshold": 5000}
        )
        
        assert alert_id is not None
        assert alert_id in monitoring_system.active_alerts
        
        alert = monitoring_system.active_alerts[alert_id]
        assert alert.alert_type == AlertType.PERFORMANCE_DEGRADATION
        assert alert.severity == AlertSeverity.HIGH
    
    @pytest.mark.asyncio
    async def test_alert_acknowledgment_and_resolution(self, monitoring_system):
        """Test alert acknowledgment and resolution workflow"""
        # Raise an alert
        alert_id = await monitoring_system.raise_alert(
            alert_type=AlertType.INVESTIGATION_STALLED,
            severity=AlertSeverity.MEDIUM,
            title="Investigation Stalled",
            description="Investigation has not progressed for 10 minutes"
        )
        
        # Acknowledge alert
        ack_result = await monitoring_system.acknowledge_alert(alert_id, "operator_123")
        assert ack_result is True
        assert monitoring_system.active_alerts[alert_id].acknowledged is True
        
        # Resolve alert
        resolve_result = await monitoring_system.resolve_alert(alert_id, "operator_123")
        assert resolve_result is True
        assert alert_id not in monitoring_system.active_alerts
    
    @pytest.mark.asyncio
    async def test_health_check_system(self, monitoring_system):
        """Test health check system functionality"""
        # Wait for health checks to run
        await asyncio.sleep(1)
        
        health_status = await monitoring_system.get_system_health()
        
        assert "overall_status" in health_status
        assert health_status["overall_status"] in ["healthy", "warning", "critical", "unknown"]
        assert "health_checks" in health_status
        assert "metrics_summary" in health_status
        assert "active_alerts" in health_status
    
    @pytest.mark.asyncio
    async def test_threshold_monitoring(self, monitoring_system):
        """Test automatic threshold monitoring and alerting"""
        from app.service.monitoring.orchestrator_monitoring import MonitoringMetric
        
        # Record metrics that exceed thresholds
        for _ in range(5):
            await monitoring_system.record_metric(
                MonitoringMetric.DECISION_LATENCY,
                6000.0,  # Exceeds critical threshold of 5000ms
                investigation_id="test_inv_123"
            )
        
        # Wait for alert evaluation
        await asyncio.sleep(1)
        
        # Should have raised threshold alert
        threshold_alerts = [
            alert for alert in monitoring_system.active_alerts.values()
            if alert.alert_type == AlertType.THRESHOLD_EXCEEDED
        ]
        
        assert len(threshold_alerts) > 0
        alert = threshold_alerts[0]
        assert alert.severity == AlertSeverity.CRITICAL


@pytest.mark.integration
class TestOrchestratorIntegration:
    """Integration tests for complete orchestrator system"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_investigation_orchestration(self, sample_investigation_data):
        """Test complete end-to-end investigation orchestration"""
<<<<<<< HEAD
        orchestrator = AutonomousInvestigationOrchestrator()
=======
        orchestrator = StructuredInvestigationOrchestrator()
>>>>>>> 001-modify-analyzer-method
        await orchestrator.initialize()
        
        # Mock AI responses for different phases
        ai_responses = [
            {
                "decision": "initialize_investigation",
                "reasoning": "Starting comprehensive fraud investigation",
                "confidence": 0.95,
                "next_agents": ["device_analysis"],
                "coordination_strategy": "sequential"
            },
            {
                "decision": "expand_investigation", 
                "reasoning": "Device analysis shows suspicious patterns",
                "confidence": 0.85,
                "next_agents": ["network_analysis", "logs_analysis"],
                "coordination_strategy": "parallel"
            },
            {
                "decision": "complete_investigation",
                "reasoning": "All agents completed successfully",
                "confidence": 0.92,
                "final_risk_score": 0.78
            }
        ]
        
        call_count = 0
        
        def mock_ai_response(*args, **kwargs):
            nonlocal call_count
            response = Mock()
            response.content = [Mock(text=json.dumps(ai_responses[min(call_count, len(ai_responses) - 1)]))]
            call_count += 1
            return response
        
        with patch.object(orchestrator, 'ai_client') as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_ai_response)
            
            result = await orchestrator.orchestrate_investigation(sample_investigation_data)
            
            assert result is not None
            assert result["status"] == "completed"
            assert "final_risk_score" in result
            assert len(result["decisions"]) >= 2  # Should have made multiple decisions
            assert result["investigation_id"] == sample_investigation_data["investigation_id"]
    
    @pytest.mark.asyncio
    async def test_investigation_with_agent_failures(self, sample_investigation_data):
        """Test investigation handling when agents fail"""
<<<<<<< HEAD
        orchestrator = AutonomousInvestigationOrchestrator()
=======
        orchestrator = StructuredInvestigationOrchestrator()
>>>>>>> 001-modify-analyzer-method
        await orchestrator.initialize()
        
        # Mock AI client
        mock_ai_response = {
            "decision": "proceed_with_available_agents",
            "reasoning": "Some agents failed, continuing with available ones",
            "confidence": 0.7,
            "next_agents": ["logs_analysis"],
            "coordination_strategy": "fallback"
        }
        
        with patch.object(orchestrator, 'ai_client') as mock_ai:
            mock_ai.messages.create = AsyncMock(return_value=Mock(
                content=[Mock(text=json.dumps(mock_ai_response))]
            ))
            
            # Mock agent failure
            with patch.object(orchestrator.agent_coordinator, 'coordinate_agents',
                            side_effect=[Exception("Agent failed"), {"status": "success"}]):
                
                result = await orchestrator.orchestrate_investigation(sample_investigation_data)
                
                assert result is not None
                assert result["status"] in ["completed", "partial_completion"]
                # Should have recovery information
                assert any("fallback" in decision.get("reasoning", "").lower() 
                          for decision in result.get("decisions", []))
    
    @pytest.mark.asyncio
    async def test_monitoring_during_investigation(self, sample_investigation_data):
        """Test monitoring system during actual investigation"""
<<<<<<< HEAD
        orchestrator = AutonomousInvestigationOrchestrator()
=======
        orchestrator = StructuredInvestigationOrchestrator()
>>>>>>> 001-modify-analyzer-method
        await orchestrator.initialize()
        
        # Start monitoring
        monitoring = orchestrator.monitoring
        await monitoring.start_monitoring()
        
        try:
            # Mock AI response
            mock_ai_response = {
                "decision": "complete_investigation",
                "reasoning": "Test investigation completed",
                "confidence": 0.9
            }
            
            with patch.object(orchestrator, 'ai_client') as mock_ai:
                mock_ai.messages.create = AsyncMock(return_value=Mock(
                    content=[Mock(text=json.dumps(mock_ai_response))]
                ))
                
                await orchestrator.orchestrate_investigation(sample_investigation_data)
            
            # Wait for metrics to be recorded
            await asyncio.sleep(1)
            
            # Check that metrics were recorded
            health_status = await monitoring.get_system_health()
            assert health_status["overall_status"] in ["healthy", "warning", "critical", "unknown"]
            
            # Should have some metrics recorded
            metrics_summary = health_status.get("metrics_summary", {})
            assert len(metrics_summary) > 0
            
        finally:
            await monitoring.stop_monitoring()


if __name__ == "__main__":
    # Run tests with coverage
    pytest.main([
        __file__,
        "-v",
        "--cov=app.service.agent",
        "--cov=app.service.monitoring",
        "--cov=app.service.dashboard",
        "--cov-report=html",
        "--cov-report=term-missing",
        "--cov-fail-under=85"
    ])
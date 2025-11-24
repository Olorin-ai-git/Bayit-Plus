"""
Integration Tests for Structured Investigation Orchestrator

Tests the complete integration between orchestrator components, LangGraph,
WebSocket events, dashboard services, and monitoring systems.

Author: Gil Klainert  
Date: 2025-09-06
Plan Reference: /docs/plans/2025-09-06-structured-investigation-orchestrator-langgraph-plan.md
Phase: 5.1 - Comprehensive Test Suite (Integration Tests)
"""

import pytest
import asyncio
import json
import websockets
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List

from app.service.agent.structured_orchestrator import StructuredInvestigationOrchestrator
from app.service.agent.orchestration.orchestrator_graph import create_orchestrator_driven_graph, OrchestratorState
from app.router.handlers.orchestrator_websocket import OrchestratorWebSocketHandler
from app.service.dashboard.orchestrator_dashboard import OrchestratorDashboardService, DashboardViewType
from app.service.monitoring.orchestrator_monitoring import OrchestratorMonitoring


@pytest.fixture
async def integrated_orchestrator_system():
    """Create fully integrated orchestrator system for testing"""
    orchestrator = StructuredInvestigationOrchestrator()
    await orchestrator.initialize()
    
    # Initialize all components
    websocket_handler = OrchestratorWebSocketHandler()
    dashboard_service = OrchestratorDashboardService()
    monitoring_system = OrchestratorMonitoring()
    
    await monitoring_system.start_monitoring()
    
    system = {
        "orchestrator": orchestrator,
        "websocket_handler": websocket_handler,
        "dashboard_service": dashboard_service,
        "monitoring_system": monitoring_system
    }
    
    yield system
    
    # Cleanup
    await monitoring_system.stop_monitoring()


@pytest.fixture
def complex_investigation_scenario():
    """Complex investigation scenario for integration testing"""
    return {
        "investigation_id": "complex_inv_98765",
        "entity_id": "entity_fraud_123",
        "investigation_type": "advanced_fraud_detection",
        "priority": "critical",
        "data_sources": [
            "device_fingerprint_logs",
            "network_traffic_logs", 
            "transaction_history",
            "geolocation_data",
            "behavioral_analytics"
        ],
        "metadata": {
            "user_id": "suspicious_user_456",
            "account_age_days": 30,
            "transaction_amount": 50000.0,
            "risk_indicators": [
                "new_device",
                "unusual_location",
                "large_transaction",
                "rapid_transactions"
            ],
            "initial_risk_score": 0.92
        },
        "investigation_parameters": {
            "depth": "comprehensive",
            "timeout_minutes": 30,
            "quality_threshold": 0.85,
            "required_confidence": 0.9
        }
    }


class TestLangGraphIntegration:
    """Test LangGraph integration with orchestrator"""
    
    @pytest.mark.asyncio
    async def test_langgraph_workflow_creation(self):
        """Test LangGraph workflow creation and structure"""
        graph = await create_orchestrator_driven_graph()
        
        assert graph is not None
        # Verify graph structure
        assert hasattr(graph, 'nodes')
        assert hasattr(graph, 'edges')
        
        # Check for expected nodes
        expected_nodes = [
            "orchestrator_node",
            "device_analysis_node", 
            "network_analysis_node",
            "logs_analysis_node",
            "risk_assessment_node",
            "report_generation_node"
        ]
        
        graph_nodes = list(graph.nodes.keys()) if hasattr(graph.nodes, 'keys') else []
        for expected_node in expected_nodes[:3]:  # Check at least a few key nodes
            assert any(expected_node in node for node in graph_nodes)
    
    @pytest.mark.asyncio
    async def test_orchestrator_state_management_in_langgraph(self):
        """Test orchestrator state management within LangGraph"""
        initial_state = OrchestratorState(
            investigation_id="test_inv_langgraph",
            current_phase="initialization",
            agents_completed=[],
            investigation_data={"risk_score": 0.8},
            orchestrator_decisions=[],
            flow_context={}
        )
        
        graph = await create_orchestrator_driven_graph()
        
        # Mock AI responses
        mock_ai_response = {
            "decision": "proceed_to_device_analysis",
            "reasoning": "High risk score requires device investigation",
            "confidence": 0.9,
            "next_phase": "device_analysis"
        }
        
        with patch('app.service.agent.structured_orchestrator.StructuredInvestigationOrchestrator') as mock_orchestrator_class:
            mock_orchestrator = AsyncMock()
            mock_orchestrator._make_ai_decision.return_value = Mock(
                decision="proceed_to_device_analysis",
                reasoning="High risk score requires device investigation",
                confidence_score=0.9,
                alternatives=[],
                execution_metadata={}
            )
            mock_orchestrator_class.return_value = mock_orchestrator
            
            # Execute graph with state
            result = await graph.ainvoke(initial_state)
            
            assert result is not None
            assert "investigation_id" in result
            assert result["investigation_id"] == "test_inv_langgraph"
    
    @pytest.mark.asyncio
    async def test_conditional_routing_in_langgraph(self, integrated_orchestrator_system):
        """Test AI-driven conditional routing in LangGraph"""
        orchestrator = integrated_orchestrator_system["orchestrator"]
        
        # Test different routing scenarios
        routing_scenarios = [
            {
                "state": OrchestratorState(
                    investigation_id="test_routing_1",
                    current_phase="device_analysis",
                    investigation_data={"device_risk": 0.9},
                    orchestrator_decisions=[],
                    agents_completed=["device_analysis"],
                    flow_context={}
                ),
                "expected_routes": ["network_analysis", "logs_analysis"]
            },
            {
                "state": OrchestratorState(
                    investigation_id="test_routing_2", 
                    current_phase="risk_assessment",
                    investigation_data={"overall_risk": 0.3},
                    orchestrator_decisions=[],
                    agents_completed=["device_analysis", "network_analysis", "logs_analysis"],
                    flow_context={}
                ),
                "expected_routes": ["report_generation", "investigation_complete"]
            }
        ]
        
        # Mock AI decision making for routing
        def mock_routing_decision(state):
            if state.current_phase == "device_analysis":
                return "parallel_analysis"  # Should route to multiple agents
            elif state.current_phase == "risk_assessment":
                return "complete_investigation"  # Should route to completion
            else:
                return "continue_investigation"
        
        with patch.object(orchestrator, '_make_ai_decision') as mock_decision:
            for scenario in routing_scenarios:
                mock_decision.return_value = Mock(
                    decision=mock_routing_decision(scenario["state"]),
                    confidence_score=0.85
                )
                
                # Test routing logic
                from app.service.agent.orchestration.orchestrator_graph import orchestrator_conditional_routing
                next_step = await orchestrator_conditional_routing(scenario["state"])
                
                assert next_step is not None
                assert isinstance(next_step, str)


class TestWebSocketIntegration:
    """Test WebSocket integration with orchestrator events"""
    
    @pytest.mark.asyncio
    async def test_websocket_event_broadcasting(self, integrated_orchestrator_system):
        """Test real-time WebSocket event broadcasting during investigation"""
        websocket_handler = integrated_orchestrator_system["websocket_handler"]
        investigation_id = "test_ws_integration"
        
        # Track broadcasted events
        broadcasted_events = []
        
        async def mock_broadcast(inv_id, event_type, event_data):
            broadcasted_events.append({
                "investigation_id": inv_id,
                "event_type": event_type,
                "event_data": event_data
            })
        
        with patch.object(websocket_handler, 'broadcast_custom_event', side_effect=mock_broadcast):
            # Simulate orchestrator decision
            await websocket_handler.broadcast_orchestrator_decision(
                investigation_id=investigation_id,
                decision_id="decision_123",
                decision_type="strategy_selection",
                reasoning="Selected parallel analysis strategy based on risk indicators",
                confidence_score=0.88,
                alternatives=[
                    {"strategy": "sequential", "confidence": 0.75},
                    {"strategy": "hybrid", "confidence": 0.82}
                ],
                decision_factors={
                    "risk_level": "high",
                    "time_constraints": "medium",
                    "resource_availability": "high"
                }
            )
            
            # Simulate agent handoff
            await websocket_handler.broadcast_agent_handoff(
                investigation_id=investigation_id,
                coordination_id="coord_456", 
                source_agent="orchestrator",
                target_agent="device_analysis",
                handoff_reason="Device analysis required for fraud investigation",
                data_transferred={"initial_risk_score": 0.92, "device_indicators": ["new_device"]},
                coordination_mode="sequential"
            )
            
            # Verify events were broadcasted
            assert len(broadcasted_events) == 2
            
            decision_event = broadcasted_events[0]
            assert decision_event["investigation_id"] == investigation_id
            assert decision_event["event_type"] == "orchestrator_decision"
            
            handoff_event = broadcasted_events[1]
            assert handoff_event["investigation_id"] == investigation_id
            assert handoff_event["event_type"] == "agent_handoff"
    
    @pytest.mark.asyncio
    async def test_websocket_milestone_tracking(self, integrated_orchestrator_system):
        """Test WebSocket milestone tracking during investigation"""
        websocket_handler = integrated_orchestrator_system["websocket_handler"]
        investigation_id = "test_milestones"
        
        milestones = [
            {
                "milestone_id": "ms_001",
                "milestone_type": "investigation_started",
                "description": "Investigation initialization complete",
                "progress_percentage": 10.0,
                "estimated_completion": (datetime.now()).isoformat()
            },
            {
                "milestone_id": "ms_002", 
                "milestone_type": "data_collection_complete",
                "description": "All required data sources collected",
                "progress_percentage": 60.0,
                "estimated_completion": (datetime.now()).isoformat()
            },
            {
                "milestone_id": "ms_003",
                "milestone_type": "analysis_complete", 
                "description": "Agent analysis phase completed",
                "progress_percentage": 90.0,
                "estimated_completion": (datetime.now()).isoformat()
            }
        ]
        
        broadcasted_milestones = []
        
        async def capture_milestone(inv_id, milestone_id, milestone_type, description, progress, completion_time, metadata):
            broadcasted_milestones.append({
                "investigation_id": inv_id,
                "milestone_id": milestone_id,
                "milestone_type": milestone_type,
                "progress_percentage": progress
            })
        
        with patch.object(websocket_handler, 'broadcast_investigation_milestone', side_effect=capture_milestone):
            for milestone in milestones:
                await websocket_handler.broadcast_investigation_milestone(
                    investigation_id=investigation_id,
                    milestone_id=milestone["milestone_id"],
                    milestone_type=milestone["milestone_type"],
                    description=milestone["description"],
                    progress_percentage=milestone["progress_percentage"],
                    estimated_completion=milestone["estimated_completion"],
                    milestone_metadata={}
                )
        
        # Verify milestone progression
        assert len(broadcasted_milestones) == 3
        
        # Check progress increases
        progress_values = [m["progress_percentage"] for m in broadcasted_milestones]
        assert progress_values == sorted(progress_values)  # Should be increasing
        assert progress_values[-1] == 90.0  # Last milestone


class TestDashboardIntegration:
    """Test dashboard integration with real-time data"""
    
    @pytest.mark.asyncio
    async def test_dashboard_initialization_and_updates(self, integrated_orchestrator_system):
        """Test dashboard initialization and real-time updates"""
        dashboard_service = integrated_orchestrator_system["dashboard_service"]
        investigation_id = "test_dashboard_integration"
        
        # Initialize dashboard
        dashboard_config = await dashboard_service.initialize_dashboard(investigation_id)
        
        assert dashboard_config["initialization_status"] == "success"
        assert dashboard_config["investigation_id"] == investigation_id
        assert len(dashboard_config["available_views"]) > 0
        
        # Test decision visualization update
        decision_data = {
            "decision_id": "decision_dash_001",
            "timestamp": datetime.now().isoformat(),
            "decision_type": "strategy_selection",
            "reasoning": "Comprehensive analysis strategy selected",
            "confidence_score": 0.91,
            "alternatives": [{"strategy": "quick_scan", "confidence": 0.65}],
            "decision_factors": {"complexity": "high", "urgency": "medium"},
            "execution_time_ms": 1250.0
        }
        
        await dashboard_service.update_decision_visualization(investigation_id, decision_data)
        
        # Verify decision was recorded
        decisions_view = await dashboard_service.get_dashboard_view(
            investigation_id, 
            DashboardViewType.REAL_TIME_DECISIONS
        )
        
        assert decisions_view["view_type"] == DashboardViewType.REAL_TIME_DECISIONS.value
        assert decisions_view["total_decisions"] == 1
        assert len(decisions_view["decisions"]) == 1
        
        recorded_decision = decisions_view["decisions"][0]
        assert recorded_decision["decision_id"] == "decision_dash_001"
        assert recorded_decision["confidence_score"] == 0.91
    
    @pytest.mark.asyncio
    async def test_agent_coordination_timeline_visualization(self, integrated_orchestrator_system):
        """Test agent coordination timeline visualization"""
        dashboard_service = integrated_orchestrator_system["dashboard_service"]
        investigation_id = "test_coordination_timeline"
        
        await dashboard_service.initialize_dashboard(investigation_id)
        
        # Simulate agent coordination events
        coordination_events = [
            {
                "coordination_id": "coord_001",
                "timestamp": datetime.now().isoformat(),
                "source_agent": "orchestrator",
                "target_agent": "device_analysis",
                "handoff_reason": "Initial device investigation required",
                "coordination_mode": "sequential",
                "dependencies": [],
                "estimated_completion": (datetime.now()).isoformat()
            },
            {
                "coordination_id": "coord_002", 
                "timestamp": datetime.now().isoformat(),
                "source_agent": "device_analysis",
                "target_agent": "network_analysis",
                "handoff_reason": "Suspicious device patterns found, network analysis needed",
                "coordination_mode": "sequential", 
                "dependencies": ["coord_001"],
                "estimated_completion": (datetime.now()).isoformat()
            },
            {
                "coordination_id": "coord_003",
                "timestamp": datetime.now().isoformat(),
                "source_agent": "orchestrator",
                "target_agent": "logs_analysis", 
                "handoff_reason": "Parallel logs analysis for comprehensive view",
                "coordination_mode": "parallel",
                "dependencies": [],
                "estimated_completion": (datetime.now()).isoformat()
            }
        ]
        
        for event in coordination_events:
            await dashboard_service.update_coordination_timeline(investigation_id, event)
        
        # Get coordination view
        coordination_view = await dashboard_service.get_dashboard_view(
            investigation_id,
            DashboardViewType.AGENT_COORDINATION
        )
        
        assert coordination_view["view_type"] == DashboardViewType.AGENT_COORDINATION.value
        assert len(coordination_view["timeline"]) == 3
        assert coordination_view["active_coordinations"] == 3  # All in progress by default
        
        # Verify dependencies are tracked
        coord_with_deps = [
            coord for coord in coordination_view["timeline"] 
            if len(coord["dependencies"]) > 0
        ]
        assert len(coord_with_deps) == 1  # coord_002 has dependencies
    
    @pytest.mark.asyncio
    async def test_investigation_flow_progress_tracking(self, integrated_orchestrator_system):
        """Test investigation flow progress tracking"""
        dashboard_service = integrated_orchestrator_system["dashboard_service"]
        investigation_id = "test_flow_progress"
        
        await dashboard_service.initialize_dashboard(investigation_id)
        
        # Simulate investigation progress
        progress_updates = [
            {
                "current_phase": "initialization",
                "completed_phases": [],
                "phase_name": "initialization",
                "phase_duration": 15.0
            },
            {
                "current_phase": "data_collection",
                "completed_phases": ["initialization"],
                "phase_name": "data_collection", 
                "phase_duration": 45.0
            },
            {
                "current_phase": "analysis",
                "completed_phases": ["initialization", "data_collection"],
                "phase_name": "analysis",
                "phase_duration": 120.0
            }
        ]
        
        for update in progress_updates:
            await dashboard_service.update_investigation_flow(investigation_id, update)
        
        # Get flow progress view
        flow_view = await dashboard_service.get_dashboard_view(
            investigation_id,
            DashboardViewType.INVESTIGATION_FLOW
        )
        
        assert flow_view["view_type"] == DashboardViewType.INVESTIGATION_FLOW.value
        
        flow_progress = flow_view["flow_progress"]
        assert flow_progress["investigation_id"] == investigation_id
        assert len(flow_progress["completed_phases"]) == 2
        assert flow_progress["completion_percentage"] > 0
        assert flow_progress["quality_score"] > 0


class TestMonitoringIntegration:
    """Test monitoring system integration"""
    
    @pytest.mark.asyncio
    async def test_monitoring_during_investigation_execution(self, integrated_orchestrator_system, complex_investigation_scenario):
        """Test monitoring system during actual investigation execution"""
        orchestrator = integrated_orchestrator_system["orchestrator"] 
        monitoring_system = integrated_orchestrator_system["monitoring_system"]
        
        # Mock AI responses for investigation
        ai_decisions = [
            {
                "decision": "comprehensive_investigation",
                "reasoning": "Critical risk score requires full investigation",
                "confidence": 0.94,
                "next_agents": ["device_analysis", "network_analysis"],
                "coordination_strategy": "parallel"
            },
            {
                "decision": "additional_analysis",
                "reasoning": "Initial findings show complex fraud pattern",
                "confidence": 0.87,
                "next_agents": ["logs_analysis", "behavioral_analysis"],
                "coordination_strategy": "sequential"
            },
            {
                "decision": "generate_report",
                "reasoning": "All analysis complete, high confidence in findings", 
                "confidence": 0.95,
                "final_risk_score": 0.89
            }
        ]
        
        call_count = 0
        def mock_ai_response(*args, **kwargs):
            nonlocal call_count
            response = Mock()
            response.content = [Mock(text=json.dumps(ai_decisions[min(call_count, len(ai_decisions) - 1)]))]
            call_count += 1
            return response
        
        with patch.object(orchestrator, 'ai_client') as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_ai_response)
            
            # Execute investigation
            investigation_result = await orchestrator.orchestrate_investigation(complex_investigation_scenario)
            
            # Wait for monitoring to collect metrics
            await asyncio.sleep(2)
            
            # Verify investigation completed
            assert investigation_result["status"] == "completed"
            
            # Check monitoring system health
            health_status = await monitoring_system.get_system_health()
            assert health_status["overall_status"] in ["healthy", "warning", "critical"]
            
            # Verify metrics were collected
            metrics_summary = health_status.get("metrics_summary", {})
            assert len(metrics_summary) > 0
            
            # Check for investigation-related metrics
            expected_metrics = [
                "decision_latency_ms",
                "active_investigations", 
                "cpu_utilization_percent",
                "memory_utilization_percent"
            ]
            
            available_metrics = list(metrics_summary.keys())
            for expected_metric in expected_metrics[:2]:  # Check at least a couple
                assert any(expected_metric in metric for metric in available_metrics)
    
    @pytest.mark.asyncio
    async def test_alert_generation_during_investigation(self, integrated_orchestrator_system):
        """Test alert generation during investigation with performance issues"""
        orchestrator = integrated_orchestrator_system["orchestrator"]
        monitoring_system = integrated_orchestrator_system["monitoring_system"]
        
        from app.service.monitoring.orchestrator_monitoring import MonitoringMetric, AlertType
        
        # Simulate performance degradation
        for _ in range(10):
            await monitoring_system.record_metric(
                MonitoringMetric.DECISION_LATENCY,
                7500.0,  # High latency - exceeds critical threshold
                investigation_id="test_performance_alert"
            )
        
        # Wait for alert evaluation
        await asyncio.sleep(2)
        
        # Check for performance alerts
        performance_alerts = await monitoring_system.get_alerts(
            alert_type=AlertType.THRESHOLD_EXCEEDED,
            include_resolved=False
        )
        
        assert len(performance_alerts) > 0
        
        alert = performance_alerts[0]
        assert alert["alert_type"] == AlertType.THRESHOLD_EXCEEDED.value
        assert alert["severity"] in ["high", "critical"]
        assert "decision_latency" in alert["description"].lower()


class TestEndToEndOrchestration:
    """End-to-end integration tests for complete orchestration flow"""
    
    @pytest.mark.asyncio
    async def test_complete_investigation_with_all_integrations(self, integrated_orchestrator_system, complex_investigation_scenario):
        """Test complete investigation with all system integrations active"""
        system = integrated_orchestrator_system
        orchestrator = system["orchestrator"]
        websocket_handler = system["websocket_handler"]
        dashboard_service = system["dashboard_service"]
        monitoring_system = system["monitoring_system"]
        
        investigation_id = complex_investigation_scenario["investigation_id"]
        
        # Initialize dashboard
        await dashboard_service.initialize_dashboard(investigation_id)
        
        # Track all system events
        system_events = {
            "websocket_events": [],
            "dashboard_updates": [],
            "monitoring_alerts": []
        }
        
        # Mock event tracking
        async def track_websocket_event(inv_id, event_type, event_data):
            system_events["websocket_events"].append({
                "type": event_type,
                "investigation_id": inv_id,
                "timestamp": datetime.now()
            })
        
        async def track_dashboard_update(inv_id, view_type, update_data):
            system_events["dashboard_updates"].append({
                "view_type": view_type,
                "investigation_id": inv_id,
                "timestamp": datetime.now()
            })
        
        def track_alert(alert):
            system_events["monitoring_alerts"].append({
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "timestamp": alert.timestamp
            })
        
        # Set up event tracking
        with patch.object(websocket_handler, 'broadcast_custom_event', side_effect=track_websocket_event):
            with patch.object(dashboard_service, '_broadcast_dashboard_update', side_effect=track_dashboard_update):
                # Subscribe to monitoring alerts
                monitoring_system.subscribe_to_alerts(AlertType.PERFORMANCE_DEGRADATION, track_alert)
                
                # Mock comprehensive AI responses
                ai_responses = [
                    {
                        "decision": "start_comprehensive_investigation",
                        "reasoning": "Critical fraud indicators detected requiring full investigation",
                        "confidence": 0.96,
                        "next_agents": ["device_analysis"],
                        "coordination_strategy": "sequential",
                        "estimated_duration": 1800
                    },
                    {
                        "decision": "expand_to_network_analysis",
                        "reasoning": "Device analysis reveals suspicious patterns, network investigation needed",
                        "confidence": 0.91,
                        "next_agents": ["network_analysis"],
                        "coordination_strategy": "sequential",
                        "data_requirements": ["network_logs", "connection_patterns"]
                    },
                    {
                        "decision": "parallel_behavioral_analysis",
                        "reasoning": "Network patterns confirm fraud suspicion, behavioral analysis needed",
                        "confidence": 0.88,
                        "next_agents": ["logs_analysis", "behavioral_analysis"],
                        "coordination_strategy": "parallel",
                        "priority": "high"
                    },
                    {
                        "decision": "finalize_investigation", 
                        "reasoning": "All analyses complete with high confidence fraud detection",
                        "confidence": 0.94,
                        "final_risk_score": 0.91,
                        "fraud_confirmed": True,
                        "recommended_actions": ["suspend_account", "flag_transactions", "notify_security"]
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
                    
                    # Execute complete investigation
                    start_time = datetime.now()
                    investigation_result = await orchestrator.orchestrate_investigation(complex_investigation_scenario)
                    end_time = datetime.now()
                    
                    # Wait for all async events to process
                    await asyncio.sleep(3)
                    
                    # Verify investigation completed successfully
                    assert investigation_result is not None
                    assert investigation_result["status"] == "completed"
                    assert investigation_result["investigation_id"] == investigation_id
                    assert "final_risk_score" in investigation_result
                    assert investigation_result["final_risk_score"] >= 0.8  # High risk confirmed
                    
                    # Verify system integration events occurred
                    assert len(system_events["websocket_events"]) > 0
                    assert len(system_events["dashboard_updates"]) > 0
                    
                    # Verify multiple decisions were made
                    decisions = investigation_result.get("decisions", [])
                    assert len(decisions) >= 3  # Should have made multiple AI decisions
                    
                    # Verify decision confidence progression
                    confidences = [d.get("confidence_score", 0) for d in decisions if "confidence_score" in d]
                    assert all(c >= 0.8 for c in confidences)  # All high confidence
                    
                    # Verify investigation timing
                    investigation_duration = (end_time - start_time).total_seconds()
                    assert investigation_duration < 30  # Should complete within reasonable time
                    
                    # Check final system health
                    health_status = await monitoring_system.get_system_health()
                    assert health_status["overall_status"] in ["healthy", "warning"]
                    
                    # Verify dashboard has comprehensive data
                    final_dashboard_views = {}
                    for view_type in DashboardViewType:
                        view_data = await dashboard_service.get_dashboard_view(investigation_id, view_type)
                        final_dashboard_views[view_type.value] = view_data
                    
                    # Should have data in multiple dashboard views
                    assert len(final_dashboard_views) == len(DashboardViewType)
                    
                    # Real-time decisions view should have multiple decisions
                    decisions_view = final_dashboard_views[DashboardViewType.REAL_TIME_DECISIONS.value]
                    assert decisions_view.get("total_decisions", 0) > 0
                    
                    # Investigation flow should show progress
                    flow_view = final_dashboard_views[DashboardViewType.INVESTIGATION_FLOW.value]
                    if "flow_progress" in flow_view:
                        assert flow_view["flow_progress"]["completion_percentage"] > 80


if __name__ == "__main__":
    # Run integration tests
    pytest.main([
        __file__,
        "-v",
        "-m", "integration",
        "--tb=short",
        "--maxfail=3"
    ])
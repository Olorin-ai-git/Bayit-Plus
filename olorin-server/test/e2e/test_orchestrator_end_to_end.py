"""
End-to-End Tests for Structured Investigation Orchestrator

Complete end-to-end tests simulating real investigation scenarios with
external service interactions, performance validation, and production workflows.

Author: Gil Klainert
Date: 2025-09-06
Plan Reference: /docs/plans/2025-09-06-structured-investigation-orchestrator-langgraph-plan.md
Phase: 5.1 - Comprehensive Test Suite (End-to-End Tests)
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.service.agent.orchestration.orchestrator_graph import (
    create_orchestrator_driven_graph,
)
from app.service.agent.structured_orchestrator import (
    StructuredInvestigationOrchestrator,
)
from app.service.monitoring.orchestrator_monitoring import (
    MonitoringMetric,
    OrchestratorMonitoring,
)


@pytest.fixture
async def production_orchestrator_system():
    """Create production-like orchestrator system for E2E testing"""
    orchestrator = StructuredInvestigationOrchestrator()
    monitoring = OrchestratorMonitoring()

    await orchestrator.initialize()
    await monitoring.start_monitoring()

    # Create LangGraph workflow
    langgraph_workflow = await create_orchestrator_driven_graph()

    system = {
        "orchestrator": orchestrator,
        "monitoring": monitoring,
        "langgraph_workflow": langgraph_workflow,
    }

    yield system

    # Cleanup
    await monitoring.stop_monitoring()


@pytest.fixture
def realistic_fraud_scenarios():
    """Realistic fraud investigation scenarios for E2E testing"""
    return [
        {
            "scenario_name": "account_takeover_fraud",
            "investigation_data": {
                "investigation_id": "e2e_account_takeover_001",
                "entity_id": "user_compromised_789",
                "investigation_type": "account_takeover",
                "priority": "critical",
                "data_sources": [
                    "login_logs",
                    "device_fingerprints",
                    "geolocation_data",
                    "password_change_logs",
                    "transaction_history",
                ],
                "metadata": {
                    "alert_source": "anomaly_detection_system",
                    "initial_indicators": [
                        "login_from_new_country",
                        "password_changed_recently",
                        "unusual_transaction_pattern",
                        "device_fingerprint_mismatch",
                    ],
                    "account_value": 75000.0,
                    "user_tenure_days": 1250,
                    "previous_fraud_history": False,
                },
            },
            "expected_outcomes": {
                "final_risk_score_range": (0.85, 1.0),
                "required_agents": [
                    "device_analysis",
                    "network_analysis",
                    "behavioral_analysis",
                ],
                "expected_duration_seconds": (120, 600),
                "min_confidence_score": 0.85,
            },
        },
        {
            "scenario_name": "payment_fraud_ring",
            "investigation_data": {
                "investigation_id": "e2e_payment_fraud_002",
                "entity_id": "merchant_suspicious_456",
                "investigation_type": "payment_fraud",
                "priority": "high",
                "data_sources": [
                    "transaction_logs",
                    "merchant_data",
                    "card_network_data",
                    "velocity_checks",
                    "risk_scoring_data",
                ],
                "metadata": {
                    "alert_source": "payment_monitoring",
                    "initial_indicators": [
                        "high_velocity_transactions",
                        "unusual_merchant_pattern",
                        "multiple_declined_cards",
                        "geographic_clustering",
                    ],
                    "transaction_volume_24h": 250000.0,
                    "merchant_age_days": 45,
                    "chargeback_rate": 0.12,
                },
            },
            "expected_outcomes": {
                "final_risk_score_range": (0.75, 0.95),
                "required_agents": [
                    "network_analysis",
                    "logs_analysis",
                    "risk_assessment",
                ],
                "expected_duration_seconds": (90, 300),
                "min_confidence_score": 0.8,
            },
        },
        {
            "scenario_name": "synthetic_identity_fraud",
            "investigation_data": {
                "investigation_id": "e2e_synthetic_identity_003",
                "entity_id": "identity_synthetic_123",
                "investigation_type": "identity_fraud",
                "priority": "medium",
                "data_sources": [
                    "identity_verification_logs",
                    "credit_bureau_data",
                    "device_intelligence",
                    "social_network_analysis",
                    "document_analysis",
                ],
                "metadata": {
                    "alert_source": "identity_verification_system",
                    "initial_indicators": [
                        "identity_elements_mismatch",
                        "no_credit_history",
                        "suspicious_document_patterns",
                        "velocity_across_applications",
                    ],
                    "application_amount": 15000.0,
                    "identity_age_days": 7,
                    "verification_confidence": 0.45,
                },
            },
            "expected_outcomes": {
                "final_risk_score_range": (0.65, 0.85),
                "required_agents": [
                    "device_analysis",
                    "logs_analysis",
                    "behavioral_analysis",
                ],
                "expected_duration_seconds": (150, 450),
                "min_confidence_score": 0.75,
            },
        },
    ]


class TestRealWorldInvestigationScenarios:
    """Test realistic fraud investigation scenarios end-to-end"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_account_takeover_investigation(
        self, production_orchestrator_system, realistic_fraud_scenarios
    ):
        """Test complete account takeover fraud investigation"""
        system = production_orchestrator_system
        orchestrator = system["orchestrator"]
        monitoring = system["monitoring"]

        scenario = next(
            s
            for s in realistic_fraud_scenarios
            if s["scenario_name"] == "account_takeover_fraud"
        )
        investigation_data = scenario["investigation_data"]
        expected_outcomes = scenario["expected_outcomes"]

        # Mock realistic AI decision progression for account takeover
        ai_decision_sequence = [
            {
                "decision": "initiate_high_priority_investigation",
                "reasoning": "Critical account takeover indicators detected: login from new country with device fingerprint mismatch and recent password change",
                "confidence": 0.92,
                "next_agents": ["device_analysis"],
                "coordination_strategy": "sequential",
                "investigation_scope": "comprehensive",
            },
            {
                "decision": "expand_device_forensics",
                "reasoning": "Device analysis reveals significant anomalies: new device fingerprint, unusual browser characteristics, and IP geolocation mismatch",
                "confidence": 0.89,
                "next_agents": ["network_analysis"],
                "coordination_strategy": "sequential",
                "escalation_level": "high",
            },
            {
                "decision": "parallel_behavioral_analysis",
                "reasoning": "Network analysis confirms suspicious activity patterns, initiating behavioral analysis to understand attack methodology",
                "confidence": 0.91,
                "next_agents": ["behavioral_analysis", "logs_analysis"],
                "coordination_strategy": "parallel",
                "analysis_depth": "deep",
            },
            {
                "decision": "conclude_account_takeover_confirmed",
                "reasoning": "Multiple analysis streams confirm coordinated account takeover attack with high confidence",
                "confidence": 0.94,
                "final_risk_score": 0.88,
                "fraud_classification": "account_takeover",
                "recommended_actions": [
                    "immediate_account_suspension",
                    "force_password_reset",
                    "notify_account_holder",
                    "block_suspicious_devices",
                    "flag_recent_transactions",
                ],
            },
        ]

        call_count = 0

        def mock_ai_decision(*args, **kwargs):
            nonlocal call_count
            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        ai_decision_sequence[
                            min(call_count, len(ai_decision_sequence) - 1)
                        ]
                    )
                )
            ]
            call_count += 1
            return response

        start_time = time.time()

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_ai_decision)

            # Execute investigation
            result = await orchestrator.orchestrate_investigation(investigation_data)

            end_time = time.time()
            investigation_duration = end_time - start_time

            # Validate investigation results
            assert result is not None
            assert result["status"] == "completed"
            assert result["investigation_id"] == investigation_data["investigation_id"]

            # Validate risk score is within expected range
            final_risk_score = result.get("final_risk_score", 0.0)
            min_risk, max_risk = expected_outcomes["final_risk_score_range"]
            assert (
                min_risk <= final_risk_score <= max_risk
            ), f"Risk score {final_risk_score} not in range [{min_risk}, {max_risk}]"

            # Validate investigation duration
            min_duration, max_duration = expected_outcomes["expected_duration_seconds"]
            assert (
                min_duration <= investigation_duration <= max_duration
            ), f"Duration {investigation_duration}s not in range [{min_duration}, {max_duration}]"

            # Validate decision quality
            decisions = result.get("decisions", [])
            assert (
                len(decisions) >= 3
            ), "Should have made multiple decisions for complex investigation"

            # Check decision confidence scores
            confidences = [
                d.get("confidence_score", 0)
                for d in decisions
                if "confidence_score" in d
            ]
            assert all(
                c >= expected_outcomes["min_confidence_score"] for c in confidences
            ), "All decisions should meet minimum confidence threshold"

            # Validate fraud classification
            assert "fraud_classification" in result
            assert result["fraud_classification"] == "account_takeover"

            # Validate recommended actions
            assert "recommended_actions" in result
            assert len(result["recommended_actions"]) >= 3

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_payment_fraud_ring_investigation(
        self, production_orchestrator_system, realistic_fraud_scenarios
    ):
        """Test payment fraud ring investigation with network analysis"""
        system = production_orchestrator_system
        orchestrator = system["orchestrator"]

        scenario = next(
            s
            for s in realistic_fraud_scenarios
            if s["scenario_name"] == "payment_fraud_ring"
        )
        investigation_data = scenario["investigation_data"]
        expected_outcomes = scenario["expected_outcomes"]

        # Mock payment fraud investigation AI decisions
        ai_decision_sequence = [
            {
                "decision": "investigate_payment_patterns",
                "reasoning": "High-velocity transactions with elevated chargeback rate indicate possible fraud ring operation",
                "confidence": 0.87,
                "next_agents": ["network_analysis"],
                "coordination_strategy": "sequential",
                "focus_areas": ["transaction_patterns", "merchant_network"],
            },
            {
                "decision": "deep_logs_analysis",
                "reasoning": "Network analysis reveals suspicious merchant clustering and card testing patterns",
                "confidence": 0.84,
                "next_agents": ["logs_analysis"],
                "coordination_strategy": "sequential",
                "analysis_scope": "comprehensive_logs",
            },
            {
                "decision": "risk_assessment_finalization",
                "reasoning": "Log analysis confirms coordinated fraud ring with multiple compromised cards",
                "confidence": 0.89,
                "next_agents": ["risk_assessment"],
                "coordination_strategy": "sequential",
                "assessment_type": "fraud_ring",
            },
            {
                "decision": "fraud_ring_confirmed",
                "reasoning": "Comprehensive analysis confirms organized payment fraud ring operation",
                "confidence": 0.91,
                "final_risk_score": 0.82,
                "fraud_classification": "payment_fraud_ring",
                "ring_size_estimate": 15,
                "recommended_actions": [
                    "merchant_account_suspension",
                    "block_associated_cards",
                    "alert_card_networks",
                    "law_enforcement_referral",
                ],
            },
        ]

        call_count = 0

        def mock_ai_decision(*args, **kwargs):
            nonlocal call_count
            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        ai_decision_sequence[
                            min(call_count, len(ai_decision_sequence) - 1)
                        ]
                    )
                )
            ]
            call_count += 1
            return response

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_ai_decision)

            result = await orchestrator.orchestrate_investigation(investigation_data)

            # Validate fraud ring detection
            assert result["status"] == "completed"
            assert result["fraud_classification"] == "payment_fraud_ring"
            assert "ring_size_estimate" in result
            assert result["ring_size_estimate"] > 1

            # Validate risk assessment
            final_risk_score = result.get("final_risk_score", 0.0)
            min_risk, max_risk = expected_outcomes["final_risk_score_range"]
            assert min_risk <= final_risk_score <= max_risk


class TestPerformanceAndScalability:
    """Test orchestrator performance under various load conditions"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_concurrent_investigation_handling(
        self, production_orchestrator_system
    ):
        """Test orchestrator handling multiple concurrent investigations"""
        orchestrator = production_orchestrator_system["orchestrator"]
        monitoring = production_orchestrator_system["monitoring"]

        # Create multiple concurrent investigation scenarios
        concurrent_investigations = []
        for i in range(5):  # Test with 5 concurrent investigations
            investigation_data = {
                "investigation_id": f"concurrent_test_{i:03d}",
                "entity_id": f"entity_{i:03d}",
                "investigation_type": "fraud_detection",
                "priority": ["low", "medium", "high"][i % 3],
                "data_sources": ["device_logs", "network_logs"],
                "metadata": {
                    "risk_score": 0.3 + (i * 0.15),
                    "test_scenario": "concurrent_load",
                },
            }
            concurrent_investigations.append(investigation_data)

        # Mock AI responses for concurrent investigations
        def mock_concurrent_ai_decision(*args, **kwargs):
            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        {
                            "decision": "complete_investigation",
                            "reasoning": "Concurrent test investigation completed",
                            "confidence": 0.85,
                            "final_risk_score": 0.6,
                        }
                    )
                )
            ]
            return response

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_concurrent_ai_decision)

            # Execute all investigations concurrently
            start_time = time.time()
            tasks = [
                orchestrator.orchestrate_investigation(inv_data)
                for inv_data in concurrent_investigations
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()

            total_duration = end_time - start_time

            # Validate all investigations completed successfully
            successful_results = [r for r in results if not isinstance(r, Exception)]
            assert len(successful_results) == len(
                concurrent_investigations
            ), "All concurrent investigations should complete successfully"

            # Validate performance - concurrent execution should be more efficient than sequential
            # Sequential would take ~5x longer, concurrent should complete in reasonable time
            assert (
                total_duration < 30
            ), f"Concurrent investigations took too long: {total_duration}s"

            # Validate each result
            for result in successful_results:
                assert result["status"] == "completed"
                assert "investigation_id" in result
                assert "final_risk_score" in result

            # Check monitoring metrics
            await asyncio.sleep(1)  # Allow metrics collection
            health_status = await monitoring.get_system_health()

            # System should still be healthy after concurrent load
            assert health_status["overall_status"] in ["healthy", "warning"]

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_investigation_performance_benchmarking(
        self, production_orchestrator_system
    ):
        """Test investigation performance benchmarking and optimization"""
        orchestrator = production_orchestrator_system["orchestrator"]
        monitoring = production_orchestrator_system["monitoring"]

        # Performance test scenarios with varying complexity
        performance_scenarios = [
            {
                "name": "simple_investigation",
                "complexity": "low",
                "data_sources": ["device_logs"],
                "expected_max_duration": 10,
            },
            {
                "name": "standard_investigation",
                "complexity": "medium",
                "data_sources": ["device_logs", "network_logs"],
                "expected_max_duration": 20,
            },
            {
                "name": "complex_investigation",
                "complexity": "high",
                "data_sources": [
                    "device_logs",
                    "network_logs",
                    "transaction_logs",
                    "behavioral_logs",
                ],
                "expected_max_duration": 40,
            },
        ]

        performance_results = []

        for scenario in performance_scenarios:
            investigation_data = {
                "investigation_id": f"perf_test_{scenario['name']}",
                "entity_id": f"entity_{scenario['name']}",
                "investigation_type": "performance_test",
                "priority": "medium",
                "data_sources": scenario["data_sources"],
                "metadata": {
                    "complexity": scenario["complexity"],
                    "benchmark_test": True,
                },
            }

            # Mock appropriate AI response for complexity level
            def mock_performance_ai_decision(*args, **kwargs):
                response = Mock()
                response.content = [
                    Mock(
                        text=json.dumps(
                            {
                                "decision": f"complete_{scenario['complexity']}_investigation",
                                "reasoning": f"Completed {scenario['complexity']} complexity investigation",
                                "confidence": 0.88,
                                "final_risk_score": 0.65,
                                "processing_complexity": scenario["complexity"],
                            }
                        )
                    )
                ]
                return response

            with patch.object(orchestrator, "ai_client") as mock_ai:
                mock_ai.messages.create = AsyncMock(
                    side_effect=mock_performance_ai_decision
                )

                # Measure investigation performance
                start_time = time.time()
                result = await orchestrator.orchestrate_investigation(
                    investigation_data
                )
                end_time = time.time()

                duration = end_time - start_time

                performance_results.append(
                    {
                        "scenario": scenario["name"],
                        "complexity": scenario["complexity"],
                        "duration": duration,
                        "expected_max_duration": scenario["expected_max_duration"],
                        "success": result["status"] == "completed",
                    }
                )

                # Validate performance meets expectations
                assert (
                    duration <= scenario["expected_max_duration"]
                ), f"{scenario['name']} took {duration}s, expected <= {scenario['expected_max_duration']}s"
                assert result["status"] == "completed"

        # Validate performance scaling is reasonable
        simple_duration = next(
            p["duration"] for p in performance_results if p["complexity"] == "low"
        )
        complex_duration = next(
            p["duration"] for p in performance_results if p["complexity"] == "high"
        )

        # Complex investigations should not be more than 5x slower than simple ones
        assert (
            complex_duration / simple_duration <= 5.0
        ), "Performance scaling between complexity levels is too high"

        # Check monitoring captured performance metrics
        await asyncio.sleep(1)
        metrics_summary = (await monitoring.get_system_health()).get(
            "metrics_summary", {}
        )

        # Should have decision latency metrics
        decision_latency_metrics = [
            m for m in metrics_summary.keys() if "decision_latency" in m.lower()
        ]
        assert (
            len(decision_latency_metrics) > 0
        ), "Performance monitoring should capture decision latency"


class TestResilienceAndErrorHandling:
    """Test orchestrator resilience under failure conditions"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_ai_service_failure_resilience(self, production_orchestrator_system):
        """Test orchestrator resilience when AI service fails"""
        orchestrator = production_orchestrator_system["orchestrator"]

        investigation_data = {
            "investigation_id": "resilience_test_ai_failure",
            "entity_id": "entity_resilience_001",
            "investigation_type": "resilience_test",
            "priority": "medium",
            "data_sources": ["device_logs", "network_logs"],
            "metadata": {"test_type": "ai_service_failure"},
        }

        # Mock AI service failures followed by recovery
        call_count = 0

        def failing_ai_service(*args, **kwargs):
            nonlocal call_count
            call_count += 1

            if call_count <= 2:  # First two calls fail
                raise Exception("AI service temporarily unavailable")
            else:  # Third call succeeds
                response = Mock()
                response.content = [
                    Mock(
                        text=json.dumps(
                            {
                                "decision": "fallback_investigation_complete",
                                "reasoning": "Investigation completed using fallback decision-making after AI service recovery",
                                "confidence": 0.75,
                                "final_risk_score": 0.6,
                                "recovery_mode": True,
                            }
                        )
                    )
                ]
                return response

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=failing_ai_service)

            # Investigation should complete despite initial AI failures
            result = await orchestrator.orchestrate_investigation(investigation_data)

            assert result is not None
            assert result["status"] in ["completed", "partial_completion"]
            assert "recovery_mode" in result or any(
                "fallback" in str(d).lower() for d in result.get("decisions", [])
            )

            # Should have made at least 3 attempts (2 failures + 1 success)
            assert call_count >= 3

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_agent_coordination_failure_recovery(
        self, production_orchestrator_system
    ):
        """Test recovery from agent coordination failures"""
        orchestrator = production_orchestrator_system["orchestrator"]

        investigation_data = {
            "investigation_id": "resilience_test_agent_failure",
            "entity_id": "entity_resilience_002",
            "investigation_type": "resilience_test",
            "priority": "high",
            "data_sources": ["device_logs", "network_logs", "transaction_logs"],
            "metadata": {"test_type": "agent_coordination_failure"},
        }

        # Mock AI decision that would normally trigger agent coordination
        def mock_ai_decision(*args, **kwargs):
            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        {
                            "decision": "proceed_with_agent_analysis",
                            "reasoning": "Investigation requires multiple agent coordination",
                            "confidence": 0.85,
                            "next_agents": ["device_analysis", "network_analysis"],
                            "coordination_strategy": "parallel",
                        }
                    )
                )
            ]
            return response

        # Mock agent coordination failure followed by fallback success
        coordination_call_count = 0

        async def failing_agent_coordination(*args, **kwargs):
            nonlocal coordination_call_count
            coordination_call_count += 1

            if coordination_call_count == 1:
                # First coordination fails
                raise Exception("Agent coordination service unavailable")
            else:
                # Fallback coordination succeeds
                return {
                    "status": "fallback_success",
                    "coordination_id": f"fallback_coord_{coordination_call_count}",
                    "agents_involved": ["available_agent"],
                    "fallback_strategy": "single_agent_analysis",
                }

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_ai_decision)

            with patch.object(
                orchestrator.agent_coordinator,
                "coordinate_agents",
                side_effect=failing_agent_coordination,
            ):

                result = await orchestrator.orchestrate_investigation(
                    investigation_data
                )

                assert result is not None
                assert result["status"] in ["completed", "partial_completion"]

                # Should have attempted coordination multiple times
                assert coordination_call_count >= 2

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_investigation_timeout_handling(self, production_orchestrator_system):
        """Test proper handling of investigation timeouts"""
        orchestrator = production_orchestrator_system["orchestrator"]

        investigation_data = {
            "investigation_id": "timeout_test_001",
            "entity_id": "entity_timeout",
            "investigation_type": "timeout_test",
            "priority": "low",
            "data_sources": ["device_logs"],
            "metadata": {
                "test_type": "timeout_handling",
                "max_duration_seconds": 5,  # Very short timeout for testing
            },
        }

        # Mock AI service that responds slowly
        async def slow_ai_service(*args, **kwargs):
            await asyncio.sleep(10)  # Longer than timeout
            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        {
                            "decision": "investigation_complete_slow",
                            "reasoning": "This response came too late",
                            "confidence": 0.8,
                        }
                    )
                )
            ]
            return response

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=slow_ai_service)

            start_time = time.time()

            # Investigation should timeout and provide partial results
            result = await orchestrator.orchestrate_investigation(investigation_data)

            end_time = time.time()
            duration = end_time - start_time

            # Should have completed within reasonable time (not waited full 10 seconds)
            assert (
                duration < 8
            ), f"Investigation should have timed out, but took {duration}s"

            assert result is not None
            assert result["status"] in ["partial_completion", "timeout", "completed"]


class TestProductionReadinessValidation:
    """Validate production readiness of the orchestrator system"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_investigation_data_integrity(self, production_orchestrator_system):
        """Test investigation data integrity throughout the process"""
        orchestrator = production_orchestrator_system["orchestrator"]

        original_investigation_data = {
            "investigation_id": "integrity_test_001",
            "entity_id": "entity_integrity_test",
            "investigation_type": "data_integrity_validation",
            "priority": "high",
            "data_sources": ["device_logs", "network_logs"],
            "metadata": {
                "sensitive_data": "should_be_preserved",
                "investigation_uuid": "uuid-12345-67890",
                "original_timestamp": datetime.now().isoformat(),
            },
        }

        def mock_ai_decision(*args, **kwargs):
            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        {
                            "decision": "data_integrity_validated",
                            "reasoning": "Investigation completed with data integrity maintained",
                            "confidence": 0.9,
                            "final_risk_score": 0.7,
                        }
                    )
                )
            ]
            return response

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=mock_ai_decision)

            result = await orchestrator.orchestrate_investigation(
                original_investigation_data
            )

            # Validate original data is preserved
            assert (
                result["investigation_id"]
                == original_investigation_data["investigation_id"]
            )
            assert result["entity_id"] == original_investigation_data["entity_id"]

            # Validate metadata integrity
            result_metadata = result.get("metadata", {})
            original_metadata = original_investigation_data["metadata"]

            assert (
                result_metadata.get("sensitive_data")
                == original_metadata["sensitive_data"]
            )
            assert (
                result_metadata.get("investigation_uuid")
                == original_metadata["investigation_uuid"]
            )

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_monitoring_and_alerting_production_readiness(
        self, production_orchestrator_system
    ):
        """Test monitoring and alerting system in production-like conditions"""
        monitoring = production_orchestrator_system["monitoring"]

        # Generate various system events to test monitoring
        test_scenarios = [
            {
                "metric": MonitoringMetric.DECISION_LATENCY,
                "values": [500, 1500, 3000, 6000],  # Escalating latency
                "expected_alerts": 1,  # Should trigger threshold alert
            },
            {
                "metric": MonitoringMetric.CPU_UTILIZATION,
                "values": [60, 75, 85, 92],  # High CPU usage
                "expected_alerts": 1,  # Should trigger resource alert
            },
        ]

        total_expected_alerts = sum(
            scenario["expected_alerts"] for scenario in test_scenarios
        )

        # Record metrics that should trigger alerts
        for scenario in test_scenarios:
            for value in scenario["values"]:
                await monitoring.record_metric(
                    scenario["metric"],
                    value,
                    investigation_id="monitoring_test",
                    metadata={"test_scenario": "production_readiness"},
                )

        # Wait for alert evaluation
        await asyncio.sleep(3)

        # Check system health
        health_status = await monitoring.get_system_health()
        assert "overall_status" in health_status
        assert "active_alerts" in health_status

        # Check for expected alerts
        active_alerts = await monitoring.get_alerts(include_resolved=False)
        assert (
            len(active_alerts) >= total_expected_alerts
        ), f"Expected at least {total_expected_alerts} alerts, got {len(active_alerts)}"

        # Validate alert quality
        for alert in active_alerts:
            assert "alert_type" in alert
            assert "severity" in alert
            assert "description" in alert
            assert alert["severity"] in ["low", "medium", "high", "critical"]

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_system_recovery_after_failures(self, production_orchestrator_system):
        """Test system recovery capabilities after various failures"""
        orchestrator = production_orchestrator_system["orchestrator"]
        monitoring = production_orchestrator_system["monitoring"]

        # Simulate system failure and recovery
        investigation_data = {
            "investigation_id": "recovery_test_001",
            "entity_id": "entity_recovery",
            "investigation_type": "system_recovery_test",
            "priority": "medium",
            "data_sources": ["device_logs"],
            "metadata": {"test_type": "recovery_validation"},
        }

        # Test 1: System failure during investigation
        failure_count = 0

        def failing_then_recovering_ai(*args, **kwargs):
            nonlocal failure_count
            failure_count += 1

            if failure_count <= 1:
                raise Exception("System failure simulation")

            response = Mock()
            response.content = [
                Mock(
                    text=json.dumps(
                        {
                            "decision": "system_recovered_successfully",
                            "reasoning": "Investigation completed after system recovery",
                            "confidence": 0.82,
                            "final_risk_score": 0.65,
                            "recovery_attempt": failure_count,
                        }
                    )
                )
            ]
            return response

        with patch.object(orchestrator, "ai_client") as mock_ai:
            mock_ai.messages.create = AsyncMock(side_effect=failing_then_recovering_ai)

            # System should recover and complete investigation
            result = await orchestrator.orchestrate_investigation(investigation_data)

            assert result is not None
            assert result["status"] == "completed"
            assert (
                result.get("recovery_attempt", 0) > 1
            )  # Should show recovery occurred

        # Test 2: System health after recovery
        await asyncio.sleep(2)
        health_status = await monitoring.get_system_health()

        # System should be stable after recovery
        assert health_status["overall_status"] in ["healthy", "warning"]
        assert health_status["monitoring_status"] == "active"


if __name__ == "__main__":
    # Run end-to-end tests with specific markers
    pytest.main(
        [
            __file__,
            "-v",
            "-m",
            "e2e",
            "--tb=long",
            "--maxfail=5",
            "--timeout=120",  # 2-minute timeout per test
        ]
    )

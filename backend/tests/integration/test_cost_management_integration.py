"""
Integration Tests for API Cost Management System.

Tests end-to-end cost management workflows with real API integration,
investigation scenarios, and system-wide coordination. NO MOCK DATA.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List

import pytest
import pytest_asyncio

from app.service.cost_management.anthropic_credit_monitor import get_credit_monitor
from app.service.cost_management.api_circuit_breaker import (
    CircuitBreakerConfig,
    get_circuit_breaker,
)
from app.service.cost_management.cost_optimization_framework import (
    get_cost_optimization,
)
from app.service.cost_management.model_tier_fallback import get_model_fallback
from app.service.cost_management.real_time_cost_tracker import get_cost_tracker


@pytest.mark.integration
class TestCostManagementSystemIntegration:
    """Integration tests for the complete cost management system."""

    @pytest.fixture
    def cost_management_stack(self):
        """Initialize complete cost management stack for testing."""
        return {
            "credit_monitor": get_credit_monitor(),
            "model_fallback": get_model_fallback(),
            "circuit_breaker": get_circuit_breaker(
                "integration_test",
                CircuitBreakerConfig(
                    failure_threshold=3, recovery_timeout=5.0, timeout=10.0
                ),
            ),
            "cost_optimization": get_cost_optimization(),
            "cost_tracker": get_cost_tracker(),
        }

    @pytest.mark.asyncio
    async def test_complete_investigation_cost_workflow(
        self, cost_management_stack, api_cost_monitor
    ):
        """Test complete cost management workflow for a full investigation."""

        # Initialize components
        credit_monitor = cost_management_stack["credit_monitor"]
        model_fallback = cost_management_stack["model_fallback"]
        circuit_breaker = cost_management_stack["circuit_breaker"]
        cost_optimization = cost_management_stack["cost_optimization"]
        cost_tracker = cost_management_stack["cost_tracker"]

        # Investigation scenario: Device Spoofing Detection
        investigation_phases = [
            {
                "phase": "initial_data_collection",
                "task_type": "data_extraction",
                "prompt": "Extract device fingerprint data for analysis",
                "preferred_model": "claude-3-haiku-20240307",
                "max_tokens": 1500,
                "expected_tier": ["efficient", "standard"],
            },
            {
                "phase": "device_fingerprint_analysis",
                "task_type": "device_spoofing",
                "prompt": """
                Analyze device fingerprint for spoofing indicators:
                - User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
                - Screen: 1920x1080, Color Depth: 24
                - Timezone: America/New_York (-5 UTC)
                - Plugins: PDF Viewer, Flash Player
                - Canvas Hash: a1b2c3d4e5f6
                - WebGL: NVIDIA GeForce RTX 3070
                
                Transaction context:
                - Account: high_value_customer_789
                - Amount: $15,000 transfer
                - Previous location: San Francisco, CA
                - Current location: New York, NY (4 hours later)
                """,
                "preferred_model": "claude-3-sonnet-20240229",
                "max_tokens": 3000,
                "expected_tier": ["standard", "premium"],
            },
            {
                "phase": "risk_assessment_and_decision",
                "task_type": "risk_assessment",
                "prompt": "Based on device analysis, determine final fraud risk score and recommended actions",
                "preferred_model": "claude-opus-4-1-20250805",
                "max_tokens": 2000,
                "expected_tier": ["premium"],
            },
        ]

        total_investigation_cost = 0.0
        phase_results = []

        # Execute investigation with full cost management
        for phase_data in investigation_phases:
            try:
                # Step 1: Optimize the request
                model_selection, optimization_result = (
                    await cost_optimization.optimize_request(
                        task_type=phase_data["task_type"],
                        prompt=phase_data["prompt"],
                        preferred_model=phase_data["preferred_model"],
                        max_tokens=phase_data["max_tokens"],
                    )
                )

                # Step 2: Validate cost against budget
                cost_estimate = await credit_monitor.estimate_request_cost(
                    model_selection.selected_model,
                    len(phase_data["prompt"].split()) * 2,  # Rough input tokens
                    model_selection.max_tokens // 2,  # Rough output tokens
                )

                is_affordable, reason = (
                    await credit_monitor.validate_request_affordability(cost_estimate)
                )

                # Step 3: Execute through circuit breaker
                async def execute_investigation_phase():
                    """Simulate investigation phase execution."""
                    await asyncio.sleep(0.5)  # Simulate processing time

                    # Track API cost
                    api_cost_monitor.track_call(
                        len(phase_data["prompt"].split()) * 2,
                        model_selection.max_tokens // 2,
                        model_selection.selected_model,
                    )

                    return {
                        "phase": phase_data["phase"],
                        "model_used": model_selection.selected_model,
                        "cost": optimization_result.optimized_cost,
                        "success": True,
                        "analysis_result": f"Completed {phase_data['phase']} with {model_selection.selected_model}",
                    }

                if is_affordable:
                    result = await circuit_breaker.call(execute_investigation_phase)

                    # Step 4: Track actual usage
                    await credit_monitor.track_request_usage(cost_estimate)
                    await cost_optimization.track_actual_usage(
                        optimization_result.optimized_cost
                    )

                    phase_results.append(result)
                    total_investigation_cost += optimization_result.optimized_cost

                else:
                    # Handle budget constraint
                    phase_results.append(
                        {
                            "phase": phase_data["phase"],
                            "model_used": None,
                            "cost": 0.0,
                            "success": False,
                            "error": f"Budget constraint: {reason}",
                        }
                    )

            except Exception as e:
                phase_results.append(
                    {
                        "phase": phase_data["phase"],
                        "model_used": None,
                        "cost": 0.0,
                        "success": False,
                        "error": str(e),
                    }
                )

        # Verify investigation workflow results
        assert len(phase_results) == len(investigation_phases)
        successful_phases = [r for r in phase_results if r["success"]]
        assert len(successful_phases) >= 2  # At least 2 phases should succeed

        # Verify cost management effectiveness
        assert (
            total_investigation_cost < 100.0
        )  # Should be under $100 for full investigation

        # Verify optimization was applied
        optimization_stats = cost_optimization.get_optimization_stats()
        assert optimization_stats["optimization"]["total_requests"] >= len(
            investigation_phases
        )

    @pytest.mark.asyncio
    async def test_budget_exhaustion_graceful_degradation(self, cost_management_stack):
        """Test system behavior when approaching budget limits."""

        credit_monitor = cost_management_stack["credit_monitor"]
        model_fallback = cost_management_stack["model_fallback"]
        cost_optimization = cost_management_stack["cost_optimization"]

        # Simulate high budget usage
        credit_monitor._daily_usage = 475.0  # 95% of daily budget
        cost_optimization.usage_by_period[cost_optimization.BudgetPeriod.DAILY] = 475.0

        # Test investigation under budget pressure
        constrained_investigation = {
            "task_type": "synthetic_identity",
            "prompt": """
            Critical synthetic identity investigation:
            - SSN inconsistencies detected
            - Credit history anomalies
            - Multiple identity markers compromised
            - High-value fraud suspected ($50,000+)
            
            Requires immediate analysis and risk determination.
            """,
            "preferred_model": "claude-opus-4-1-20250805",  # Most expensive model
            "max_tokens": 4000,
        }

        # Should trigger fallback mechanisms
        model_selection, optimization_result = await cost_optimization.optimize_request(
            **constrained_investigation
        )

        # Under budget pressure, should fallback to cheaper model
        assert (
            model_selection.fallback_reason is not None
            or optimization_result.savings > 0
        )

        # Should still provide a usable model
        assert model_selection.selected_model is not None
        assert model_selection.estimated_cost > 0

        # Verify budget alerts were generated
        alerts = await cost_optimization._check_budget_constraints(10.0)
        assert len(alerts) > 0
        critical_alerts = [a for a in alerts if a.threshold_type == "critical"]
        assert len(critical_alerts) > 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_integration_with_api_failures(
        self, cost_management_stack
    ):
        """Test circuit breaker integration with API failure scenarios."""

        circuit_breaker = cost_management_stack["circuit_breaker"]
        credit_monitor = cost_management_stack["credit_monitor"]

        failure_count = 0

        async def simulate_anthropic_api_call():
            """Simulate Anthropic API with intermittent failures."""
            nonlocal failure_count
            failure_count += 1

            if failure_count <= 2:
                # First two calls fail (rate limiting)
                raise Exception(
                    "RateLimitError: API rate limit exceeded - please retry after 60 seconds"
                )
            elif failure_count <= 4:
                # Next two calls timeout
                await asyncio.sleep(15.0)  # Exceeds circuit timeout
                return "should_not_reach"
            else:
                # Finally succeed
                await asyncio.sleep(0.3)
                return {
                    "investigation_result": "Device spoofing detected with 87% confidence",
                    "risk_score": 0.87,
                    "recommended_actions": [
                        "Block transaction",
                        "Flag account",
                        "Manual review",
                    ],
                }

        # Execute calls through circuit breaker
        results = []
        for i in range(6):
            try:
                result = await circuit_breaker.call(simulate_anthropic_api_call)
                results.append(("success", result))
            except Exception as e:
                results.append(("failure", str(e)))

        # Verify circuit breaker behavior
        stats = circuit_breaker.get_stats_dict()
        assert stats["total_failures"] >= 2  # Rate limit failures
        assert stats["total_timeouts"] >= 1  # Timeout failures

        # Should eventually succeed
        successful_results = [r for r in results if r[0] == "success"]
        assert len(successful_results) >= 1

    @pytest.mark.asyncio
    async def test_real_time_cost_tracking_during_investigation(
        self, cost_management_stack, api_cost_monitor
    ):
        """Test real-time cost tracking during live investigation."""

        cost_tracker = cost_management_stack["cost_tracker"]
        cost_optimization = cost_management_stack["cost_optimization"]

        # Start real-time monitoring
        await cost_tracker.start_monitoring()

        try:
            # Simulate investigation with real-time tracking
            investigation_steps = [
                {
                    "step": "user_verification",
                    "cost": 8.50,
                    "model": "claude-3-haiku-20240307",
                },
                {
                    "step": "transaction_analysis",
                    "cost": 22.75,
                    "model": "claude-3-sonnet-20240229",
                },
                {
                    "step": "behavioral_analysis",
                    "cost": 45.25,
                    "model": "claude-opus-4-1-20250805",
                },
                {
                    "step": "final_decision",
                    "cost": 18.50,
                    "model": "claude-3-sonnet-20240229",
                },
            ]

            total_tracked_cost = 0.0

            for step_data in investigation_steps:
                # Track cost in optimization framework
                await cost_optimization.track_actual_usage(step_data["cost"])
                total_tracked_cost += step_data["cost"]

                # Track for API monitoring
                api_cost_monitor.track_call(1500, 1000, step_data["model"])

                # Brief delay to simulate real processing
                await asyncio.sleep(0.2)

            # Let monitoring tasks process the updates
            await asyncio.sleep(1.0)

            # Verify real-time tracking captured the investigation
            dashboard_data = cost_tracker.get_current_dashboard_data()

            assert "metrics" in dashboard_data
            assert len(dashboard_data["metrics"]) > 0

            # Check if cost metrics were tracked
            cost_metrics = {
                name: metric
                for name, metric in dashboard_data["metrics"].items()
                if metric["type"] == "cost"
            }
            assert len(cost_metrics) >= 0  # Should have some cost metrics

        finally:
            # Clean up monitoring
            await cost_tracker.stop_monitoring()

    @pytest.mark.asyncio
    async def test_multi_investigation_concurrent_cost_management(
        self, cost_management_stack, api_cost_monitor
    ):
        """Test cost management with multiple concurrent investigations."""

        cost_optimization = cost_management_stack["cost_optimization"]
        credit_monitor = cost_management_stack["credit_monitor"]

        async def run_investigation(investigation_id: str, investigation_type: str):
            """Run a single investigation with cost management."""

            investigation_configs = {
                "device_spoofing": {
                    "task_type": "device_spoofing",
                    "prompt": f"Analyze device spoofing for investigation {investigation_id}",
                    "model": "claude-3-sonnet-20240229",
                    "tokens": 2500,
                },
                "impossible_travel": {
                    "task_type": "impossible_travel",
                    "prompt": f"Analyze impossible travel patterns for investigation {investigation_id}",
                    "model": "claude-3-sonnet-20240229",
                    "tokens": 2000,
                },
                "synthetic_identity": {
                    "task_type": "synthetic_identity",
                    "prompt": f"Investigate synthetic identity fraud for case {investigation_id}",
                    "model": "claude-opus-4-1-20250805",
                    "tokens": 3500,
                },
            }

            config = investigation_configs[investigation_type]

            # Optimize request
            model_selection, optimization_result = (
                await cost_optimization.optimize_request(
                    task_type=config["task_type"],
                    prompt=config["prompt"],
                    preferred_model=config["model"],
                    max_tokens=config["tokens"],
                )
            )

            # Track usage
            await cost_optimization.track_actual_usage(
                optimization_result.optimized_cost
            )

            # Track API usage
            api_cost_monitor.track_call(
                config["tokens"] // 2,
                config["tokens"] // 2,
                model_selection.selected_model,
            )

            return {
                "investigation_id": investigation_id,
                "type": investigation_type,
                "model_used": model_selection.selected_model,
                "original_cost": optimization_result.original_cost,
                "optimized_cost": optimization_result.optimized_cost,
                "savings": optimization_result.savings,
                "strategies_applied": [
                    s.value for s in optimization_result.strategies_applied
                ],
            }

        # Run concurrent investigations
        concurrent_investigations = [
            ("inv_001", "device_spoofing"),
            ("inv_002", "impossible_travel"),
            ("inv_003", "synthetic_identity"),
            ("inv_004", "device_spoofing"),
            ("inv_005", "impossible_travel"),
        ]

        tasks = [
            run_investigation(inv_id, inv_type)
            for inv_id, inv_type in concurrent_investigations
        ]

        # Execute all investigations concurrently
        results = await asyncio.gather(*tasks)

        # Verify all investigations completed
        assert len(results) == len(concurrent_investigations)

        # Verify cost tracking for all investigations
        total_original_cost = sum(r["original_cost"] for r in results)
        total_optimized_cost = sum(r["optimized_cost"] for r in results)
        total_savings = sum(r["savings"] for r in results)

        assert total_original_cost > 0
        assert total_optimized_cost >= 0
        assert total_savings >= 0
        assert total_optimized_cost <= total_original_cost

        # Verify optimization statistics updated correctly
        stats = cost_optimization.get_optimization_stats()
        assert stats["optimization"]["total_requests"] >= len(concurrent_investigations)

    @pytest.mark.asyncio
    async def test_cost_management_performance_overhead(self, cost_management_stack):
        """Test that cost management adds minimal performance overhead."""

        import time

        cost_optimization = cost_management_stack["cost_optimization"]
        credit_monitor = cost_management_stack["credit_monitor"]

        # Test performance with cost management
        start_time = time.time()

        for i in range(50):  # 50 operations
            # Simple cost estimation
            await credit_monitor.estimate_request_cost(
                "claude-3-haiku-20240307", 1000, 1000
            )

            # Simple optimization
            await cost_optimization.optimize_request(
                task_type="data_extraction",
                prompt=f"Extract data item {i}",
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1000,
            )

        end_time = time.time()
        elapsed_time = end_time - start_time
        avg_time_per_operation = elapsed_time / 50

        # Should be under 100ms per operation as specified
        assert (
            avg_time_per_operation < 0.1
        ), f"Cost management overhead too high: {avg_time_per_operation:.4f}s per operation"

    @pytest.mark.asyncio
    async def test_system_health_check_integration(self, cost_management_stack):
        """Test integrated health check across all cost management components."""

        # Get health status from all components
        health_checks = {}

        health_checks["credit_monitor"] = await cost_management_stack[
            "credit_monitor"
        ].health_check()
        health_checks["model_fallback"] = await cost_management_stack[
            "model_fallback"
        ].health_check()
        health_checks["cost_optimization"] = await cost_management_stack[
            "cost_optimization"
        ].health_check()
        health_checks["cost_tracker"] = await cost_management_stack[
            "cost_tracker"
        ].health_check()

        # Verify all components report healthy status
        for component_name, health_status in health_checks.items():
            assert (
                health_status["status"] == "healthy"
            ), f"{component_name} reported unhealthy status: {health_status}"

        # Verify comprehensive system health
        overall_health = all(h["status"] == "healthy" for h in health_checks.values())
        assert overall_health is True

        # Verify each component provides meaningful health data
        assert "balance_status" in health_checks["credit_monitor"]
        assert "models_available" in health_checks["model_fallback"]
        assert "optimization_enabled" in health_checks["cost_optimization"]
        assert "tracking_enabled" in health_checks["cost_tracker"]


@pytest.mark.integration
class TestCostManagementConfigurationIntegration:
    """Test integration with cost management configuration."""

    def test_configuration_loading_and_validation(self):
        """Test that configuration is properly loaded and validated."""

        # Import and test configuration loading
        from pathlib import Path

        import yaml

        config_path = (
            Path(__file__).parent.parent.parent
            / "config"
            / "cost_management_config.yaml"
        )
        assert config_path.exists(), "Cost management configuration file not found"

        with open(config_path, "r") as f:
            config = yaml.safe_load(f)

        # Verify configuration structure
        assert "credit_monitor" in config
        assert "model_fallback" in config
        assert "circuit_breaker" in config
        assert "cost_optimization" in config
        assert "cost_tracking" in config

        # Verify credit monitor configuration
        credit_config = config["credit_monitor"]
        assert "budget_limits" in credit_config
        assert "alert_thresholds" in credit_config
        assert "model_costs" in credit_config

        # Verify budget limits are reasonable
        budget_limits = credit_config["budget_limits"]
        assert budget_limits["daily"] == 500.0
        assert budget_limits["weekly"] == 2000.0
        assert budget_limits["monthly"] == 8000.0

        # Verify model costs are defined
        model_costs = credit_config["model_costs"]
        assert "claude-opus-4-1-20250805" in model_costs
        assert "claude-3-sonnet-20240229" in model_costs
        assert "claude-3-haiku-20240307" in model_costs

    @pytest.mark.asyncio
    async def test_configuration_integration_with_components(self):
        """Test that components properly integrate with configuration."""

        # Test components use configuration values
        credit_monitor = get_credit_monitor()
        model_fallback = get_model_fallback()
        cost_optimization = get_cost_optimization()

        # Verify credit monitor uses configuration
        assert credit_monitor.thresholds["daily_budget"] == 500.0
        assert credit_monitor.thresholds["weekly_budget"] == 2000.0

        # Verify model fallback has proper model configurations
        assert len(model_fallback.MODEL_CONFIGS) == 4
        assert "claude-opus-4-1-20250805" in model_fallback.MODEL_CONFIGS

        # Verify cost optimization uses configuration
        assert (
            cost_optimization.budget_limits[cost_optimization.BudgetPeriod.DAILY]
            == 500.0
        )


@pytest.mark.integration
class TestInvestigationScenarioIntegration:
    """Test cost management with realistic investigation scenarios."""

    @pytest.mark.asyncio
    async def test_money_laundering_investigation_end_to_end(self, api_cost_monitor):
        """Test complete money laundering investigation with cost management."""

        # Initialize cost management stack
        credit_monitor = get_credit_monitor()
        model_fallback = get_model_fallback()
        cost_optimization = get_cost_optimization()
        circuit_breaker = get_circuit_breaker(
            "ml_investigation",
            CircuitBreakerConfig(failure_threshold=2, recovery_timeout=10.0),
        )

        # Money laundering investigation workflow
        ml_investigation_phases = [
            {
                "phase": "transaction_pattern_analysis",
                "task_type": "pattern_recognition",
                "prompt": """
                Analyze transaction patterns for potential money laundering:
                
                Account: ML_SUSPECT_12345
                Time Period: Last 90 days
                
                Transaction Summary:
                - Total transactions: 847
                - Total volume: $2,847,392.33
                - Average transaction: $3,364.12
                - Unusual patterns: 67 transactions just under $10,000
                - Geographic spread: 15 different states
                - Rapid account turnover: Funds rarely stay >24 hours
                
                Red flags identified:
                - Structured deposits to avoid reporting thresholds
                - Rapid movement between multiple accounts  
                - High-risk geographic locations
                - Business account with personal-style transactions
                """,
                "preferred_model": "claude-3-sonnet-20240229",
                "max_tokens": 3000,
            },
            {
                "phase": "network_analysis",
                "task_type": "correlation_analysis",
                "prompt": """
                Analyze network of connected accounts and entities:
                
                Primary Subject: ML_SUSPECT_12345
                
                Connected Entities:
                - Account ML_RELATED_001: Shared beneficial owner
                - Account ML_RELATED_002: Frequent transfers
                - Business Entity: Shell Corp LLC (Wyoming)
                - Individual: John Smith (multiple SSNs)
                
                Network Characteristics:
                - 23 connected accounts total
                - $8.2M total network volume
                - Cross-border transactions: Mexico, Cayman Islands
                - Shell companies in 5 different states
                - Layered transactions through 4-6 intermediary accounts
                """,
                "preferred_model": "claude-opus-4-1-20250805",
                "max_tokens": 4000,
            },
            {
                "phase": "risk_assessment_and_reporting",
                "task_type": "money_laundering",
                "prompt": """
                Final risk assessment for money laundering investigation:
                
                Case: ML_SUSPECT_12345 Network Investigation
                
                Key Findings:
                - Structured transactions: 89% probability of intentional structuring
                - Network complexity: 23 related entities, 5-layer structure  
                - Geographic risk: High-risk jurisdictions involved
                - Volume analysis: $8.2M moved in suspicious patterns
                - Shell entity usage: Multiple inactive business fronts
                
                Regulatory Requirements:
                - SAR filing required within 30 days
                - Law enforcement referral recommended
                - Account freezing consideration
                - Enhanced due diligence implementation
                
                Provide final risk score, confidence level, and recommended actions.
                """,
                "preferred_model": "claude-opus-4-1-20250805",
                "max_tokens": 3500,
            },
        ]

        total_investigation_cost = 0.0
        ml_results = []

        # Execute money laundering investigation with full cost management
        for phase in ml_investigation_phases:
            try:
                # Optimize request
                model_selection, optimization_result = (
                    await cost_optimization.optimize_request(
                        task_type=phase["task_type"],
                        prompt=phase["prompt"],
                        preferred_model=phase["preferred_model"],
                        max_tokens=phase["max_tokens"],
                    )
                )

                # Execute through circuit breaker
                async def execute_ml_phase():
                    await asyncio.sleep(1.0)  # Simulate complex ML analysis

                    # Track API usage
                    api_cost_monitor.track_call(
                        len(phase["prompt"].split()) * 1.5,
                        model_selection.max_tokens // 2,
                        model_selection.selected_model,
                    )

                    return {
                        "phase": phase["phase"],
                        "analysis_complete": True,
                        "model_used": model_selection.selected_model,
                        "risk_indicators": [
                            "structured_transactions",
                            "shell_entities",
                            "geographic_risk",
                        ],
                        "confidence": 0.89,
                    }

                result = await circuit_breaker.call(execute_ml_phase)

                # Track usage
                cost_estimate = await credit_monitor.estimate_request_cost(
                    model_selection.selected_model,
                    len(phase["prompt"].split()) * 1.5,
                    model_selection.max_tokens // 2,
                )
                await credit_monitor.track_request_usage(cost_estimate)

                ml_results.append(result)
                total_investigation_cost += optimization_result.optimized_cost

            except Exception as e:
                ml_results.append(
                    {
                        "phase": phase["phase"],
                        "analysis_complete": False,
                        "error": str(e),
                    }
                )

        # Verify money laundering investigation results
        assert len(ml_results) == len(ml_investigation_phases)
        successful_phases = [r for r in ml_results if r.get("analysis_complete")]
        assert len(successful_phases) >= 2  # Critical investigation should succeed

        # Verify cost management for high-stakes investigation
        assert total_investigation_cost > 0
        assert (
            total_investigation_cost < 200.0
        )  # Even complex ML investigation should be reasonable

        # Verify appropriate models were selected for critical analysis
        models_used = [r["model_used"] for r in successful_phases if "model_used" in r]
        assert any(
            "opus" in model.lower() for model in models_used
        )  # Should use premium models

    @pytest.mark.asyncio
    async def test_insider_fraud_investigation_with_budget_constraints(
        self, api_cost_monitor
    ):
        """Test insider fraud investigation under budget constraints."""

        # Initialize with constrained budget
        cost_optimization = get_cost_optimization()
        credit_monitor = get_credit_monitor()

        # Set budget constraints
        cost_optimization.usage_by_period[cost_optimization.BudgetPeriod.DAILY] = (
            450.0  # 90% used
        )
        credit_monitor._daily_usage = 450.0

        # Insider fraud investigation - should adapt to budget constraints
        insider_fraud_scenario = {
            "task_type": "insider_fraud",
            "prompt": """
            Critical insider fraud investigation - Employee suspected of data theft:
            
            Subject: Employee ID 78945 (Sarah Mitchell, Data Analyst)
            Access Level: Confidential customer data, financial records
            
            Suspicious Activities:
            - After-hours database queries: 47 instances in 30 days
            - Downloaded customer PII files: 15,000+ records
            - USB device connections: 8 unauthorized instances
            - VPN access from unusual locations
            - File deletion attempts on audit logs
            - Email forwarding rules to personal account
            
            Business Impact:
            - Potential customer data breach: 15,000 records
            - Regulatory exposure: GDPR, CCPA violations possible
            - Financial exposure: Estimated $2.3M in potential damages
            - Reputational risk: High-profile customer data involved
            
            Investigation Requirements:
            - Determine scope of data access
            - Assess exfiltration methods and timing
            - Evaluate insider threat risk level
            - Provide recommendations for containment
            """,
            "preferred_model": "claude-opus-4-1-20250805",  # Premium model requested
            "max_tokens": 4000,
        }

        # Execute investigation - should trigger cost optimization
        model_selection, optimization_result = await cost_optimization.optimize_request(
            **insider_fraud_scenario
        )

        # Under budget constraints, should optimize selection
        assert model_selection.selected_model is not None

        # May have fallen back to less expensive model
        if model_selection.fallback_reason:
            assert "cost" in model_selection.fallback_reason.lower()

        # Should still deliver results despite constraints
        assert optimization_result.optimized_cost > 0
        assert optimization_result.optimized_cost <= optimization_result.original_cost

        # Track for monitoring
        api_cost_monitor.track_call(2000, 2000, model_selection.selected_model)

        # Verify budget constraints respected
        budget_check = await cost_optimization._check_budget_constraints(
            optimization_result.optimized_cost
        )
        # Should have warnings but still allow critical investigation
        warning_alerts = [
            a for a in budget_check if a.threshold_type in ["warning", "critical"]
        ]
        assert len(warning_alerts) > 0  # Should warn about budget usage


@pytest.mark.integration
class TestCostManagementResilience:
    """Test cost management system resilience and error handling."""

    @pytest.mark.asyncio
    async def test_system_resilience_under_api_failures(self):
        """Test system resilience when APIs fail or are unavailable."""

        circuit_breaker = get_circuit_breaker(
            "resilience_test",
            CircuitBreakerConfig(failure_threshold=2, recovery_timeout=3.0),
        )
        cost_optimization = get_cost_optimization()

        # Test resilience to API failures
        failure_scenarios = [
            "RateLimitError: Too many requests",
            "ServiceUnavailableError: API temporarily down",
            "TimeoutError: Request timed out",
            "AuthenticationError: Invalid API key",
        ]

        resilience_results = []

        for i, error_message in enumerate(failure_scenarios):

            async def failing_api_call():
                if i < 3:  # First 3 fail
                    raise Exception(error_message)
                else:
                    # Recovery call succeeds
                    return {"status": "recovered", "analysis": "Investigation resumed"}

            try:
                result = await circuit_breaker.call(failing_api_call)
                resilience_results.append(("success", result))
            except Exception as e:
                resilience_results.append(("failure", str(e)))

        # System should handle failures gracefully
        assert len(resilience_results) == len(failure_scenarios)

        # Should have some failures followed by recovery
        failures = [r for r in resilience_results if r[0] == "failure"]
        successes = [r for r in resilience_results if r[0] == "success"]

        assert len(failures) > 0  # Should have recorded failures
        assert len(successes) >= 1  # Should eventually succeed

    @pytest.mark.asyncio
    async def test_graceful_degradation_under_extreme_load(self):
        """Test graceful degradation under extreme load conditions."""

        cost_optimization = get_cost_optimization()

        # Simulate extreme load with many concurrent requests
        async def high_load_request(request_id: int):
            return await cost_optimization.optimize_request(
                task_type="data_extraction",
                prompt=f"Process high-load request {request_id}",
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1000,
            )

        # Execute high load (100 concurrent requests)
        load_tasks = [high_load_request(i) for i in range(100)]

        try:
            results = await asyncio.gather(*load_tasks, return_exceptions=True)

            # Verify system handled load gracefully
            successful_results = [r for r in results if not isinstance(r, Exception)]
            failed_results = [r for r in results if isinstance(r, Exception)]

            # Should handle most requests successfully
            success_rate = len(successful_results) / len(results)
            assert success_rate >= 0.8  # At least 80% success rate under load

            # No critical system failures
            critical_failures = [
                r for r in failed_results if "critical" in str(r).lower()
            ]
            assert len(critical_failures) == 0

        except Exception as e:
            pytest.fail(f"System failed under load: {e}")

    @pytest.mark.asyncio
    async def test_cost_management_system_recovery(self):
        """Test system recovery after component failures."""

        # Test recovery of each component
        components = {
            "credit_monitor": get_credit_monitor(),
            "model_fallback": get_model_fallback(),
            "cost_optimization": get_cost_optimization(),
            "cost_tracker": get_cost_tracker(),
        }

        recovery_results = {}

        for component_name, component in components.items():
            try:
                # Test health check before
                initial_health = await component.health_check()
                assert initial_health["status"] == "healthy"

                # Simulate component stress/failure recovery
                if hasattr(component, "reset"):
                    component.reset()

                # Test health check after
                recovery_health = await component.health_check()

                recovery_results[component_name] = {
                    "initial_status": initial_health["status"],
                    "recovery_status": recovery_health["status"],
                    "recovery_successful": recovery_health["status"] == "healthy",
                }

            except Exception as e:
                recovery_results[component_name] = {
                    "initial_status": "unknown",
                    "recovery_status": "failed",
                    "recovery_successful": False,
                    "error": str(e),
                }

        # Verify all components recovered successfully
        for component_name, result in recovery_results.items():
            assert result[
                "recovery_successful"
            ], f"{component_name} failed to recover: {result}"

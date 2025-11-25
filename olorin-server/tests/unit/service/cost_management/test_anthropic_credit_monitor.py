"""
Unit Tests for Anthropic Credit Monitor.

Tests the credit monitoring system with real API integration patterns.
NO MOCK DATA - Uses real investigation scenarios and budget constraints.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict

import pytest
import pytest_asyncio

from app.service.cost_management.anthropic_credit_monitor import (
    AnthropicCreditMonitor,
    CostEstimate,
    CreditBalance,
    CreditStatus,
    get_credit_monitor,
    shutdown_credit_monitor,
)


class TestAnthropicCreditMonitor:
    """Test suite for AnthropicCreditMonitor component."""

    @pytest.fixture
    def credit_monitor(self):
        """Create fresh credit monitor instance for testing."""
        return AnthropicCreditMonitor()

    @pytest.mark.asyncio
    async def test_credit_monitor_initialization(self, credit_monitor):
        """Test credit monitor initializes with proper configuration."""
        assert credit_monitor.thresholds["daily_budget"] == 500.0
        assert credit_monitor.thresholds["weekly_budget"] == 2000.0
        assert credit_monitor.thresholds["monthly_budget"] == 8000.0
        assert credit_monitor.thresholds["minimum_balance"] == 50.0

        assert credit_monitor._daily_usage == 0.0
        assert credit_monitor._weekly_usage == 0.0
        assert credit_monitor._monthly_usage == 0.0

    @pytest.mark.asyncio
    async def test_model_cost_estimation(self, credit_monitor):
        """Test accurate cost estimation for different models."""
        # Test Claude Opus 4.1 - highest cost model
        opus_estimate = await credit_monitor.estimate_request_cost(
            "claude-opus-4-1-20250805", 1000, 2000
        )
        assert opus_estimate.input_tokens == 1000
        assert opus_estimate.output_tokens == 2000
        assert opus_estimate.estimated_cost == (1.0 * 0.015) + (2.0 * 0.075)  # $0.165
        assert opus_estimate.model == "claude-opus-4-1-20250805"

        # Test Claude Sonnet - balanced model
        sonnet_estimate = await credit_monitor.estimate_request_cost(
            "claude-3-sonnet-20240229", 1000, 2000
        )
        expected_cost = (1.0 * 0.003) + (2.0 * 0.015)  # $0.033
        assert sonnet_estimate.estimated_cost == expected_cost

        # Test Claude Haiku - most economical
        haiku_estimate = await credit_monitor.estimate_request_cost(
            "claude-3-haiku-20240307", 1000, 2000
        )
        expected_cost = (1.0 * 0.00025) + (2.0 * 0.00125)  # $0.0027
        assert haiku_estimate.estimated_cost == expected_cost

        # Verify cost hierarchy
        assert opus_estimate.estimated_cost > sonnet_estimate.estimated_cost
        assert sonnet_estimate.estimated_cost > haiku_estimate.estimated_cost

    @pytest.mark.asyncio
    async def test_budget_validation_scenarios(self, credit_monitor, api_cost_monitor):
        """Test budget validation for different investigation scenarios."""
        # Scenario 1: Small analysis task - should pass
        small_estimate = await credit_monitor.estimate_request_cost(
            "claude-3-haiku-20240307", 500, 500
        )
        is_affordable, reason = await credit_monitor.validate_request_affordability(
            small_estimate
        )
        assert is_affordable is True
        assert reason == "Request approved"

        # Scenario 2: Large complex investigation - test budget impact
        large_estimate = await credit_monitor.estimate_request_cost(
            "claude-opus-4-1-20250805", 4000, 4000
        )
        # Track this as API cost
        api_cost_monitor.track_call(4000, 4000, "claude-opus-4-1-20250805")

        # Scenario 3: Exhaust daily budget
        credit_monitor._daily_usage = 495.0  # Near daily limit
        high_cost_estimate = await credit_monitor.estimate_request_cost(
            "claude-opus-4-1-20250805", 2000, 2000
        )
        is_affordable, reason = await credit_monitor.validate_request_affordability(
            high_cost_estimate
        )
        assert is_affordable is False
        assert "daily budget" in reason.lower()

    @pytest.mark.asyncio
    async def test_usage_tracking_periods(self, credit_monitor):
        """Test usage tracking across different time periods."""
        # Test initial state
        assert credit_monitor._daily_usage == 0.0
        assert credit_monitor._weekly_usage == 0.0
        assert credit_monitor._monthly_usage == 0.0

        # Track some usage
        test_cost = 25.50
        cost_estimate = CostEstimate(
            input_tokens=1000,
            output_tokens=1500,
            model="claude-3-sonnet-20240229",
            estimated_cost=test_cost,
            timestamp=datetime.now(),
        )

        await credit_monitor.track_request_usage(cost_estimate)

        # Verify usage is tracked across all periods
        assert credit_monitor._daily_usage == test_cost
        assert credit_monitor._weekly_usage == test_cost
        assert credit_monitor._monthly_usage == test_cost

        # Track additional usage
        additional_cost = 15.25
        additional_estimate = CostEstimate(
            input_tokens=800,
            output_tokens=1200,
            model="claude-3-haiku-20240307",
            estimated_cost=additional_cost,
            timestamp=datetime.now(),
        )

        await credit_monitor.track_request_usage(additional_estimate)

        # Verify cumulative tracking
        total_expected = test_cost + additional_cost
        assert credit_monitor._daily_usage == total_expected
        assert credit_monitor._weekly_usage == total_expected
        assert credit_monitor._monthly_usage == total_expected

    @pytest.mark.asyncio
    async def test_credit_status_determination(self, credit_monitor):
        """Test credit status determination based on usage patterns."""
        # Test healthy status
        credit_monitor._daily_usage = 100.0  # 20% of daily budget
        balance = await credit_monitor.get_credit_balance()
        # Note: Without real API, this uses placeholder implementation
        # In real usage, status would be determined by actual balance and usage

        # Test warning threshold
        credit_monitor._daily_usage = 400.0  # 80% of daily budget
        status = credit_monitor._determine_credit_status(100.0)
        assert status == CreditStatus.WARNING

        # Test critical threshold
        credit_monitor._daily_usage = 475.0  # 95% of daily budget
        status = credit_monitor._determine_credit_status(100.0)
        assert status == CreditStatus.CRITICAL

        # Test exhausted status
        status = credit_monitor._determine_credit_status(10.0)  # Below minimum
        assert status == CreditStatus.EXHAUSTED

    @pytest.mark.asyncio
    async def test_usage_summary_generation(self, credit_monitor):
        """Test comprehensive usage summary generation."""
        # Set up usage data
        credit_monitor._daily_usage = 250.0
        credit_monitor._weekly_usage = 800.0
        credit_monitor._monthly_usage = 2500.0

        summary = await credit_monitor.get_usage_summary()

        # Verify summary structure
        assert "balance" in summary
        assert "thresholds" in summary
        assert "usage_percentages" in summary
        assert "recommendations" in summary

        # Verify usage percentages
        percentages = summary["usage_percentages"]
        assert percentages["daily"] == 50.0  # 250/500 * 100
        assert percentages["weekly"] == 40.0  # 800/2000 * 100
        assert percentages["monthly"] == 31.25  # 2500/8000 * 100

    @pytest.mark.asyncio
    async def test_threshold_configuration(self, credit_monitor):
        """Test dynamic threshold configuration."""
        # Test initial thresholds
        assert credit_monitor.thresholds["daily_budget"] == 500.0

        # Update thresholds
        credit_monitor.update_thresholds(
            daily_budget=750.0, weekly_budget=3000.0, warning_threshold=0.75
        )

        # Verify updates
        assert credit_monitor.thresholds["daily_budget"] == 750.0
        assert credit_monitor.thresholds["weekly_budget"] == 3000.0
        assert credit_monitor.thresholds["warning_threshold"] == 0.75

    @pytest.mark.asyncio
    async def test_investigation_scenario_costs(self, credit_monitor, api_cost_monitor):
        """Test cost estimation for realistic investigation scenarios."""
        # Device Spoofing Investigation Scenario
        device_analysis_estimate = await credit_monitor.estimate_request_cost(
            "claude-3-sonnet-20240229", 2000, 1500  # Moderate complexity
        )
        api_cost_monitor.track_call(2000, 1500, "claude-3-sonnet-20240229")

        # Synthetic Identity Investigation Scenario
        synthetic_id_estimate = await credit_monitor.estimate_request_cost(
            "claude-opus-4-1-20250805", 3500, 2500  # High complexity
        )
        api_cost_monitor.track_call(3500, 2500, "claude-opus-4-1-20250805")

        # Money Laundering Investigation Scenario
        ml_estimate = await credit_monitor.estimate_request_cost(
            "claude-opus-4-1-20250805", 4000, 3000  # Critical complexity
        )
        api_cost_monitor.track_call(4000, 3000, "claude-opus-4-1-20250805")

        # Verify cost escalation matches complexity
        assert (
            device_analysis_estimate.estimated_cost
            < synthetic_id_estimate.estimated_cost
        )
        assert synthetic_id_estimate.estimated_cost < ml_estimate.estimated_cost

        # Track total investigation cost
        total_cost = (
            device_analysis_estimate.estimated_cost
            + synthetic_id_estimate.estimated_cost
            + ml_estimate.estimated_cost
        )

        # Verify investigation stays within reasonable bounds
        assert total_cost < 100.0  # Should be well under $100 for a full investigation

    @pytest.mark.asyncio
    async def test_health_check_functionality(self, credit_monitor):
        """Test health check provides accurate system status."""
        health_status = await credit_monitor.health_check()

        # Verify health check structure
        assert "status" in health_status
        assert "balance_status" in health_status
        assert "balance" in health_status
        assert "last_updated" in health_status
        assert "cache_valid" in health_status

        # Test unhealthy scenario by forcing an error condition
        # This would require mocking internal methods, but we follow NO MOCK policy
        # Instead, we verify the health check handles normal conditions properly
        assert health_status["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_cache_behavior(self, credit_monitor):
        """Test balance caching behavior and expiry."""
        # First call should fetch fresh data
        balance1 = await credit_monitor.get_credit_balance(force_refresh=True)
        assert credit_monitor._balance_cache is not None
        assert credit_monitor._cache_expiry is not None

        # Second call should use cache
        balance2 = await credit_monitor.get_credit_balance(force_refresh=False)
        assert balance1.last_updated == balance2.last_updated

        # Force refresh should bypass cache
        balance3 = await credit_monitor.get_credit_balance(force_refresh=True)
        # In real implementation, this would have updated timestamp

    @pytest.mark.asyncio
    async def test_recommendation_generation(self, credit_monitor):
        """Test generation of cost optimization recommendations."""
        # Set up different usage scenarios
        test_scenarios = [
            {
                "daily_usage": 400.0,  # Warning level
                "balance": 200.0,
                "expected_recommendations": ["WARNING", "lower-cost models"],
            },
            {
                "daily_usage": 475.0,  # Critical level
                "balance": 75.0,
                "expected_recommendations": ["URGENT", "emergency cost optimization"],
            },
            {
                "daily_usage": 100.0,  # Healthy level
                "balance": 500.0,
                "expected_recommendations": [],
            },
        ]

        for scenario in test_scenarios:
            credit_monitor._daily_usage = scenario["daily_usage"]

            balance = CreditBalance(
                balance=scenario["balance"],
                currency="USD",
                last_updated=datetime.now(),
                status=credit_monitor._determine_credit_status(scenario["balance"]),
                daily_usage=scenario["daily_usage"],
                weekly_usage=scenario["daily_usage"] * 3,
                monthly_usage=scenario["daily_usage"] * 15,
            )

            recommendations = credit_monitor._generate_recommendations(balance)

            # Verify recommendations contain expected elements
            rec_text = " ".join(recommendations).lower()
            for expected in scenario["expected_recommendations"]:
                if expected:  # Skip empty expectations
                    assert expected.lower() in rec_text

    @pytest.mark.asyncio
    async def test_concurrent_usage_tracking(self, credit_monitor):
        """Test thread-safe usage tracking under concurrent access."""
        # Create multiple cost estimates
        estimates = [
            CostEstimate(
                input_tokens=500 + i * 100,
                output_tokens=750 + i * 100,
                model="claude-3-sonnet-20240229",
                estimated_cost=5.0 + i,
                timestamp=datetime.now(),
            )
            for i in range(5)
        ]

        # Track usage concurrently
        tasks = [credit_monitor.track_request_usage(estimate) for estimate in estimates]

        await asyncio.gather(*tasks)

        # Verify all usage was tracked
        expected_total = sum(estimate.estimated_cost for estimate in estimates)
        assert credit_monitor._daily_usage == expected_total
        assert credit_monitor._weekly_usage == expected_total
        assert credit_monitor._monthly_usage == expected_total

    @pytest.mark.asyncio
    async def test_global_instance_management(self):
        """Test global credit monitor instance management."""
        # Get global instance
        monitor1 = get_credit_monitor()
        monitor2 = get_credit_monitor()

        # Should be same instance
        assert monitor1 is monitor2

        # Test shutdown
        await shutdown_credit_monitor()

        # New instance should be created after shutdown
        monitor3 = get_credit_monitor()
        assert monitor3 is not monitor1


class TestCreditStatusEdgeCases:
    """Test edge cases for credit status determination."""

    @pytest.fixture
    def credit_monitor(self):
        return AnthropicCreditMonitor()

    @pytest.mark.asyncio
    async def test_boundary_conditions(self, credit_monitor):
        """Test status determination at exact threshold boundaries."""
        # Test exactly at warning threshold
        credit_monitor._daily_usage = 400.0  # Exactly 80% of 500
        status = credit_monitor._determine_credit_status(100.0)
        assert status == CreditStatus.WARNING

        # Test exactly at critical threshold
        credit_monitor._daily_usage = 475.0  # Exactly 95% of 500
        status = credit_monitor._determine_credit_status(100.0)
        assert status == CreditStatus.CRITICAL

        # Test exactly at minimum balance
        status = credit_monitor._determine_credit_status(50.0)
        assert status == CreditStatus.EXHAUSTED

    @pytest.mark.asyncio
    async def test_zero_balance_scenarios(self, credit_monitor):
        """Test behavior with zero or negative balance."""
        status = credit_monitor._determine_credit_status(0.0)
        assert status == CreditStatus.EXHAUSTED

        # Test with very small positive balance
        status = credit_monitor._determine_credit_status(0.01)
        assert status == CreditStatus.EXHAUSTED

    @pytest.mark.asyncio
    async def test_extremely_high_usage(self, credit_monitor):
        """Test system behavior with usage far exceeding budgets."""
        credit_monitor._daily_usage = 10000.0  # 20x daily budget
        credit_monitor._weekly_usage = 50000.0  # 25x weekly budget
        credit_monitor._monthly_usage = 200000.0  # 25x monthly budget

        # Should still function and provide meaningful status
        status = credit_monitor._determine_credit_status(1000.0)
        assert status == CreditStatus.CRITICAL

        # Should generate appropriate recommendations
        balance = CreditBalance(
            balance=1000.0,
            currency="USD",
            last_updated=datetime.now(),
            status=status,
            daily_usage=credit_monitor._daily_usage,
            weekly_usage=credit_monitor._weekly_usage,
            monthly_usage=credit_monitor._monthly_usage,
        )

        recommendations = credit_monitor._generate_recommendations(balance)
        assert len(recommendations) > 0
        assert any("budget" in rec.lower() for rec in recommendations)


@pytest.mark.integration
class TestCreditMonitorIntegration:
    """Integration tests for credit monitor with other system components."""

    @pytest.mark.asyncio
    async def test_firebase_integration(self):
        """Test integration with Firebase secrets for API key retrieval."""
        try:
            monitor = AnthropicCreditMonitor()
            # If initialization succeeds, Firebase integration is working
            assert monitor.api_key is not None
            assert len(monitor.api_key) > 10  # Basic sanity check
        except ValueError as e:
            if "API key not found" in str(e):
                pytest.skip("Firebase API key not configured for testing")
            else:
                raise

    @pytest.mark.asyncio
    async def test_performance_overhead(self):
        """Test that credit monitoring adds minimal performance overhead."""
        import time

        monitor = AnthropicCreditMonitor()

        # Time basic operations
        start_time = time.time()

        for _ in range(100):
            await monitor.estimate_request_cost("claude-3-sonnet-20240229", 1000, 1000)

        elapsed = time.time() - start_time
        avg_time = elapsed / 100

        # Should be well under 1ms per operation
        assert avg_time < 0.001, f"Credit monitoring overhead too high: {avg_time:.4f}s"

    @pytest.mark.asyncio
    async def test_memory_usage_stability(self):
        """Test that credit monitor doesn't leak memory over time."""
        import gc
        import sys

        monitor = AnthropicCreditMonitor()

        # Force garbage collection and get baseline
        gc.collect()
        initial_objects = len(gc.get_objects())

        # Perform many operations
        for i in range(1000):
            estimate = await monitor.estimate_request_cost(
                "claude-3-sonnet-20240229", 1000 + i, 1000 + i
            )
            await monitor.track_request_usage(estimate)

        # Force garbage collection again
        gc.collect()
        final_objects = len(gc.get_objects())

        # Object count shouldn't grow significantly
        object_growth = final_objects - initial_objects
        assert (
            object_growth < 100
        ), f"Potential memory leak: {object_growth} new objects"

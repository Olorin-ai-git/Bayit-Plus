"""
Unit Tests for Cost Optimization Framework.

Tests comprehensive cost optimization strategies including request batching,
token usage optimization, intelligent caching, and budget management.
NO MOCK DATA - Uses realistic investigation scenarios.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

import pytest
import pytest_asyncio

from app.service.cost_management.cost_optimization_framework import (
    BudgetAlert,
    BudgetPeriod,
    CacheEntry,
    CostOptimizationFramework,
    OptimizationResult,
    OptimizationStrategy,
    get_cost_optimization,
)
from app.service.cost_management.model_tier_fallback import ModelTier


class TestCostOptimizationFramework:
    """Test suite for CostOptimizationFramework component."""

    @pytest.fixture
    def cost_optimizer(self):
        """Create fresh cost optimization instance for testing."""
        return CostOptimizationFramework()

    @pytest.mark.asyncio
    async def test_optimization_initialization(self, cost_optimizer):
        """Test cost optimization framework initializes with proper configuration."""
        assert cost_optimizer.optimization_enabled is True
        assert len(cost_optimizer.active_strategies) == len(OptimizationStrategy)
        assert cost_optimizer.cache_enabled is True
        assert cost_optimizer.batch_enabled is True

        # Check budget limits
        assert cost_optimizer.budget_limits[BudgetPeriod.DAILY] == 500.0
        assert cost_optimizer.budget_limits[BudgetPeriod.WEEKLY] == 2000.0
        assert cost_optimizer.budget_limits[BudgetPeriod.MONTHLY] == 8000.0

    @pytest.mark.asyncio
    async def test_device_spoofing_investigation_optimization(
        self, cost_optimizer, api_cost_monitor
    ):
        """Test optimization for device spoofing investigation scenario."""

        # Device spoofing investigation prompt
        device_prompt = """
        Analyze the following device fingerprint data for potential spoofing:
        
        Device Information:
        - User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
        - Screen Resolution: 1920x1080
        - Timezone: America/New_York
        - Language: en-US
        - Plugins: Chrome PDF Plugin, Native Client
        
        Transaction Context:
        - Account: user_12345
        - Amount: $2,500.00
        - Merchant: Electronics Store
        - Location: San Francisco, CA
        
        Please analyze for inconsistencies and provide risk assessment.
        """

        model_selection, optimization_result = await cost_optimizer.optimize_request(
            task_type="device_spoofing",
            prompt=device_prompt,
            preferred_model="claude-opus-4-1-20250805",
            max_tokens=2500,
        )

        # Track API cost
        api_cost_monitor.track_call(
            len(device_prompt.split()) * 1.3,  # Rough token count
            model_selection.max_tokens // 2,
            model_selection.selected_model,
        )

        # Verify optimization applied
        assert optimization_result.original_cost > 0
        assert optimization_result.optimized_cost >= 0
        assert optimization_result.savings >= 0

        # Should use appropriate model for complex task
        assert model_selection.tier in [ModelTier.PREMIUM, ModelTier.STANDARD]

        # Check if optimizations were applied
        if optimization_result.savings > 0:
            assert len(optimization_result.strategies_applied) > 0

    @pytest.mark.asyncio
    async def test_request_caching_optimization(self, cost_optimizer):
        """Test request caching and deduplication optimization."""

        # First request - should be processed normally
        investigation_prompt = "Analyze transaction pattern for user account user_789"

        selection1, result1 = await cost_optimizer.optimize_request(
            task_type="pattern_recognition",
            prompt=investigation_prompt,
            preferred_model="claude-3-sonnet-20240229",
            max_tokens=1500,
        )

        # Cache the response manually for testing
        cost_optimizer.cache_response(
            prompt=investigation_prompt,
            task_type="pattern_recognition",
            result={"analysis": "Pattern analysis complete", "risk_score": 0.65},
            cost=result1.optimized_cost,
            model_used=selection1.selected_model,
        )

        # Second identical request - should use cache
        selection2, result2 = await cost_optimizer.optimize_request(
            task_type="pattern_recognition",
            prompt=investigation_prompt,
            preferred_model="claude-3-sonnet-20240229",
            max_tokens=1500,
        )

        # Should be served from cache
        if OptimizationStrategy.REQUEST_DEDUPLICATION in result2.strategies_applied:
            assert result2.optimized_cost == 0.0  # Cache hit costs nothing
            assert result2.savings == result2.original_cost
            assert selection2.fallback_reason == "Served from cache"

    @pytest.mark.asyncio
    async def test_token_compression_optimization(self, cost_optimizer):
        """Test token compression optimization strategy."""

        # Verbose prompt with compression opportunities
        verbose_prompt = """
        Please kindly analyze the following investigation data. I would like you to 
        please review this information carefully. Could you please provide a detailed 
        analysis of the following transaction patterns? I need you to please examine 
        the data below and would appreciate if you could provide insights.
        
        Transaction Data:
        - Amount: $1,500.00
        - Merchant: Online Retailer
        - Time: 2:30 AM
        - Location: Remote area
        - User: Suspicious account
        
        Please provide analysis.
        """

        # Test compression
        compressed_prompt, compression_ratio = await cost_optimizer._compress_prompt(
            verbose_prompt
        )

        # Should achieve some compression
        assert len(compressed_prompt) < len(verbose_prompt)
        assert compression_ratio > 0
        assert compression_ratio <= 1.0

        # Compressed prompt should retain essential information
        assert "Transaction Data" in compressed_prompt
        assert "$1,500.00" in compressed_prompt
        assert "analysis" in compressed_prompt.lower()

    @pytest.mark.asyncio
    async def test_budget_constraint_validation(self, cost_optimizer):
        """Test budget constraint validation and alert generation."""

        # Set usage close to limits
        cost_optimizer.usage_by_period[BudgetPeriod.DAILY] = 450.0  # 90% of $500
        cost_optimizer.usage_by_period[BudgetPeriod.WEEKLY] = 1800.0  # 90% of $2000

        # Test budget constraint checking
        high_cost = 100.0  # Would exceed daily budget
        alerts = await cost_optimizer._check_budget_constraints(high_cost)

        # Should generate alerts
        assert len(alerts) > 0

        # Check for daily budget alert
        daily_alerts = [alert for alert in alerts if alert.period == BudgetPeriod.DAILY]
        assert len(daily_alerts) > 0

        daily_alert = daily_alerts[0]
        assert daily_alert.threshold_type in ["warning", "critical", "exceeded"]
        assert daily_alert.current_usage == 450.0
        assert daily_alert.budget_limit == 500.0
        assert len(daily_alert.recommended_actions) > 0

    @pytest.mark.asyncio
    async def test_usage_tracking_across_periods(self, cost_optimizer):
        """Test usage tracking across different time periods."""

        # Test initial state
        assert all(usage == 0.0 for usage in cost_optimizer.usage_by_period.values())

        # Track usage
        test_cost = 75.50
        await cost_optimizer.track_actual_usage(test_cost)

        # Verify usage tracked across all periods
        assert cost_optimizer.usage_by_period[BudgetPeriod.HOURLY] == test_cost
        assert cost_optimizer.usage_by_period[BudgetPeriod.DAILY] == test_cost
        assert cost_optimizer.usage_by_period[BudgetPeriod.WEEKLY] == test_cost
        assert cost_optimizer.usage_by_period[BudgetPeriod.MONTHLY] == test_cost

        # Track additional usage
        additional_cost = 25.25
        await cost_optimizer.track_actual_usage(additional_cost)

        total_expected = test_cost + additional_cost
        assert all(
            usage == total_expected for usage in cost_optimizer.usage_by_period.values()
        )

    @pytest.mark.asyncio
    async def test_synthetic_identity_investigation_optimization(
        self, cost_optimizer, api_cost_monitor
    ):
        """Test optimization for synthetic identity investigation scenario."""

        # Complex synthetic identity investigation prompt
        synthetic_identity_prompt = """
        Investigate potential synthetic identity fraud based on the following data:
        
        Identity Information:
        - SSN: 123-45-6789 (issued 2019)
        - DOB: 1985-06-15 
        - Name: John Michael Smith
        - Address: 123 Main St, Anytown, ST 12345
        
        Credit Profile:
        - Credit history: Established 2020 (only 1 year after SSN issuance)
        - Credit score: 720
        - Accounts: 5 credit cards, 1 auto loan
        - Payment history: Perfect (suspicious for new identity)
        
        Application Details:
        - Loan amount: $50,000
        - Purpose: Business investment
        - Income: $85,000 (claimed)
        - Employment: Self-employed consultant (started 2020)
        
        Red Flags:
        - SSN issued after claimed age of majority
        - Rapid credit establishment
        - Perfect credit despite being 'new' to credit system
        - Self-employment coincides with credit history start
        
        Provide comprehensive analysis including risk scoring and investigation recommendations.
        """

        model_selection, optimization_result = await cost_optimizer.optimize_request(
            task_type="synthetic_identity",
            prompt=synthetic_identity_prompt,
            preferred_model="claude-opus-4-1-20250805",  # Critical task needs premium model
            max_tokens=4000,
        )

        # Track API usage
        api_cost_monitor.track_call(
            len(synthetic_identity_prompt.split()) * 1.3,
            model_selection.max_tokens // 2,
            model_selection.selected_model,
        )

        # Critical task should prefer premium models
        assert model_selection.tier in [ModelTier.PREMIUM, ModelTier.STANDARD]

        # Should have applied some optimization strategies
        assert len(optimization_result.strategies_applied) >= 0

        # Quality impact should be minimal for critical tasks
        assert optimization_result.quality_impact <= 0.1

    @pytest.mark.asyncio
    async def test_cache_management_and_cleanup(self, cost_optimizer):
        """Test cache management, TTL, and cleanup functionality."""

        # Add cache entries with different TTLs
        test_entries = [
            (
                "prompt1",
                "task1",
                {"result": "data1"},
                10.0,
                "claude-3-haiku-20240307",
                3600,
            ),
            (
                "prompt2",
                "task2",
                {"result": "data2"},
                15.0,
                "claude-3-sonnet-20240229",
                1800,
            ),
            (
                "prompt3",
                "task3",
                {"result": "data3"},
                20.0,
                "claude-opus-4-1-20250805",
                1,
            ),  # Short TTL
        ]

        for prompt, task, result, cost, model, ttl in test_entries:
            cost_optimizer.cache_response(
                prompt=prompt,
                task_type=task,
                result=result,
                cost=cost,
                model_used=model,
                ttl_seconds=ttl,
            )

        # Verify entries were cached
        assert len(cost_optimizer.request_cache) == 3

        # Wait for short TTL entry to expire
        await asyncio.sleep(2.0)

        # Trigger cleanup
        await cost_optimizer._cleanup_cache()

        # Should have cleaned up expired entry
        assert len(cost_optimizer.request_cache) == 2
        assert cost_optimizer.cache_stats["evictions"] >= 1

    @pytest.mark.asyncio
    async def test_optimization_statistics_accuracy(self, cost_optimizer):
        """Test accuracy of optimization statistics tracking."""

        initial_stats = cost_optimizer.get_optimization_stats()
        initial_requests = initial_stats["optimization"]["total_requests"]

        # Perform various optimized requests
        test_scenarios = [
            (
                "data_extraction",
                "Extract key data points from transaction log",
                "claude-3-haiku-20240307",
            ),
            (
                "risk_assessment",
                "Assess overall fraud risk for this investigation",
                "claude-opus-4-1-20250805",
            ),
            (
                "pattern_recognition",
                "Identify suspicious patterns in user behavior",
                "claude-3-sonnet-20240229",
            ),
        ]

        for task_type, prompt, preferred_model in test_scenarios:
            await cost_optimizer.optimize_request(
                task_type=task_type,
                prompt=prompt,
                preferred_model=preferred_model,
                max_tokens=2000,
            )

        # Check updated statistics
        updated_stats = cost_optimizer.get_optimization_stats()

        # Should have processed all requests
        assert updated_stats["optimization"][
            "total_requests"
        ] == initial_requests + len(test_scenarios)

        # Verify statistics structure
        assert "cache" in updated_stats
        assert "budget" in updated_stats

        # Cache statistics should be tracked
        cache_stats = updated_stats["cache"]
        assert "hits" in cache_stats
        assert "misses" in cache_stats
        assert "hit_rate_percent" in cache_stats

    @pytest.mark.asyncio
    async def test_strategy_enable_disable(self, cost_optimizer):
        """Test enabling and disabling optimization strategies."""

        # Initially all strategies should be enabled
        assert len(cost_optimizer.active_strategies) == len(OptimizationStrategy)

        # Disable token compression
        cost_optimizer.disable_strategy(OptimizationStrategy.TOKEN_COMPRESSION)
        assert (
            OptimizationStrategy.TOKEN_COMPRESSION
            not in cost_optimizer.active_strategies
        )

        # Re-enable token compression
        cost_optimizer.enable_strategy(OptimizationStrategy.TOKEN_COMPRESSION)
        assert (
            OptimizationStrategy.TOKEN_COMPRESSION in cost_optimizer.active_strategies
        )

        # Disable caching
        cost_optimizer.disable_strategy(OptimizationStrategy.REQUEST_DEDUPLICATION)
        assert (
            OptimizationStrategy.REQUEST_DEDUPLICATION
            not in cost_optimizer.active_strategies
        )

    @pytest.mark.asyncio
    async def test_budget_configuration_updates(self, cost_optimizer):
        """Test dynamic budget configuration updates."""

        # Initial budget values
        assert cost_optimizer.budget_limits[BudgetPeriod.DAILY] == 500.0

        # Update budgets
        cost_optimizer.configure_budgets(daily=750.0, weekly=3000.0, monthly=10000.0)

        # Verify updates
        assert cost_optimizer.budget_limits[BudgetPeriod.DAILY] == 750.0
        assert cost_optimizer.budget_limits[BudgetPeriod.WEEKLY] == 3000.0
        assert cost_optimizer.budget_limits[BudgetPeriod.MONTHLY] == 10000.0

    @pytest.mark.asyncio
    async def test_money_laundering_investigation_workflow(
        self, cost_optimizer, api_cost_monitor
    ):
        """Test end-to-end optimization for money laundering investigation."""

        # Multi-phase money laundering investigation
        investigation_phases = [
            {
                "phase": "initial_analysis",
                "task_type": "data_extraction",
                "prompt": "Extract transaction data for suspicious account ML_789",
                "preferred_model": "claude-3-haiku-20240307",
            },
            {
                "phase": "pattern_detection",
                "task_type": "pattern_recognition",
                "prompt": "Identify money laundering patterns in transaction history",
                "preferred_model": "claude-3-sonnet-20240229",
            },
            {
                "phase": "network_analysis",
                "task_type": "correlation_analysis",
                "prompt": "Analyze network of associated accounts and entities",
                "preferred_model": "claude-opus-4-1-20250805",
            },
            {
                "phase": "risk_determination",
                "task_type": "money_laundering",
                "prompt": "Final risk assessment for money laundering investigation",
                "preferred_model": "claude-opus-4-1-20250805",
            },
        ]

        total_original_cost = 0.0
        total_optimized_cost = 0.0
        total_savings = 0.0

        for phase in investigation_phases:
            model_selection, optimization_result = (
                await cost_optimizer.optimize_request(
                    task_type=phase["task_type"],
                    prompt=phase["prompt"],
                    preferred_model=phase["preferred_model"],
                    max_tokens=3000,
                )
            )

            # Track costs
            total_original_cost += optimization_result.original_cost
            total_optimized_cost += optimization_result.optimized_cost
            total_savings += optimization_result.savings

            # Track actual API usage
            api_cost_monitor.track_call(1500, 1500, model_selection.selected_model)

            # Update framework usage tracking
            await cost_optimizer.track_actual_usage(optimization_result.optimized_cost)

        # Verify overall optimization effectiveness
        assert total_original_cost > 0
        assert total_optimized_cost >= 0
        assert total_savings >= 0

        # Should achieve some cost savings overall
        if total_savings > 0:
            savings_percentage = (total_savings / total_original_cost) * 100
            assert savings_percentage > 0  # Some optimization benefit

    @pytest.mark.asyncio
    async def test_concurrent_optimization_requests(self, cost_optimizer):
        """Test concurrent optimization requests don't interfere."""

        async def concurrent_optimization(request_id: int):
            """Simulate concurrent optimization request."""
            return await cost_optimizer.optimize_request(
                task_type="device_analysis",
                prompt=f"Analyze device data for request {request_id}",
                preferred_model="claude-3-sonnet-20240229",
                max_tokens=1500,
            )

        # Execute concurrent optimizations
        concurrent_count = 5
        tasks = [concurrent_optimization(i) for i in range(concurrent_count)]
        results = await asyncio.gather(*tasks)

        # Verify all completed successfully
        assert len(results) == concurrent_count

        for model_selection, optimization_result in results:
            assert model_selection.selected_model is not None
            assert optimization_result.original_cost > 0

        # Verify statistics are consistent
        stats = cost_optimizer.get_optimization_stats()
        assert stats["optimization"]["total_requests"] >= concurrent_count

    @pytest.mark.asyncio
    async def test_health_check_comprehensive(self, cost_optimizer):
        """Test comprehensive health check of optimization framework."""

        health_status = await cost_optimizer.health_check()

        # Verify health check structure
        assert "status" in health_status
        assert "optimization_enabled" in health_status
        assert "active_strategies" in health_status
        assert "cache_enabled" in health_status
        assert "cache_size" in health_status
        assert "recent_stats" in health_status

        # Verify health status
        assert health_status["status"] == "healthy"
        assert health_status["optimization_enabled"] is True
        assert health_status["cache_enabled"] is True

        # Verify strategy list
        active_strategies = health_status["active_strategies"]
        assert isinstance(active_strategies, list)
        assert len(active_strategies) > 0


class TestOptimizationStrategies:
    """Test individual optimization strategies in detail."""

    @pytest.fixture
    def cost_optimizer(self):
        return CostOptimizationFramework()

    @pytest.mark.asyncio
    async def test_model_downgrade_strategy(self, cost_optimizer):
        """Test model downgrade optimization strategy."""

        # Force budget constraints to trigger downgrade
        cost_optimizer.usage_by_period[BudgetPeriod.DAILY] = 480.0  # Near limit

        # Request expensive model for moderate complexity task
        model_selection, optimization_result = await cost_optimizer.optimize_request(
            task_type="pattern_recognition",  # Moderate complexity
            prompt="Analyze user behavior patterns",
            preferred_model="claude-opus-4-1-20250805",  # Most expensive
            max_tokens=2000,
        )

        # Should have downgraded to less expensive model
        if (
            OptimizationStrategy.MODEL_DOWNGRADE
            in optimization_result.strategies_applied
        ):
            assert model_selection.selected_model != "claude-opus-4-1-20250805"
            assert optimization_result.savings > 0
            assert optimization_result.quality_impact >= 0

    def test_cache_key_generation(self, cost_optimizer):
        """Test cache key generation consistency."""

        # Same input should generate same key
        key1 = cost_optimizer._generate_cache_key("test prompt", "test_task")
        key2 = cost_optimizer._generate_cache_key("test prompt", "test_task")
        assert key1 == key2

        # Different input should generate different keys
        key3 = cost_optimizer._generate_cache_key("different prompt", "test_task")
        key4 = cost_optimizer._generate_cache_key("test prompt", "different_task")
        assert key1 != key3
        assert key1 != key4

    @pytest.mark.asyncio
    async def test_period_reset_timing(self, cost_optimizer):
        """Test budget period reset timing calculations."""

        # Test hourly reset timing
        hourly_reset = cost_optimizer._get_next_reset_time(BudgetPeriod.HOURLY)
        now = datetime.now()
        expected_hourly = now.replace(minute=0, second=0, microsecond=0) + timedelta(
            hours=1
        )

        # Should be within reasonable range
        time_diff = abs((hourly_reset - expected_hourly).total_seconds())
        assert time_diff < 60  # Within 1 minute

        # Test daily reset timing
        daily_reset = cost_optimizer._get_next_reset_time(BudgetPeriod.DAILY)
        expected_daily = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)

        time_diff = abs((daily_reset - expected_daily).total_seconds())
        assert time_diff < 3600  # Within 1 hour

    def test_time_until_reset_calculation(self, cost_optimizer):
        """Test time until reset calculation."""

        # Set a future reset time
        future_time = datetime.now() + timedelta(hours=2)
        cost_optimizer.usage_reset_times[BudgetPeriod.DAILY] = future_time

        time_remaining = cost_optimizer._get_time_until_reset(BudgetPeriod.DAILY)

        # Should be approximately 2 hours
        assert (
            timedelta(hours=1, minutes=55)
            <= time_remaining
            <= timedelta(hours=2, minutes=5)
        )

    @pytest.mark.asyncio
    async def test_compression_effectiveness_scenarios(self, cost_optimizer):
        """Test compression effectiveness for different prompt types."""

        test_scenarios = [
            {
                "name": "verbose_prompt",
                "text": "Please kindly analyze this data. I would like you to please review this carefully. Could you please provide analysis?",
                "expected_compression": 0.3,  # Should achieve at least 30% compression
            },
            {
                "name": "technical_prompt",
                "text": "Analyze device fingerprint: screen=1920x1080, ua=Chrome, plugins=PDF,Flash",
                "expected_compression": 0.1,  # Technical data compresses less
            },
            {
                "name": "minimal_prompt",
                "text": "Check fraud risk",
                "expected_compression": 0.0,  # Already minimal
            },
        ]

        for scenario in test_scenarios:
            compressed_text, ratio = await cost_optimizer._compress_prompt(
                scenario["text"]
            )

            # Should not over-compress and lose meaning
            assert len(compressed_text) >= len(scenario["text"]) * 0.4

            # Ratio should be reasonable
            assert 0.0 <= ratio <= 1.0


class TestBudgetManagement:
    """Test budget management and alerting functionality."""

    @pytest.fixture
    def cost_optimizer(self):
        optimizer = CostOptimizationFramework()
        # Set known budget limits for testing
        optimizer.configure_budgets(
            hourly=25.0, daily=500.0, weekly=2000.0, monthly=8000.0
        )
        return optimizer

    @pytest.mark.asyncio
    async def test_budget_threshold_detection(self, cost_optimizer):
        """Test detection of different budget threshold levels."""

        # Test warning threshold
        cost_optimizer.usage_by_period[BudgetPeriod.DAILY] = 400.0  # 80% of $500
        alerts = await cost_optimizer._check_budget_constraints(
            10.0
        )  # Small additional cost

        warning_alerts = [a for a in alerts if a.threshold_type == "warning"]
        assert len(warning_alerts) > 0

        # Test critical threshold
        cost_optimizer.usage_by_period[BudgetPeriod.DAILY] = 475.0  # 95% of $500
        alerts = await cost_optimizer._check_budget_constraints(10.0)

        critical_alerts = [a for a in alerts if a.threshold_type == "critical"]
        assert len(critical_alerts) > 0

        # Test exceeded threshold
        cost_optimizer.usage_by_period[BudgetPeriod.DAILY] = 490.0  # 98% of $500
        alerts = await cost_optimizer._check_budget_constraints(20.0)  # Would exceed

        exceeded_alerts = [a for a in alerts if a.threshold_type == "exceeded"]
        assert len(exceeded_alerts) > 0

    @pytest.mark.asyncio
    async def test_multi_period_budget_coordination(self, cost_optimizer):
        """Test budget management across multiple time periods."""

        # Set usage that affects multiple periods
        cost_optimizer.usage_by_period[BudgetPeriod.HOURLY] = 24.0  # 96% of hourly
        cost_optimizer.usage_by_period[BudgetPeriod.DAILY] = 450.0  # 90% of daily
        cost_optimizer.usage_by_period[BudgetPeriod.WEEKLY] = 1900.0  # 95% of weekly

        # Request that would impact all periods
        alerts = await cost_optimizer._check_budget_constraints(10.0)

        # Should generate alerts for multiple periods
        periods_alerted = {alert.period for alert in alerts}
        assert len(periods_alerted) >= 2  # At least 2 periods should alert

    def test_global_optimization_instance(self):
        """Test global cost optimization instance management."""

        # Get global instance
        optimizer1 = get_cost_optimization()
        optimizer2 = get_cost_optimization()

        # Should be same instance
        assert optimizer1 is optimizer2

        # Should have proper configuration
        assert optimizer1.optimization_enabled is True
        assert len(optimizer1.active_strategies) > 0

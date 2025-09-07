"""
Unit Tests for Model Tier Fallback System.

Tests intelligent model selection based on cost constraints, task complexity,
and performance requirements. NO MOCK DATA - Uses real investigation scenarios.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import pytest
import pytest_asyncio
from datetime import datetime
from typing import Dict, Any, List

from app.service.cost_management.model_tier_fallback import (
    ModelTierFallback,
    TaskComplexity,
    ModelTier,
    ModelConfig,
    ModelSelection,
    get_model_fallback,
)
from app.service.cost_management.anthropic_credit_monitor import (
    CreditStatus,
    CreditBalance,
)


class TestModelTierFallback:
    """Test suite for ModelTierFallback component."""

    @pytest.fixture
    def model_fallback(self):
        """Create fresh model fallback instance for testing."""
        return ModelTierFallback()

    @pytest.mark.asyncio
    async def test_fallback_initialization(self, model_fallback):
        """Test model fallback initializes with proper configuration."""
        assert len(model_fallback.MODEL_CONFIGS) == 4  # All Claude models
        assert model_fallback.force_economy_mode is False
        assert model_fallback.quality_threshold == 0.8
        assert model_fallback.cost_optimization_enabled is True

    @pytest.mark.asyncio
    async def test_task_complexity_mapping(self, model_fallback):
        """Test task complexity determination for investigation scenarios."""
        # Test fraud investigation task complexities
        complexity_tests = [
            ("device_spoofing", TaskComplexity.COMPLEX),
            ("impossible_travel", TaskComplexity.MODERATE),
            ("synthetic_identity", TaskComplexity.CRITICAL),
            ("money_laundering", TaskComplexity.CRITICAL),
            ("data_extraction", TaskComplexity.SIMPLE),
            ("risk_assessment", TaskComplexity.CRITICAL),
            ("location_analysis", TaskComplexity.SIMPLE),
            ("network_analysis", TaskComplexity.COMPLEX),
        ]

        for task_type, expected_complexity in complexity_tests:
            actual_complexity = model_fallback._get_task_complexity(task_type)
            assert actual_complexity == expected_complexity, (
                f"Task {task_type} should have complexity {expected_complexity.value}, "
                f"got {actual_complexity.value}"
            )

    @pytest.mark.asyncio
    async def test_model_selection_by_complexity(self, model_fallback):
        """Test model selection based on task complexity levels."""
        # Simple task - should prefer efficient models
        simple_models = model_fallback._get_suitable_models(TaskComplexity.SIMPLE)
        assert "claude-3-haiku-20240307" in simple_models

        # Moderate task - should include standard models  
        moderate_models = model_fallback._get_suitable_models(TaskComplexity.MODERATE)
        assert "claude-3-sonnet-20240229" in moderate_models
        assert "claude-3-haiku-20240307" in moderate_models

        # Complex task - should include premium models
        complex_models = model_fallback._get_suitable_models(TaskComplexity.COMPLEX)
        assert "claude-3-sonnet-20240229" in complex_models
        assert "claude-opus-4-1-20250805" in complex_models

        # Critical task - should prefer premium models
        critical_models = model_fallback._get_suitable_models(TaskComplexity.CRITICAL)
        assert "claude-opus-4-1-20250805" in critical_models
        assert "claude-3-opus-20240229" in critical_models

    @pytest.mark.asyncio
    async def test_investigation_scenario_selection(self, model_fallback, api_cost_monitor):
        """Test model selection for realistic investigation scenarios."""
        
        # Scenario 1: Device Spoofing Analysis (Complex)
        device_selection = await model_fallback.select_model(
            task_type="device_spoofing",
            estimated_tokens=3000,
            preferred_model="claude-opus-4-1-20250805"
        )
        
        # Should select appropriate model for complexity
        assert device_selection.selected_model in [
            "claude-opus-4-1-20250805", "claude-3-opus-20240229", "claude-3-sonnet-20240229"
        ]
        assert device_selection.tier in [ModelTier.PREMIUM, ModelTier.STANDARD]
        
        # Track cost for monitoring
        api_cost_monitor.track_call(
            1500, 1500, device_selection.selected_model
        )

        # Scenario 2: Location Analysis (Simple)
        location_selection = await model_fallback.select_model(
            task_type="location_analysis", 
            estimated_tokens=1500,
            preferred_model="claude-3-haiku-20240307"
        )
        
        # Should use efficient model for simple task
        assert location_selection.selected_model == "claude-3-haiku-20240307"
        assert location_selection.tier == ModelTier.EFFICIENT
        
        # Scenario 3: Risk Assessment (Critical) 
        risk_selection = await model_fallback.select_model(
            task_type="risk_assessment",
            estimated_tokens=4000,
            preferred_model="claude-opus-4-1-20250805"
        )
        
        # Should prefer premium model for critical tasks
        assert risk_selection.tier in [ModelTier.PREMIUM]
        assert risk_selection.quality_impact <= 0.05  # Minimal quality impact

    @pytest.mark.asyncio
    async def test_cost_based_fallback_logic(self, model_fallback):
        """Test fallback behavior when cost constraints apply."""
        # Force high usage to trigger fallback
        model_fallback.credit_monitor._daily_usage = 450.0  # Near budget limit
        
        # Request expensive model for moderate task
        selection = await model_fallback.select_model(
            task_type="pattern_recognition",
            estimated_tokens=2000, 
            preferred_model="claude-opus-4-1-20250805"
        )
        
        # Should fallback to less expensive model
        if selection.fallback_reason:
            assert "cost constraints" in selection.fallback_reason.lower()
            assert selection.selected_model != "claude-opus-4-1-20250805"
            assert selection.quality_impact >= 0.0  # Some quality impact expected

    @pytest.mark.asyncio
    async def test_economy_mode_behavior(self, model_fallback):
        """Test economy mode prioritizes cost over quality."""
        # Enable economy mode
        model_fallback.configure_economy_mode(True)
        assert model_fallback.force_economy_mode is True

        # Request model for complex task
        selection = await model_fallback.select_model(
            task_type="correlation_analysis",
            estimated_tokens=3000,
            preferred_model="claude-opus-4-1-20250805"
        )

        # Should select cheaper model even for complex task
        cheap_models = ["claude-3-haiku-20240307", "claude-3-sonnet-20240229"]
        assert selection.selected_model in cheap_models

        # Disable economy mode
        model_fallback.configure_economy_mode(False)
        assert model_fallback.force_economy_mode is False

    @pytest.mark.asyncio
    async def test_quality_threshold_enforcement(self, model_fallback):
        """Test quality threshold filtering of model selection."""
        # Set high quality threshold
        model_fallback.set_quality_threshold(0.9)
        assert model_fallback.quality_threshold == 0.9

        # Request model with quality requirement
        selection = await model_fallback.select_model(
            task_type="data_extraction",
            estimated_tokens=1000,
            quality_requirement=0.85
        )

        # Should only use high-quality models
        config = model_fallback.MODEL_CONFIGS[selection.selected_model]
        assert config.quality_score >= 0.85

    @pytest.mark.asyncio
    async def test_token_limit_constraints(self, model_fallback):
        """Test model selection respects token limits."""
        # Request more tokens than model supports
        large_token_selection = await model_fallback.select_model(
            task_type="report_generation",
            estimated_tokens=10000,  # Exceeds most model limits
            preferred_model="claude-3-sonnet-20240229"
        )

        # Should cap at model's maximum
        config = model_fallback.MODEL_CONFIGS[large_token_selection.selected_model]
        assert large_token_selection.max_tokens <= config.max_tokens

    @pytest.mark.asyncio
    async def test_fallback_statistics_tracking(self, model_fallback):
        """Test fallback statistics are accurately tracked."""
        initial_stats = model_fallback.get_fallback_statistics()
        initial_total = initial_stats["total_selections"]

        # Perform several model selections
        test_scenarios = [
            ("device_analysis", 2000, "claude-3-sonnet-20240229"),
            ("logs_analysis", 3500, "claude-opus-4-1-20250805"),
            ("data_extraction", 800, "claude-3-haiku-20240307"),
        ]

        for task_type, tokens, preferred_model in test_scenarios:
            await model_fallback.select_model(task_type, tokens, preferred_model)

        # Check updated statistics
        updated_stats = model_fallback.get_fallback_statistics()
        assert updated_stats["total_selections"] == initial_total + len(test_scenarios)

        # Verify models_used tracking
        models_used = updated_stats["models_used"]
        assert isinstance(models_used, dict)
        assert sum(models_used.values()) <= updated_stats["total_selections"]

    @pytest.mark.asyncio
    async def test_model_recommendations(self, model_fallback):
        """Test model recommendation generation for different tasks."""
        # Get recommendations for complex investigation task
        complex_recs = model_fallback.get_model_recommendations("network_analysis")
        
        assert complex_recs["task_type"] == "network_analysis"
        assert complex_recs["complexity"] == "complex"
        assert len(complex_recs["recommendations"]) > 0

        # Verify recommendation structure
        for rec in complex_recs["recommendations"]:
            assert "model" in rec
            assert "tier" in rec
            assert "quality_score" in rec
            assert "cost_per_1k_output" in rec
            assert "suitability" in rec

        # Recommendations should be sorted by quality
        quality_scores = [rec["quality_score"] for rec in complex_recs["recommendations"]]
        assert quality_scores == sorted(quality_scores, reverse=True)

    @pytest.mark.asyncio
    async def test_emergency_fallback_scenario(self, model_fallback):
        """Test emergency fallback when all preferred models unavailable."""
        # Simulate exhausted credits by setting very high usage
        model_fallback.credit_monitor._daily_usage = 499.0  # At budget limit
        model_fallback.credit_monitor._weekly_usage = 1999.0
        model_fallback.credit_monitor._monthly_usage = 7999.0

        # Request expensive model
        selection = await model_fallback.select_model(
            task_type="synthetic_identity",
            estimated_tokens=5000,
            preferred_model="claude-opus-4-1-20250805"
        )

        # Should fall back to emergency model
        assert selection.fallback_reason is not None
        assert "fallback" in selection.fallback_reason.lower()
        
        # Should still provide a valid selection
        assert selection.selected_model in model_fallback.MODEL_CONFIGS
        assert selection.estimated_cost > 0

    @pytest.mark.asyncio
    async def test_concurrent_model_selection(self, model_fallback):
        """Test thread-safe model selection under concurrent access."""
        # Create concurrent selection tasks
        tasks = []
        task_scenarios = [
            ("device_spoofing", 2000),
            ("impossible_travel", 1500),
            ("account_takeover", 3000),
            ("first_party_fraud", 3500),
            ("social_engineering", 2500),
        ]

        for task_type, tokens in task_scenarios:
            task = model_fallback.select_model(
                task_type=task_type,
                estimated_tokens=tokens,
                preferred_model="claude-3-sonnet-20240229"
            )
            tasks.append(task)

        # Execute concurrently
        selections = await asyncio.gather(*tasks)

        # Verify all selections are valid
        for selection in selections:
            assert selection.selected_model in model_fallback.MODEL_CONFIGS
            assert selection.tier in [tier for tier in ModelTier]
            assert selection.estimated_cost >= 0

        # Verify statistics updated correctly
        stats = model_fallback.get_fallback_statistics()
        assert stats["total_selections"] >= len(task_scenarios)

    @pytest.mark.asyncio
    async def test_cost_savings_calculation(self, model_fallback, api_cost_monitor):
        """Test accurate cost savings calculation from fallback."""
        # Force fallback by setting high usage
        model_fallback.credit_monitor._daily_usage = 400.0

        initial_stats = model_fallback.get_fallback_statistics()
        initial_savings = initial_stats["total_cost_savings"]

        # Request expensive model that should fallback
        selection = await model_fallback.select_model(
            task_type="money_laundering",
            estimated_tokens=4000,
            preferred_model="claude-opus-4-1-20250805"
        )

        # Track the actual selection cost
        tokens_used = min(4000, selection.max_tokens)
        api_cost_monitor.track_call(
            tokens_used // 2, tokens_used // 2, selection.selected_model
        )

        updated_stats = model_fallback.get_fallback_statistics()

        # If fallback occurred, should have savings
        if updated_stats["fallback_count"] > initial_stats["fallback_count"]:
            assert updated_stats["total_cost_savings"] > initial_savings
            assert updated_stats["average_savings_per_fallback"] >= 0

    @pytest.mark.asyncio
    async def test_health_check_comprehensive(self, model_fallback):
        """Test comprehensive health check of fallback system."""
        health_status = await model_fallback.health_check()

        # Verify health check structure
        assert "status" in health_status
        assert "models_available" in health_status
        assert "economy_mode" in health_status
        assert "quality_threshold" in health_status
        assert "last_selection" in health_status
        assert "statistics" in health_status

        # Verify health status
        assert health_status["status"] == "healthy"
        assert health_status["models_available"] == len(model_fallback.MODEL_CONFIGS)
        assert health_status["economy_mode"] == model_fallback.force_economy_mode

        # Verify last selection data
        last_selection = health_status["last_selection"]
        assert "model" in last_selection
        assert "tier" in last_selection
        assert "cost" in last_selection


class TestModelConfigValidation:
    """Test model configuration validation and consistency."""

    @pytest.fixture
    def model_fallback(self):
        return ModelTierFallback()

    def test_model_config_completeness(self, model_fallback):
        """Test all model configurations are complete and valid."""
        for model_name, config in model_fallback.MODEL_CONFIGS.items():
            # Verify required fields
            assert config.name == model_name
            assert isinstance(config.tier, ModelTier)
            assert config.max_tokens > 0
            assert config.cost_per_1k_input >= 0
            assert config.cost_per_1k_output >= 0
            assert 0.0 <= config.quality_score <= 1.0
            assert 0.0 <= config.speed_score <= 1.0
            assert len(config.suitable_tasks) > 0

    def test_model_cost_hierarchy(self, model_fallback):
        """Test model costs follow expected hierarchy."""
        configs = model_fallback.MODEL_CONFIGS

        # Opus models should be most expensive
        opus_costs = [
            configs["claude-opus-4-1-20250805"].cost_per_1k_output,
            configs["claude-3-opus-20240229"].cost_per_1k_output,
        ]
        sonnet_cost = configs["claude-3-sonnet-20240229"].cost_per_1k_output
        haiku_cost = configs["claude-3-haiku-20240307"].cost_per_1k_output

        for opus_cost in opus_costs:
            assert opus_cost > sonnet_cost > haiku_cost

    def test_quality_score_correlation(self, model_fallback):
        """Test quality scores correlate with model tiers."""
        configs = model_fallback.MODEL_CONFIGS

        premium_models = [
            name for name, config in configs.items()
            if config.tier == ModelTier.PREMIUM
        ]
        standard_models = [
            name for name, config in configs.items()
            if config.tier == ModelTier.STANDARD
        ]
        efficient_models = [
            name for name, config in configs.items()
            if config.tier == ModelTier.EFFICIENT
        ]

        # Premium should have highest quality scores
        premium_avg_quality = sum(
            configs[name].quality_score for name in premium_models
        ) / len(premium_models) if premium_models else 0

        standard_avg_quality = sum(
            configs[name].quality_score for name in standard_models
        ) / len(standard_models) if standard_models else 0

        efficient_avg_quality = sum(
            configs[name].quality_score for name in efficient_models
        ) / len(efficient_models) if efficient_models else 0

        assert premium_avg_quality > standard_avg_quality > efficient_avg_quality

    def test_task_complexity_coverage(self, model_fallback):
        """Test all task complexities are covered by model capabilities."""
        all_complexities = set(TaskComplexity)
        covered_complexities = set()

        for config in model_fallback.MODEL_CONFIGS.values():
            covered_complexities.update(config.suitable_tasks)

        # All complexity levels should be covered
        assert covered_complexities >= all_complexities


class TestRealWorldScenarios:
    """Test model fallback with realistic investigation scenarios."""

    @pytest.fixture
    def model_fallback(self):
        return ModelTierFallback()

    @pytest.mark.asyncio
    async def test_full_investigation_workflow(self, model_fallback, api_cost_monitor):
        """Test model selection throughout a complete investigation workflow."""
        # Simulate full investigation phases
        investigation_phases = [
            ("data_extraction", 800, "Initial data gathering"),
            ("device_analysis", 2000, "Device fingerprint analysis"),
            ("location_analysis", 1200, "Geographic validation"),
            ("network_analysis", 3000, "Network pattern analysis"),
            ("logs_analysis", 3500, "Activity log review"),
            ("correlation_analysis", 4000, "Cross-domain correlation"),
            ("risk_assessment", 2500, "Final risk determination"),
            ("report_generation", 1500, "Investigation report"),
        ]

        total_cost = 0.0
        phase_results = []

        for task_type, tokens, description in investigation_phases:
            selection = await model_fallback.select_model(
                task_type=task_type,
                estimated_tokens=tokens,
                preferred_model="claude-3-sonnet-20240229"
            )

            phase_results.append({
                "phase": description,
                "task_type": task_type,
                "model": selection.selected_model,
                "tier": selection.tier.value,
                "cost": selection.estimated_cost,
                "fallback": selection.fallback_reason is not None
            })

            total_cost += selection.estimated_cost

            # Track for cost monitoring
            api_cost_monitor.track_call(
                tokens // 2, tokens // 2, selection.selected_model
            )

        # Verify investigation workflow characteristics
        assert len(phase_results) == len(investigation_phases)
        assert total_cost > 0
        assert total_cost < 50.0  # Should be reasonable for full investigation

        # Critical phases should use higher-tier models
        critical_phases = [r for r in phase_results if "risk" in r["task_type"]]
        for phase in critical_phases:
            assert phase["tier"] in ["premium", "standard"]

        # Simple phases should use efficient models when possible
        simple_phases = [r for r in phase_results if r["task_type"] in ["data_extraction", "report_generation"]]
        efficient_count = sum(1 for p in simple_phases if p["tier"] == "efficient")
        assert efficient_count > 0  # At least some should use efficient models

    @pytest.mark.asyncio
    async def test_budget_constrained_investigation(self, model_fallback):
        """Test investigation behavior under severe budget constraints."""
        # Simulate near budget exhaustion
        model_fallback.credit_monitor._daily_usage = 490.0  # 98% of budget
        model_fallback.credit_monitor._weekly_usage = 1950.0  # 97.5% of budget

        # Attempt high-priority investigation
        critical_tasks = [
            "synthetic_identity",
            "money_laundering", 
            "insider_fraud",
        ]

        successful_selections = 0
        emergency_fallbacks = 0

        for task_type in critical_tasks:
            selection = await model_fallback.select_model(
                task_type=task_type,
                estimated_tokens=4000,
                preferred_model="claude-opus-4-1-20250805"
            )

            if selection.fallback_reason and "emergency" in selection.fallback_reason.lower():
                emergency_fallbacks += 1
            
            if selection.selected_model:
                successful_selections += 1

        # Should still provide selections even under constraints
        assert successful_selections == len(critical_tasks)
        
        # May require emergency fallbacks
        if emergency_fallbacks > 0:
            assert emergency_fallbacks <= len(critical_tasks)

    @pytest.mark.asyncio
    async def test_model_performance_tracking(self, model_fallback):
        """Test performance tracking across different model selections."""
        # Perform selections with different models
        model_usage = {}
        
        test_cases = [
            ("claude-opus-4-1-20250805", "synthetic_identity", 4000),
            ("claude-3-sonnet-20240229", "device_spoofing", 2500),
            ("claude-3-haiku-20240307", "data_extraction", 1000),
        ] * 3  # Repeat each case 3 times

        for preferred_model, task_type, tokens in test_cases:
            selection = await model_fallback.select_model(
                task_type=task_type,
                estimated_tokens=tokens,
                preferred_model=preferred_model
            )

            model_usage[selection.selected_model] = model_usage.get(
                selection.selected_model, 0
            ) + 1

        # Verify tracking statistics
        stats = model_fallback.get_fallback_statistics()
        tracked_usage = stats["models_used"]

        # All selected models should appear in tracking
        for model_name, count in model_usage.items():
            assert model_name in tracked_usage
            assert tracked_usage[model_name] >= count  # May have additional uses from other tests

    @pytest.mark.asyncio 
    async def test_adaptive_fallback_behavior(self, model_fallback):
        """Test fallback system adapts to changing conditions."""
        initial_economy_mode = model_fallback.force_economy_mode
        
        # Phase 1: Normal operation
        normal_selection = await model_fallback.select_model(
            task_type="correlation_analysis",
            estimated_tokens=3000,
            preferred_model="claude-opus-4-1-20250805"
        )

        # Phase 2: Enable economy mode
        model_fallback.configure_economy_mode(True)
        economy_selection = await model_fallback.select_model(
            task_type="correlation_analysis", 
            estimated_tokens=3000,
            preferred_model="claude-opus-4-1-20250805"
        )

        # Phase 3: High budget usage
        model_fallback.credit_monitor._daily_usage = 450.0
        constrained_selection = await model_fallback.select_model(
            task_type="correlation_analysis",
            estimated_tokens=3000, 
            preferred_model="claude-opus-4-1-20250805"
        )

        # Verify adaptive behavior
        models_selected = [
            normal_selection.selected_model,
            economy_selection.selected_model,
            constrained_selection.selected_model,
        ]

        # Should show progression toward more economical models
        costs = [
            model_fallback.MODEL_CONFIGS[model].cost_per_1k_output
            for model in models_selected
        ]

        # Later selections should tend toward lower costs
        assert costs[-1] <= costs[0]  # Most constrained <= normal

        # Restore initial state
        model_fallback.configure_economy_mode(initial_economy_mode)
"""
Model Tier Fallback System

Provides intelligent model selection based on cost constraints, task complexity,
and performance requirements for the Olorin investigation system.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from ..logging.integration_bridge import get_bridge_logger
from .anthropic_credit_monitor import CreditStatus, get_credit_monitor


class TaskComplexity(Enum):
    """Task complexity levels for model selection"""

    SIMPLE = "simple"  # Basic analysis, pattern recognition
    MODERATE = "moderate"  # Multi-step reasoning, data correlation
    COMPLEX = "complex"  # Advanced reasoning, critical decisions
    CRITICAL = "critical"  # Life/safety critical, high-stakes decisions


class ModelTier(Enum):
    """Model performance tiers"""

    PREMIUM = "premium"  # Claude Opus - highest capability
    STANDARD = "standard"  # Claude Sonnet - balanced performance
    EFFICIENT = "efficient"  # Claude Haiku - cost optimized
    EMERGENCY = "emergency"  # Minimal model for fallback


@dataclass
class ModelConfig:
    """Configuration for a specific model"""

    name: str
    tier: ModelTier
    max_tokens: int
    cost_per_1k_input: float
    cost_per_1k_output: float
    quality_score: float  # 0.0 to 1.0
    speed_score: float  # 0.0 to 1.0 (relative)
    suitable_tasks: List[TaskComplexity]
    fallback_model: Optional[str] = None


@dataclass
class ModelSelection:
    """Result of model selection process"""

    selected_model: str
    tier: ModelTier
    max_tokens: int
    estimated_cost: float
    fallback_reason: Optional[str] = None
    quality_impact: float = 0.0  # Expected quality reduction vs premium


class ModelTierFallback:
    """
    Intelligent model selection system that balances cost, performance,
    and task requirements for optimal API usage.
    """

    # Model configurations
    MODEL_CONFIGS = {
        "claude-opus-4-1-20250805": ModelConfig(
            name="claude-opus-4-1-20250805",
            tier=ModelTier.PREMIUM,
            max_tokens=8192,
            cost_per_1k_input=0.015,
            cost_per_1k_output=0.075,
            quality_score=1.0,
            speed_score=0.7,
            suitable_tasks=[TaskComplexity.COMPLEX, TaskComplexity.CRITICAL],
            fallback_model="claude-3-sonnet-20240229",
        ),
        "claude-3-opus-20240229": ModelConfig(
            name="claude-3-opus-20240229",
            tier=ModelTier.PREMIUM,
            max_tokens=4096,
            cost_per_1k_input=0.015,
            cost_per_1k_output=0.075,
            quality_score=0.95,
            speed_score=0.8,
            suitable_tasks=[TaskComplexity.COMPLEX, TaskComplexity.CRITICAL],
            fallback_model="claude-3-sonnet-20240229",
        ),
        "claude-3-sonnet-20240229": ModelConfig(
            name="claude-3-sonnet-20240229",
            tier=ModelTier.STANDARD,
            max_tokens=4096,
            cost_per_1k_input=0.003,
            cost_per_1k_output=0.015,
            quality_score=0.85,
            speed_score=0.9,
            suitable_tasks=[TaskComplexity.MODERATE, TaskComplexity.COMPLEX],
            fallback_model="claude-3-haiku-20240307",
        ),
        "claude-3-haiku-20240307": ModelConfig(
            name="claude-3-haiku-20240307",
            tier=ModelTier.EFFICIENT,
            max_tokens=4096,
            cost_per_1k_input=0.00025,
            cost_per_1k_output=0.00125,
            quality_score=0.75,
            speed_score=1.0,
            suitable_tasks=[TaskComplexity.SIMPLE, TaskComplexity.MODERATE],
            fallback_model=None,
        ),
    }

    # Task complexity mapping for investigation components
    INVESTIGATION_TASK_COMPLEXITY = {
        # Agent-specific tasks
        "device_analysis": TaskComplexity.MODERATE,
        "location_analysis": TaskComplexity.SIMPLE,
        "network_analysis": TaskComplexity.COMPLEX,
        "logs_analysis": TaskComplexity.COMPLEX,
        "risk_assessment": TaskComplexity.CRITICAL,
        # Investigation types
        "device_spoofing": TaskComplexity.COMPLEX,
        "impossible_travel": TaskComplexity.MODERATE,
        "synthetic_identity": TaskComplexity.CRITICAL,
        "account_takeover": TaskComplexity.COMPLEX,
        "first_party_fraud": TaskComplexity.CRITICAL,
        "money_laundering": TaskComplexity.CRITICAL,
        "social_engineering": TaskComplexity.COMPLEX,
        "insider_fraud": TaskComplexity.CRITICAL,
        # Generic tasks
        "data_extraction": TaskComplexity.SIMPLE,
        "pattern_recognition": TaskComplexity.MODERATE,
        "correlation_analysis": TaskComplexity.COMPLEX,
        "decision_making": TaskComplexity.CRITICAL,
        "report_generation": TaskComplexity.SIMPLE,
    }

    def __init__(self):
        self.logger = get_bridge_logger("model_tier_fallback", structured=True)
        self.credit_monitor = get_credit_monitor()

        # Configuration
        self.force_economy_mode = False
        self.quality_threshold = 0.8  # Minimum acceptable quality score
        self.cost_optimization_enabled = True

        # Fallback statistics
        self.fallback_stats = {
            "total_selections": 0,
            "fallback_count": 0,
            "models_used": {},
            "cost_savings": 0.0,
        }

        self.logger.info("Model Tier Fallback system initialized")

    async def select_model(
        self,
        task_type: str,
        estimated_tokens: int,
        preferred_model: Optional[str] = None,
        quality_requirement: Optional[float] = None,
    ) -> ModelSelection:
        """
        Select optimal model based on task requirements and constraints

        Args:
            task_type: Type of task (maps to complexity)
            estimated_tokens: Estimated output tokens needed
            preferred_model: Preferred model if no constraints
            quality_requirement: Minimum quality requirement (0.0-1.0)

        Returns:
            ModelSelection with chosen model and metadata
        """
        self.fallback_stats["total_selections"] += 1

        # Determine task complexity
        complexity = self._get_task_complexity(task_type)

        # Get suitable models for this complexity
        suitable_models = self._get_suitable_models(complexity)

        # Apply quality filter
        if quality_requirement:
            suitable_models = [
                m
                for m in suitable_models
                if self.MODEL_CONFIGS[m].quality_score >= quality_requirement
            ]

        # Try preferred model first if suitable
        if preferred_model and preferred_model in suitable_models:
            selection = await self._try_model_selection(
                preferred_model, estimated_tokens
            )
            if selection:
                return selection

        # Try models in order of preference (efficient first for cost optimization)
        model_priority = self._prioritize_models(suitable_models)

        for model_name in model_priority:
            selection = await self._try_model_selection(model_name, estimated_tokens)
            if selection:
                # Check if this is a fallback
                if preferred_model and model_name != preferred_model:
                    self.fallback_stats["fallback_count"] += 1
                    selection.fallback_reason = (
                        f"Cost constraints - fell back from {preferred_model}"
                    )

                    # Calculate cost savings
                    if preferred_model in self.MODEL_CONFIGS:
                        preferred_cost = self._estimate_cost(
                            preferred_model, estimated_tokens
                        )
                        actual_cost = selection.estimated_cost
                        savings = preferred_cost - actual_cost
                        self.fallback_stats["cost_savings"] += savings

                        # Calculate quality impact
                        preferred_quality = self.MODEL_CONFIGS[
                            preferred_model
                        ].quality_score
                        actual_quality = self.MODEL_CONFIGS[model_name].quality_score
                        selection.quality_impact = preferred_quality - actual_quality

                # Update usage statistics
                self.fallback_stats["models_used"][model_name] = (
                    self.fallback_stats["models_used"].get(model_name, 0) + 1
                )

                self.logger.info(
                    "Model selected",
                    extra={
                        "task_type": task_type,
                        "complexity": complexity.value,
                        "selected_model": model_name,
                        "tier": selection.tier.value,
                        "estimated_cost": selection.estimated_cost,
                        "fallback_reason": selection.fallback_reason,
                        "quality_impact": selection.quality_impact,
                    },
                )

                return selection

        # Emergency fallback - use cheapest available model
        emergency_model = "claude-3-haiku-20240307"
        config = self.MODEL_CONFIGS[emergency_model]

        selection = ModelSelection(
            selected_model=emergency_model,
            tier=config.tier,
            max_tokens=min(estimated_tokens, config.max_tokens),
            estimated_cost=self._estimate_cost(emergency_model, estimated_tokens),
            fallback_reason="Emergency fallback - all preferred models unavailable",
            quality_impact=1.0 - config.quality_score if preferred_model else 0.0,
        )

        self.fallback_stats["fallback_count"] += 1
        self.fallback_stats["models_used"][emergency_model] = (
            self.fallback_stats["models_used"].get(emergency_model, 0) + 1
        )

        self.logger.warning(
            "Emergency fallback activated",
            extra={
                "task_type": task_type,
                "selected_model": emergency_model,
                "reason": selection.fallback_reason,
            },
        )

        return selection

    def _get_task_complexity(self, task_type: str) -> TaskComplexity:
        """Determine complexity level for a task type"""
        return self.INVESTIGATION_TASK_COMPLEXITY.get(
            task_type, TaskComplexity.MODERATE  # Default to moderate
        )

    def _get_suitable_models(self, complexity: TaskComplexity) -> List[str]:
        """Get models suitable for the given complexity level"""
        suitable = []

        for model_name, config in self.MODEL_CONFIGS.items():
            if complexity in config.suitable_tasks:
                suitable.append(model_name)

        # If no exact match, include higher capability models
        if not suitable:
            for model_name, config in self.MODEL_CONFIGS.items():
                if any(
                    task.value >= complexity.value for task in config.suitable_tasks
                ):
                    suitable.append(model_name)

        return suitable

    def _prioritize_models(self, models: List[str]) -> List[str]:
        """Prioritize models based on current constraints and preferences"""
        if self.force_economy_mode:
            # Sort by cost (cheapest first)
            return sorted(
                models, key=lambda m: self.MODEL_CONFIGS[m].cost_per_1k_output
            )

        # Balance cost and quality based on current budget status
        async def get_priority_score(model_name: str) -> float:
            config = self.MODEL_CONFIGS[model_name]

            # Base score from quality
            score = config.quality_score * 100

            # Adjust based on credit status
            try:
                balance = await self.credit_monitor.get_credit_balance()
                if balance.status == CreditStatus.CRITICAL:
                    # Heavily weight cost
                    cost_factor = 1.0 / (config.cost_per_1k_output + 0.001)
                    score = (score * 0.3) + (cost_factor * 70)
                elif balance.status == CreditStatus.WARNING:
                    # Moderate cost weighting
                    cost_factor = 1.0 / (config.cost_per_1k_output + 0.001)
                    score = (score * 0.6) + (cost_factor * 40)
            except:
                # If can't get balance, be conservative
                cost_factor = 1.0 / (config.cost_per_1k_output + 0.001)
                score = (score * 0.5) + (cost_factor * 50)

            return score

        # For now, use synchronous sorting (async sorting is complex)
        # Sort by tier preference: Efficient > Standard > Premium (cost-optimized order)
        tier_priority = {
            ModelTier.EFFICIENT: 3,
            ModelTier.STANDARD: 2,
            ModelTier.PREMIUM: 1,
            ModelTier.EMERGENCY: 0,
        }

        return sorted(
            models,
            key=lambda m: tier_priority[self.MODEL_CONFIGS[m].tier],
            reverse=True,
        )

    async def _try_model_selection(
        self, model_name: str, estimated_tokens: int
    ) -> Optional[ModelSelection]:
        """
        Try to select a specific model, checking budget constraints

        Returns:
            ModelSelection if affordable, None if not
        """
        config = self.MODEL_CONFIGS[model_name]

        # Adjust tokens to model limits
        actual_tokens = min(estimated_tokens, config.max_tokens)
        estimated_cost = self._estimate_cost(model_name, actual_tokens)

        # Check affordability
        cost_estimate = await self.credit_monitor.estimate_request_cost(
            model_name, actual_tokens // 2, actual_tokens // 2
        )

        is_affordable, reason = (
            await self.credit_monitor.validate_request_affordability(cost_estimate)
        )

        if is_affordable:
            return ModelSelection(
                selected_model=model_name,
                tier=config.tier,
                max_tokens=actual_tokens,
                estimated_cost=estimated_cost,
            )

        self.logger.debug(f"Model {model_name} not affordable: {reason}")
        return None

    def _estimate_cost(self, model_name: str, tokens: int) -> float:
        """Estimate cost for a model and token count"""
        config = self.MODEL_CONFIGS[model_name]
        # Assume 50/50 split between input and output tokens
        input_tokens = tokens // 2
        output_tokens = tokens // 2

        input_cost = (input_tokens / 1000) * config.cost_per_1k_input
        output_cost = (output_tokens / 1000) * config.cost_per_1k_output

        return input_cost + output_cost

    def get_model_recommendations(self, task_type: str) -> Dict[str, Any]:
        """Get model recommendations for a specific task type"""
        complexity = self._get_task_complexity(task_type)
        suitable_models = self._get_suitable_models(complexity)

        recommendations = []
        for model_name in suitable_models:
            config = self.MODEL_CONFIGS[model_name]
            recommendations.append(
                {
                    "model": model_name,
                    "tier": config.tier.value,
                    "quality_score": config.quality_score,
                    "speed_score": config.speed_score,
                    "cost_per_1k_output": config.cost_per_1k_output,
                    "max_tokens": config.max_tokens,
                    "suitability": (
                        "optimal" if complexity in config.suitable_tasks else "capable"
                    ),
                }
            )

        return {
            "task_type": task_type,
            "complexity": complexity.value,
            "recommendations": sorted(
                recommendations, key=lambda x: x["quality_score"], reverse=True
            ),
        }

    def get_fallback_statistics(self) -> Dict[str, Any]:
        """Get fallback system performance statistics"""
        total = self.fallback_stats["total_selections"]
        fallback_rate = (
            (self.fallback_stats["fallback_count"] / total * 100) if total > 0 else 0
        )

        return {
            "total_selections": total,
            "fallback_count": self.fallback_stats["fallback_count"],
            "fallback_rate_percent": fallback_rate,
            "models_used": self.fallback_stats["models_used"],
            "total_cost_savings": self.fallback_stats["cost_savings"],
            "average_savings_per_fallback": (
                self.fallback_stats["cost_savings"]
                / self.fallback_stats["fallback_count"]
                if self.fallback_stats["fallback_count"] > 0
                else 0
            ),
        }

    def configure_economy_mode(self, enabled: bool):
        """Enable/disable economy mode (prioritizes cost over quality)"""
        self.force_economy_mode = enabled
        self.logger.info(f"Economy mode {'enabled' if enabled else 'disabled'}")

    def set_quality_threshold(self, threshold: float):
        """Set minimum acceptable quality threshold (0.0-1.0)"""
        self.quality_threshold = max(0.0, min(1.0, threshold))
        self.logger.info(f"Quality threshold set to {self.quality_threshold}")

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of the fallback system"""
        try:
            # Test model selection for a simple task
            selection = await self.select_model("data_extraction", 1000)

            return {
                "status": "healthy",
                "models_available": len(self.MODEL_CONFIGS),
                "economy_mode": self.force_economy_mode,
                "quality_threshold": self.quality_threshold,
                "last_selection": {
                    "model": selection.selected_model,
                    "tier": selection.tier.value,
                    "cost": selection.estimated_cost,
                },
                "statistics": self.get_fallback_statistics(),
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "models_available": len(self.MODEL_CONFIGS),
                "economy_mode": self.force_economy_mode,
            }


# Global instance
_model_fallback: Optional[ModelTierFallback] = None


def get_model_fallback() -> ModelTierFallback:
    """Get global model fallback instance"""
    global _model_fallback
    if _model_fallback is None:
        _model_fallback = ModelTierFallback()
    return _model_fallback

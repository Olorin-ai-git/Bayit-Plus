"""
Dynamic Limits Calculator for Hybrid Intelligence Graph

This module calculates context-aware dynamic safety limits based on
investigation mode, strategy, AI confidence, and safety level.
"""

import os
from typing import TYPE_CHECKING

from ..models import SafetyLevel, SafetyLimits, get_safety_threshold_config
from ...state.enums_and_constants import InvestigationStrategy
from app.service.logging import get_bridge_logger

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class DynamicLimitsCalculator:
    """
    Calculates context-aware dynamic safety limits.
    
    Limits are dynamically adjusted based on:
    - Operating mode (test vs live)
    - Current safety level
    - Investigation strategy
    - AI confidence patterns
    - Risk indicators
    """
    
    def __init__(self):
        """Initialize dynamic limits calculator"""
        self.threshold_config = get_safety_threshold_config()
        
        # Additional scaling factors for special conditions
        self.confidence_scaling = {
            "high_confidence_bonus": 1.1,     # 10% bonus for sustained high confidence
            "low_confidence_penalty": 0.9     # 10% penalty for sustained low confidence
        }
        
        # Performance-based adjustments
        self.performance_adjustments = {
            "fast_completion_bonus": 1.05,    # 5% bonus for fast progress
            "slow_progress_penalty": 0.95     # 5% penalty for slow progress
        }
    
    def calculate_dynamic_limits(
        self,
        state: 'HybridInvestigationState',
        safety_level: SafetyLevel
    ) -> SafetyLimits:
        """
        Calculate context-aware dynamic limits based on current state.
        
        Args:
            state: Current investigation state
            safety_level: Current safety level
            
        Returns:
            Calculated safety limits adjusted for context
        """
        # Get base limits for current mode
<<<<<<< HEAD
        is_test_mode = os.environ.get('TEST_MODE', '').lower() == 'mock'
=======
        is_test_mode = os.environ.get('TEST_MODE', '').lower() == 'demo'
>>>>>>> 001-modify-analyzer-method
        base_limits = self.threshold_config.get_base_limits_for_mode(is_test_mode)
        
        # Get safety level multipliers
        safety_multipliers = self.threshold_config.get_safety_multipliers_for_level(safety_level)
        
        # Get strategy adjustments
        strategy = state.get("investigation_strategy", InvestigationStrategy.ADAPTIVE)
        strategy_adjustments = self.threshold_config.get_strategy_adjustments(strategy)
        
        # Apply additional context-based adjustments
        context_adjustments = self._calculate_context_adjustments(state)
        
        # Calculate final limits with all adjustments
        limits = SafetyLimits(
            max_orchestrator_loops=int(
                base_limits["max_orchestrator_loops"] * 
                safety_multipliers["loops"] * 
                strategy_adjustments["loops"] * 
                context_adjustments["loops"]
            ),
            max_tool_executions=int(
                base_limits["max_tool_executions"] * 
                safety_multipliers["tools"] * 
                strategy_adjustments["tools"] * 
                context_adjustments["tools"]
            ),
            max_domain_attempts=int(
                base_limits["max_domain_attempts"] * 
                safety_multipliers["domains"] * 
                strategy_adjustments["domains"] * 
                context_adjustments["domains"]
            ),
            max_investigation_time_minutes=int(
                base_limits["max_investigation_time_minutes"] * 
                safety_multipliers["time"] * 
                strategy_adjustments["time"] * 
                context_adjustments["time"]
            ),
            confidence_threshold_for_override=base_limits["confidence_threshold_for_override"],
            resource_pressure_threshold=base_limits["resource_pressure_threshold"]
        )
        
        self._log_limits_calculation(limits, safety_level, strategy, is_test_mode, context_adjustments)
        
        return limits
    
    def _calculate_context_adjustments(self, state: 'HybridInvestigationState') -> dict:
        """Calculate additional context-based adjustments"""
        adjustments = {"loops": 1.0, "tools": 1.0, "domains": 1.0, "time": 1.0}
        
        # Confidence-based adjustments
        confidence_adj = self._calculate_confidence_adjustments(state)
        for key in adjustments:
            adjustments[key] *= confidence_adj
        
        # Performance-based adjustments
        performance_adj = self._calculate_performance_adjustments(state)
        for key in adjustments:
            adjustments[key] *= performance_adj
        
        # Ensure adjustments stay within reasonable bounds
        for key in adjustments:
            adjustments[key] = max(0.5, min(2.0, adjustments[key]))
        
        return adjustments
    
    def _calculate_confidence_adjustments(self, state: 'HybridInvestigationState') -> float:
        """Calculate adjustments based on confidence patterns"""
        confidence_history = state.get("confidence_evolution", [])
        
        if len(confidence_history) < 3:
            return 1.0  # Not enough history
        
        # Check for sustained high confidence
        recent_confidences = [entry["confidence"] for entry in confidence_history[-3:]]
        if all(conf > 0.8 for conf in recent_confidences):
            logger.debug(f"   📈 High confidence bonus applied: {self.confidence_scaling['high_confidence_bonus']}")
            return self.confidence_scaling["high_confidence_bonus"]
        
        # Check for sustained low confidence
        if all(conf < 0.4 for conf in recent_confidences):
            logger.debug(f"   📉 Low confidence penalty applied: {self.confidence_scaling['low_confidence_penalty']}")
            return self.confidence_scaling["low_confidence_penalty"]
        
        return 1.0
    
    def _calculate_performance_adjustments(self, state: 'HybridInvestigationState') -> float:
        """Calculate adjustments based on investigation performance"""
        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))
        
        if orchestrator_loops == 0:
            return 1.0
        
        # Calculate domains per loop ratio
        domains_per_loop = domains_completed / orchestrator_loops
        
        # Fast progress: >0.5 domains per loop
        if domains_per_loop > 0.5:
            logger.debug(f"   🚀 Fast progress bonus applied: {self.performance_adjustments['fast_completion_bonus']}")
            return self.performance_adjustments["fast_completion_bonus"]
        
        # Slow progress: <0.2 domains per loop after 5+ loops
        if orchestrator_loops >= 5 and domains_per_loop < 0.2:
            logger.debug(f"   🐌 Slow progress penalty applied: {self.performance_adjustments['slow_progress_penalty']}")
            return self.performance_adjustments["slow_progress_penalty"]
        
        return 1.0
    
    def _log_limits_calculation(self, 
                               limits: SafetyLimits, 
                               safety_level: SafetyLevel, 
                               strategy: InvestigationStrategy,
                               is_test_mode: bool,
                               context_adjustments: dict):
        """Log detailed limits calculation for debugging"""
        mode = "test" if is_test_mode else "live"
        
        logger.debug(f"   📊 Hybrid Intelligence dynamic limits calculated:")
        logger.debug(f"      Orchestrator loops: {limits.max_orchestrator_loops}")
        logger.debug(f"      Tool executions: {limits.max_tool_executions}")
        logger.debug(f"      Domain attempts: {limits.max_domain_attempts}")
        logger.debug(f"      Time limit: {limits.max_investigation_time_minutes} minutes")
        logger.debug(f"      Safety level: {safety_level.value}")
        logger.debug(f"      Strategy: {strategy.value}")
        logger.debug(f"      Mode: {mode}")
        
        # Log context adjustments if they're not neutral
        non_neutral_adjustments = {k: v for k, v in context_adjustments.items() if abs(v - 1.0) > 0.01}
        if non_neutral_adjustments:
            logger.debug(f"      Context adjustments: {non_neutral_adjustments}")
        
        logger.debug(f"   AI-adaptive limits: Confidence-based resource allocation")
    
    def get_limits_explanation(self, 
                              state: 'HybridInvestigationState', 
                              safety_level: SafetyLevel) -> str:
        """
        Get human-readable explanation of how limits were calculated.
        
        Args:
            state: Current investigation state
            safety_level: Current safety level
            
        Returns:
            Human-readable explanation
        """
<<<<<<< HEAD
        is_test_mode = os.environ.get('TEST_MODE', '').lower() == 'mock'
=======
        is_test_mode = os.environ.get('TEST_MODE', '').lower() == 'demo'
>>>>>>> 001-modify-analyzer-method
        strategy = state.get("investigation_strategy", InvestigationStrategy.ADAPTIVE)
        context_adjustments = self._calculate_context_adjustments(state)
        
        explanation_parts = [
            f"Mode: {'Test' if is_test_mode else 'Live'}",
            f"Safety Level: {safety_level.value.title()}",
            f"Strategy: {strategy.value.title().replace('_', ' ')}"
        ]
        
        # Add context adjustments if significant
        significant_adjustments = []
        for key, value in context_adjustments.items():
            if abs(value - 1.0) > 0.05:  # More than 5% adjustment
                change = "increased" if value > 1.0 else "decreased"
                percentage = abs(value - 1.0) * 100
                significant_adjustments.append(f"{key} {change} by {percentage:.0f}%")
        
        if significant_adjustments:
            explanation_parts.append(f"Adjustments: {', '.join(significant_adjustments)}")
        
        return "; ".join(explanation_parts)
    
    def update_scaling_factors(self,
                              high_confidence_bonus: float = None,
                              low_confidence_penalty: float = None,
                              fast_completion_bonus: float = None,
                              slow_progress_penalty: float = None):
        """
        Update scaling factors for dynamic adjustments.
        
        Args:
            high_confidence_bonus: Bonus multiplier for high confidence
            low_confidence_penalty: Penalty multiplier for low confidence
            fast_completion_bonus: Bonus multiplier for fast progress
            slow_progress_penalty: Penalty multiplier for slow progress
        """
        if high_confidence_bonus is not None:
            self.confidence_scaling["high_confidence_bonus"] = high_confidence_bonus
            logger.info(f"Updated high confidence bonus to {high_confidence_bonus}")
        
        if low_confidence_penalty is not None:
            self.confidence_scaling["low_confidence_penalty"] = low_confidence_penalty
            logger.info(f"Updated low confidence penalty to {low_confidence_penalty}")
        
        if fast_completion_bonus is not None:
            self.performance_adjustments["fast_completion_bonus"] = fast_completion_bonus
            logger.info(f"Updated fast completion bonus to {fast_completion_bonus}")
        
        if slow_progress_penalty is not None:
            self.performance_adjustments["slow_progress_penalty"] = slow_progress_penalty
            logger.info(f"Updated slow progress penalty to {slow_progress_penalty}")


# Global calculator instance
_dynamic_limits_calculator = None


def get_dynamic_limits_calculator() -> DynamicLimitsCalculator:
    """Get the global dynamic limits calculator instance"""
    global _dynamic_limits_calculator
    if _dynamic_limits_calculator is None:
        _dynamic_limits_calculator = DynamicLimitsCalculator()
    return _dynamic_limits_calculator


def reset_dynamic_limits_calculator():
    """Reset the global calculator (useful for testing)"""
    global _dynamic_limits_calculator
    _dynamic_limits_calculator = None
"""
Safety Threshold Configuration for Hybrid Intelligence Graph

This module provides centralized configuration for safety thresholds,
base limits, and multipliers used in dynamic safety management.
"""

from typing import Dict, Any
from enum import Enum

from .safety_models import SafetyLevel
from ...state.enums_and_constants import InvestigationStrategy
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SafetyThresholdConfig:
    """
    Centralized configuration for all safety thresholds and limits.
    
    This class encapsulates the base limits, safety multipliers, and
    strategy adjustments used throughout the safety management system.
    """
    
    def __init__(self):
        """Initialize safety threshold configuration"""
        # Base safety limits for different operating modes
        self.base_limits = {
            "test": {
                "max_orchestrator_loops": 12,
                "max_tool_executions": 8,
                "max_domain_attempts": 6,
                "max_investigation_time_minutes": 10,
                "confidence_threshold_for_override": 0.3,
                "resource_pressure_threshold": 0.8
            },
            "live": {
                "max_orchestrator_loops": 25,
                "max_tool_executions": 15,
                "max_domain_attempts": 10,
                "max_investigation_time_minutes": 30,
                "confidence_threshold_for_override": 0.4,
                "resource_pressure_threshold": 0.7
            }
        }
        
        # Safety level multipliers for dynamic limit adjustment
        self.safety_multipliers = {
            SafetyLevel.PERMISSIVE: {
                "loops": 1.5, "tools": 1.3, "domains": 1.2, "time": 1.4
            },
            SafetyLevel.STANDARD: {
                "loops": 1.0, "tools": 1.0, "domains": 1.0, "time": 1.0
            },
            SafetyLevel.STRICT: {
                "loops": 0.7, "tools": 0.8, "domains": 0.8, "time": 0.8
            },
            SafetyLevel.EMERGENCY: {
                "loops": 0.5, "tools": 0.5, "domains": 0.5, "time": 0.5
            }
        }
        
        # Strategy-based adjustments for investigation approaches
        self.strategy_adjustments = {
            InvestigationStrategy.CRITICAL_PATH: {
                "loops": 0.8, "tools": 0.6, "domains": 0.5, "time": 0.7
            },
            InvestigationStrategy.MINIMAL: {
                "loops": 0.6, "tools": 0.5, "domains": 0.3, "time": 0.5
            },
            InvestigationStrategy.FOCUSED: {
                "loops": 0.9, "tools": 0.8, "domains": 0.7, "time": 0.8
            },
            InvestigationStrategy.ADAPTIVE: {
                "loops": 1.0, "tools": 1.0, "domains": 1.0, "time": 1.0
            },
            InvestigationStrategy.COMPREHENSIVE: {
                "loops": 1.2, "tools": 1.3, "domains": 1.5, "time": 1.4
            }
        }
    
    def get_base_limits_for_mode(self, is_test_mode: bool) -> Dict[str, Any]:
        """Get base limits for test or live mode"""
        mode_key = "test" if is_test_mode else "live"
        return self.base_limits[mode_key].copy()
    
    def get_safety_multipliers_for_level(self, safety_level: SafetyLevel) -> Dict[str, float]:
        """Get multipliers for given safety level"""
        return self.safety_multipliers.get(safety_level, self.safety_multipliers[SafetyLevel.STANDARD])
    
    def get_strategy_adjustments(self, strategy: InvestigationStrategy) -> Dict[str, float]:
        """Get adjustments for given investigation strategy"""
        return self.strategy_adjustments.get(strategy, self.strategy_adjustments[InvestigationStrategy.ADAPTIVE])
    
    def validate_configuration(self) -> bool:
        """Validate the entire configuration for consistency"""
        try:
            # Check base limits
            for mode, limits in self.base_limits.items():
                if not self._validate_base_limits(limits, mode):
                    return False
            
            # Check safety multipliers
            for level, multipliers in self.safety_multipliers.items():
                if not self._validate_multipliers(multipliers, f"safety_level_{level.value}"):
                    return False
            
            # Check strategy adjustments
            for strategy, adjustments in self.strategy_adjustments.items():
                if not self._validate_multipliers(adjustments, f"strategy_{strategy.value}"):
                    return False
            
            logger.debug("Safety threshold configuration validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Safety threshold configuration validation failed: {e}")
            return False
    
    def _validate_base_limits(self, limits: Dict[str, Any], mode: str) -> bool:
        """Validate base limits for a mode"""
        required_keys = [
            "max_orchestrator_loops", "max_tool_executions", "max_domain_attempts",
            "max_investigation_time_minutes", "confidence_threshold_for_override",
            "resource_pressure_threshold"
        ]
        
        for key in required_keys:
            if key not in limits:
                logger.error(f"Missing key '{key}' in {mode} mode limits")
                return False
            
            value = limits[key]
            if key.startswith("max_") and not isinstance(value, int) or value <= 0:
                logger.error(f"Invalid {key} in {mode} mode: {value}")
                return False
            
            if key.endswith("_threshold") and not (0.0 <= value <= 1.0):
                logger.error(f"Invalid threshold {key} in {mode} mode: {value}")
                return False
        
        return True
    
    def _validate_multipliers(self, multipliers: Dict[str, float], context: str) -> bool:
        """Validate multiplier values"""
        required_keys = ["loops", "tools", "domains", "time"]
        
        for key in required_keys:
            if key not in multipliers:
                logger.error(f"Missing multiplier '{key}' in {context}")
                return False
            
            value = multipliers[key]
            if not isinstance(value, (int, float)) or value <= 0:
                logger.error(f"Invalid multiplier {key} in {context}: {value}")
                return False
        
        return True


# Global configuration instance
_threshold_config = None


def get_safety_threshold_config() -> SafetyThresholdConfig:
    """Get the global safety threshold configuration instance"""
    global _threshold_config
    if _threshold_config is None:
        _threshold_config = SafetyThresholdConfig()
        if not _threshold_config.validate_configuration():
            logger.error("Safety threshold configuration is invalid!")
    return _threshold_config


def reset_safety_threshold_config():
    """Reset the global configuration (useful for testing)"""
    global _threshold_config
    _threshold_config = None
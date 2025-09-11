"""
Safety Threshold Configuration - Unified safety override and concern thresholds.

This module provides centralized configuration for safety override thresholds,
concern severity levels, and termination conditions to prevent premature
safety interventions while maintaining system protection.
"""

from typing import Dict, Any
from dataclasses import dataclass
from enum import Enum
import os

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class SafetyThresholdConfig:
    """
    Unified safety threshold configuration for all safety components.
    
    These thresholds determine when safety concerns escalate to different
    severity levels and when safety overrides are triggered.
    """
    
    # Safety override limits
    max_safety_overrides_before_termination: int = 15  # Increased from 8
    safety_override_rate_rollback_threshold: float = 0.50  # Increased from 0.30 (50%)
    
    # Concern severity escalation thresholds (as percentage of limits)
    warning_threshold_percentage: float = 0.70   # "high" severity at 70% of limit
    critical_threshold_percentage: float = 0.90  # "critical" severity at 90% of limit
    
    # Resource pressure thresholds
    moderate_pressure_threshold: float = 0.60   # Moderate resource pressure
    high_pressure_threshold: float = 0.80      # High resource pressure  
    critical_pressure_threshold: float = 0.95  # Critical pressure (was 0.9)
    
    # Time-based warning thresholds
    time_warning_threshold: float = 0.75       # Warn at 75% of time limit (was 0.8)
    time_critical_threshold: float = 0.90      # Critical at 90% of time limit
    
    # Loop-based warning thresholds  
    loop_warning_threshold: float = 0.75       # Warn at 75% of loop limit (was 0.8)
    loop_critical_threshold: float = 0.90      # Critical at 90% of loop limit
    
    # Evidence quality safety thresholds (imported from evidence_config)
    evidence_safety_trigger: float = 0.4       # Below this triggers safety concerns
    evidence_minimum_acceptable: float = 0.3   # Below this is insufficient
    
    # Rollback and system protection thresholds
    investigation_failure_rate_threshold: float = 0.25  # 25% failure rate (was 0.15)
    error_rate_rollback_threshold: float = 0.15         # 15% error rate (was 0.10)
    performance_degradation_threshold: float = 0.30     # 30% slower (was 0.20)
    
    # Memory and resource thresholds
    memory_usage_threshold: float = 0.90        # 90% memory usage (was 0.85)
    cpu_usage_threshold: float = 0.95           # 95% CPU usage (was 0.90) 
    response_time_p95_threshold: float = 8.0    # 8 second P95 (was 5.0)


class SafetyThresholdManager:
    """
    Manager for applying unified safety thresholds across all safety components.
    
    Provides methods to check if metrics exceed various severity thresholds
    and determine appropriate safety responses.
    """
    
    def __init__(self, custom_config: SafetyThresholdConfig = None):
        """Initialize with optional custom threshold configuration."""
        self.config = custom_config or SafetyThresholdConfig()
        
        # Adjust thresholds for test mode
        if self._is_test_mode():
            logger.debug("🧪 Applying test mode safety threshold adjustments")
            self.config = self._get_test_mode_config()
    
    def _is_test_mode(self) -> bool:
        """Check if running in test mode."""
        return os.environ.get('TEST_MODE', '').lower() == 'mock'
    
    def _get_test_mode_config(self) -> SafetyThresholdConfig:
        """Get test mode configuration with more lenient thresholds."""
        return SafetyThresholdConfig(
            # More lenient for testing
            max_safety_overrides_before_termination=20,  # Even higher for tests
            safety_override_rate_rollback_threshold=0.60,  # 60% in test mode
            
            # Same percentages but will result in lower absolute numbers
            warning_threshold_percentage=0.75,   # Slightly higher warning threshold
            critical_threshold_percentage=0.95,  # Higher critical threshold
            
            # More lenient pressure thresholds for test environment
            critical_pressure_threshold=0.98,    # Almost never critical in tests
            high_pressure_threshold=0.85,        # Higher threshold for tests
            
            # More time allowance in tests
            time_warning_threshold=0.80,         # Later warning
            time_critical_threshold=0.95,        # Later critical
            
            # More loop allowance in tests
            loop_warning_threshold=0.80,         # Later warning  
            loop_critical_threshold=0.95,        # Later critical
            
            # More lenient rollback thresholds
            investigation_failure_rate_threshold=0.40,  # 40% in tests
            error_rate_rollback_threshold=0.25,         # 25% in tests
            performance_degradation_threshold=0.50,     # 50% in tests
        )
    
    def get_loop_concern_severity(self, current_loops: int, max_loops: int) -> str:
        """
        Get concern severity for orchestrator loops.
        
        Args:
            current_loops: Current number of orchestrator loops
            max_loops: Maximum allowed loops
            
        Returns:
            Severity level: "low", "medium", "high", or "critical"
        """
        if max_loops <= 0:
            return "low"
            
        usage_percentage = current_loops / max_loops
        
        if usage_percentage >= self.config.critical_threshold_percentage:
            return "critical"
        elif usage_percentage >= self.config.warning_threshold_percentage:
            return "high"
        elif usage_percentage >= 0.5:  # 50% usage
            return "medium"
        else:
            return "low"
    
    def get_time_concern_severity(self, elapsed_minutes: float, max_minutes: int) -> str:
        """
        Get concern severity for investigation time.
        
        Args:
            elapsed_minutes: Current elapsed time in minutes
            max_minutes: Maximum allowed time in minutes
            
        Returns:
            Severity level: "low", "medium", "high", or "critical"
        """
        if max_minutes <= 0:
            return "low"
            
        usage_percentage = elapsed_minutes / max_minutes
        
        if usage_percentage >= self.config.critical_threshold_percentage:
            return "critical"
        elif usage_percentage >= self.config.warning_threshold_percentage:
            return "high"
        elif usage_percentage >= 0.5:  # 50% usage
            return "medium"
        else:
            return "low"
    
    def get_resource_pressure_severity(self, pressure: float) -> str:
        """
        Get concern severity for resource pressure.
        
        Args:
            pressure: Resource pressure value (0.0-1.0)
            
        Returns:
            Severity level: "low", "medium", "high", or "critical"
        """
        if pressure >= self.config.critical_pressure_threshold:
            return "critical"
        elif pressure >= self.config.high_pressure_threshold:
            return "high"
        elif pressure >= self.config.moderate_pressure_threshold:
            return "medium"
        else:
            return "low"
    
    def should_force_termination_for_safety_overrides(self, override_count: int) -> bool:
        """
        Check if safety override count requires forced termination.
        
        Args:
            override_count: Current number of safety overrides
            
        Returns:
            True if termination should be forced
        """
        should_terminate = override_count >= self.config.max_safety_overrides_before_termination
        
        if should_terminate:
            logger.warning(f"🚨 Safety override limit exceeded: {override_count} >= {self.config.max_safety_overrides_before_termination}")
        
        return should_terminate
    
    def should_trigger_rollback_for_override_rate(self, override_rate: float) -> bool:
        """
        Check if safety override rate requires system rollback.
        
        Args:
            override_rate: Current safety override rate (0.0-1.0)
            
        Returns:
            True if rollback should be triggered
        """
        should_rollback = override_rate > self.config.safety_override_rate_rollback_threshold
        
        if should_rollback:
            logger.warning(f"🚨 Safety override rate threshold exceeded: {override_rate:.2%} > {self.config.safety_override_rate_rollback_threshold:.2%}")
        
        return should_rollback
    
    def get_threshold_config(self) -> SafetyThresholdConfig:
        """Get the current threshold configuration."""
        return self.config
    
    def log_current_thresholds(self) -> None:
        """Log current threshold configuration for debugging."""
        mode = "TEST" if self._is_test_mode() else "LIVE"
        logger.info(f"🛡️ Safety Threshold Configuration ({mode} mode):")
        logger.info(f"   Max safety overrides: {self.config.max_safety_overrides_before_termination}")
        logger.info(f"   Override rate rollback: {self.config.safety_override_rate_rollback_threshold:.1%}")
        logger.info(f"   Warning threshold: {self.config.warning_threshold_percentage:.1%}")
        logger.info(f"   Critical threshold: {self.config.critical_threshold_percentage:.1%}")
        logger.info(f"   Critical pressure: {self.config.critical_pressure_threshold:.1%}")


# Global threshold manager instance
_threshold_manager = None

def get_safety_threshold_manager() -> SafetyThresholdManager:
    """Get the global safety threshold manager instance."""
    global _threshold_manager
    if _threshold_manager is None:
        _threshold_manager = SafetyThresholdManager()
        _threshold_manager.log_current_thresholds()
    return _threshold_manager


def get_safety_threshold_config() -> SafetyThresholdConfig:
    """Get the current safety threshold configuration."""
    return get_safety_threshold_manager().get_threshold_config()


def reset_safety_threshold_manager() -> None:
    """Reset the global threshold manager (useful for testing)."""
    global _threshold_manager
    _threshold_manager = None
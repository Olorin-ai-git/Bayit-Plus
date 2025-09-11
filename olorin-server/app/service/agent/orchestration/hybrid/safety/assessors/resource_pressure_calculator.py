"""
Resource Pressure Calculator for Hybrid Intelligence Graph

This module calculates current resource pressure based on usage patterns,
limits, and investigation progress with sophisticated weighted algorithms.
"""

from typing import TYPE_CHECKING
from datetime import datetime

from ..models import SafetyLimits
from app.service.logging import get_bridge_logger

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class ResourcePressureCalculator:
    """
    Calculates resource pressure using multi-signal weighted analysis.
    
    Resource pressure is calculated considering:
    - Tool execution patterns and frequency
    - Orchestrator loop progression
    - Time consumption relative to budgets
    - Domain completion progress
    - Warmup periods and thresholds
    """
    
    def __init__(self):
        """Initialize resource pressure calculator"""
        # Pressure calculation weights (must sum to 1.0)
        self.pressure_weights = {
            "tool_pressure": 0.5,      # Tool usage is most critical
            "loop_pressure": 0.3,      # Loop count secondary
            "time_pressure": 0.2       # Time pressure least critical
        }
        
        # Configuration parameters
        self.warmup_loops = 2           # Don't throttle in first N loops
        self.domain_progress_penalty = 0.1  # Penalty for lack of domain progress
        self.domain_progress_threshold = 0.2  # Domain progress required
        self.domain_check_loops = 5     # Check domain progress after N loops
    
    def calculate_resource_pressure(
        self,
        state: 'HybridInvestigationState',
        limits: SafetyLimits
    ) -> float:
        """
        Calculate current resource pressure (0.0 - 1.0) with warmup and weighted signals.
        
        Args:
            state: Current investigation state
            limits: Current safety limits
            
        Returns:
            Resource pressure value between 0.0 and 1.0
        """
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))
        
        # Warmup: Don't throttle immediately in the first few loops
        if orchestrator_loops < self.warmup_loops:
            logger.debug(f"   🔄 Warmup period: {orchestrator_loops}/{self.warmup_loops} loops - pressure limited to 0.0")
            return 0.0
        
        # Calculate individual pressure components
        loop_pressure = self._calculate_loop_pressure(orchestrator_loops, limits)
        tool_pressure = self._calculate_tool_pressure(tools_used, limits)
        domain_pressure = self._calculate_domain_pressure(domains_completed, limits)
        time_pressure = self._calculate_time_pressure(state, limits)
        
        # Apply weighted multi-signal approach (not worst-case max)
        overall_pressure = (
            self.pressure_weights["tool_pressure"] * tool_pressure +
            self.pressure_weights["loop_pressure"] * loop_pressure +
            self.pressure_weights["time_pressure"] * time_pressure
        )
        
        # Domain pressure penalty (only if significantly behind)
        domain_penalty = self._calculate_domain_penalty(domain_pressure, orchestrator_loops)
        overall_pressure += domain_penalty
        
        # Cap at 1.0
        overall_pressure = min(1.0, overall_pressure)
        
        self._log_pressure_breakdown(
            overall_pressure, loop_pressure, tool_pressure, 
            domain_pressure, time_pressure, domain_penalty,
            orchestrator_loops, tools_used, domains_completed, limits
        )
        
        return overall_pressure
    
    def _calculate_loop_pressure(self, orchestrator_loops: int, limits: SafetyLimits) -> float:
        """Calculate pressure from orchestrator loop usage"""
        return (orchestrator_loops or 0) / max(1, limits.max_orchestrator_loops)
    
    def _calculate_tool_pressure(self, tools_used: int, limits: SafetyLimits) -> float:
        """Calculate pressure from tool execution usage"""
        return (tools_used or 0) / max(1, limits.max_tool_executions)
    
    def _calculate_domain_pressure(self, domains_completed: int, limits: SafetyLimits) -> float:
        """Calculate pressure from domain completion usage"""
        return (domains_completed or 0) / max(1, limits.max_domain_attempts)
    
    def _calculate_time_pressure(self, state: 'HybridInvestigationState', limits: SafetyLimits) -> float:
        """Calculate pressure from time consumption"""
        start_time = state.get("start_time")
        if not start_time:
            return 0.0
        
        try:
            from dateutil.parser import parse
            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
            time_budget_minutes = getattr(limits, 'max_investigation_time_minutes', 60)  # 60 min default
            return elapsed_minutes / max(1, time_budget_minutes)
        except Exception:
            return 0.0
    
    def _calculate_domain_penalty(self, domain_pressure: float, orchestrator_loops: int) -> float:
        """Calculate penalty for lack of domain progress"""
        # Only apply penalty if behind on domain progress and after warmup
        if (domain_pressure < self.domain_progress_threshold and 
            orchestrator_loops > self.domain_check_loops):
            return self.domain_progress_penalty
        return 0.0
    
    def _log_pressure_breakdown(
        self,
        overall_pressure: float,
        loop_pressure: float,
        tool_pressure: float,
        domain_pressure: float,
        time_pressure: float,
        domain_penalty: float,
        orchestrator_loops: int,
        tools_used: int,
        domains_completed: int,
        limits: SafetyLimits
    ):
        """Log detailed pressure breakdown for debugging"""
        logger.debug(f"   📈 Hybrid Intelligence resource pressure: {overall_pressure:.3f}")
        logger.debug(f"      Loops: {loop_pressure:.3f} ({orchestrator_loops}/{limits.max_orchestrator_loops})")
        logger.debug(f"      Tools: {tool_pressure:.3f} ({tools_used}/{limits.max_tool_executions})")
        logger.debug(f"      Domains: {domain_pressure:.3f} ({domains_completed}/{limits.max_domain_attempts})")
        logger.debug(f"      Time: {time_pressure:.3f}")
        if domain_penalty > 0:
            logger.debug(f"      Domain penalty: {domain_penalty:.3f}")
        logger.debug(f"   Resource monitoring: Real-time utilization tracking for AI optimization")
    
    def get_pressure_breakdown(
        self,
        state: 'HybridInvestigationState',
        limits: SafetyLimits
    ) -> dict:
        """
        Get detailed breakdown of pressure components.
        
        Returns:
            Dictionary with pressure breakdown for analysis
        """
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))
        
        # Calculate individual components
        loop_pressure = self._calculate_loop_pressure(orchestrator_loops, limits)
        tool_pressure = self._calculate_tool_pressure(tools_used, limits)
        domain_pressure = self._calculate_domain_pressure(domains_completed, limits)
        time_pressure = self._calculate_time_pressure(state, limits)
        domain_penalty = self._calculate_domain_penalty(domain_pressure, orchestrator_loops)
        
        return {
            "loop_pressure": loop_pressure,
            "tool_pressure": tool_pressure,
            "domain_pressure": domain_pressure,
            "time_pressure": time_pressure,
            "domain_penalty": domain_penalty,
            "overall_pressure": min(1.0, (
                self.pressure_weights["tool_pressure"] * tool_pressure +
                self.pressure_weights["loop_pressure"] * loop_pressure +
                self.pressure_weights["time_pressure"] * time_pressure +
                domain_penalty
            )),
            "weights": self.pressure_weights.copy(),
            "usage_stats": {
                "orchestrator_loops": orchestrator_loops,
                "tools_used": tools_used,
                "domains_completed": domains_completed
            }
        }
    
    def update_weights(self, tool_weight: float = None, loop_weight: float = None, time_weight: float = None):
        """
        Update pressure calculation weights (useful for tuning).
        
        Args:
            tool_weight: Weight for tool pressure
            loop_weight: Weight for loop pressure  
            time_weight: Weight for time pressure
        """
        if tool_weight is not None:
            self.pressure_weights["tool_pressure"] = tool_weight
        if loop_weight is not None:
            self.pressure_weights["loop_pressure"] = loop_weight
        if time_weight is not None:
            self.pressure_weights["time_pressure"] = time_weight
        
        # Normalize weights to sum to 1.0
        total_weight = sum(self.pressure_weights.values())
        if total_weight > 0:
            for key in self.pressure_weights:
                self.pressure_weights[key] /= total_weight
            
            logger.info(f"Updated pressure weights: {self.pressure_weights}")
        else:
            logger.error("Invalid weights provided - all weights are zero")


# Global calculator instance
_resource_pressure_calculator = None


def get_resource_pressure_calculator() -> ResourcePressureCalculator:
    """Get the global resource pressure calculator instance"""
    global _resource_pressure_calculator
    if _resource_pressure_calculator is None:
        _resource_pressure_calculator = ResourcePressureCalculator()
    return _resource_pressure_calculator


def reset_resource_pressure_calculator():
    """Reset the global calculator (useful for testing)"""
    global _resource_pressure_calculator
    _resource_pressure_calculator = None
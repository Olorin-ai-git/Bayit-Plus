"""
Investigation Velocity Assessor

Assesses how efficiently the investigation is progressing for AI confidence calculation.
Investigation velocity has 5% weight in overall confidence.
"""

from datetime import datetime
from typing import List
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class VelocityAssessor:
    """
    Specialized assessor for investigation progress velocity.
    
    Analyzes investigation timing, phase progression, and efficiency
    to determine confidence in the investigation's progress rate.
    """
    
    def __init__(self):
        self.weight = 0.05  # Investigation velocity weight
        self.total_phases = 6  # initialization, snowflake, tools, domains, summary, complete
        self.phase_order = [
            "initialization", "snowflake_analysis", "tool_execution", 
            "domain_analysis", "summary", "complete"
        ]
        
    async def assess_evidence(self, state: HybridInvestigationState) -> float:
        """
        Assess how efficiently the investigation is progressing.
        
        Args:
            state: Current investigation state with timing information
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        start_time = state.get("start_time")
        if not start_time:
            logger.debug("   ⚡ Investigation velocity: No start time available (0.5)")
            return 0.5  # Default moderate velocity
        
        try:
            velocity = self._calculate_velocity(state, start_time)
            
            logger.debug(f"   ⚡ Investigation velocity: {velocity:.3f}")
            return velocity
            
        except Exception as e:
            logger.debug(f"   ⚡ Velocity calculation failed: {e}, using default 0.5")
            return 0.5
    
    def _calculate_velocity(self, state: HybridInvestigationState, start_time: str) -> float:
        """Calculate investigation velocity based on progress and time."""
        from dateutil.parser import parse
        
        # Parse start time and calculate elapsed time
        start_dt = parse(start_time)
        elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
        
        # Calculate progress metrics
        phases_completed = self._calculate_phases_completed(state)
        
        # Velocity = progress / time (with reasonable bounds)
        if elapsed_minutes <= 0:
            return 1.0  # Just started, perfect velocity
            
        velocity = (phases_completed / self.total_phases) / max(1.0, elapsed_minutes / 10.0)
        velocity = min(1.0, max(0.1, velocity))  # Bound between 0.1 and 1.0
        
        logger.debug(f"      Elapsed: {elapsed_minutes:.1f} min, Progress: {phases_completed}/{self.total_phases}")
        
        return velocity
    
    def _calculate_phases_completed(self, state: HybridInvestigationState) -> int:
        """Calculate number of phases completed based on current phase."""
        current_phase = state.get("current_phase", "initialization")
        
        try:
            phase_index = self.phase_order.index(current_phase)
            return phase_index + 1
        except ValueError:
            # Unknown phase, assume minimal progress
            return 1
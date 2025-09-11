"""
Completeness Tracker

Calculates how complete the investigation is based on phase and domain progress.
Provides progress metrics for investigation monitoring and completion estimation.
"""

from typing import Dict
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class CompletenessTracker:
    """
    Investigation completeness calculator and progress tracker.
    
    Monitors investigation progress across phases and domains to provide
    accurate completion metrics for resource planning and progress reporting.
    """
    
    def __init__(self):
        self.phase_weights = {
            "initialization": 0.1,
            "snowflake_analysis": 0.3,
            "tool_execution": 0.5,
            "domain_analysis": 0.8,
            "summary": 0.95,
            "complete": 1.0
        }
        self.total_domains = 6  # network, device, location, logs, authentication, risk
        
    async def calculate_investigation_completeness(self, state: HybridInvestigationState) -> float:
        """
        Calculate how complete the investigation is.
        
        Args:
            state: Current investigation state
            
        Returns:
            Completeness score between 0.0 and 1.0
        """
        # Calculate phase and domain completion
        phase_completion = self._calculate_phase_completion(state)
        domain_completion = self._calculate_domain_completion(state)
        
        # Weighted combination (phase progress weighted more heavily)
        completeness = (phase_completion * 0.6 + domain_completion * 0.4)
        
        logger.debug(f"   📊 Investigation completeness: {completeness:.3f}")
        logger.debug(f"      Phase: {phase_completion:.2f}, Domains: {domain_completion:.2f}")
        
        return min(1.0, completeness)
    
    def _calculate_phase_completion(self, state: HybridInvestigationState) -> float:
        """Calculate completion based on current investigation phase."""
        current_phase = state.get("current_phase", "initialization")
        return self.phase_weights.get(current_phase, 0.1)
    
    def _calculate_domain_completion(self, state: HybridInvestigationState) -> float:
        """Calculate completion based on domains completed."""
        domains_completed = len(state.get("domains_completed", []))
        return domains_completed / self.total_domains
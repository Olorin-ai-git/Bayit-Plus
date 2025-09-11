"""
Action Planner

Determines the next node/action to execute based on investigation strategy and current state.
Provides intelligent routing decisions for optimal investigation flow.
"""

from typing import List
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState, InvestigationStrategy

logger = get_bridge_logger(__name__)


class ActionPlanner:
    """
    Strategic action planning engine for investigation flow.
    
    Determines the optimal next action based on current investigation state,
    selected strategy, and confidence levels for efficient resource utilization.
    """
    
    def __init__(self):
        pass
        
    async def determine_next_action(
        self,
        state: HybridInvestigationState,
        confidence: float,
        strategy: InvestigationStrategy
    ) -> str:
        """
        Determine the next node/action to execute.
        
        Args:
            state: Current investigation state
            confidence: Overall AI confidence score
            strategy: Selected investigation strategy
            
        Returns:
            Next action/node identifier
        """
        current_phase = state.get("current_phase", "initialization")
        snowflake_completed = state.get("snowflake_completed", False)
        domains_completed = state.get("domains_completed", [])
        
        # Always do Snowflake first if not completed
        if not snowflake_completed:
            return "snowflake_analysis"
        
        # Strategy-specific routing
        next_action = await self._route_by_strategy(strategy, state, current_phase, domains_completed)
        
        logger.debug(f"   📋 Next action determined: {next_action}")
        return next_action
    
    async def _route_by_strategy(
        self,
        strategy: InvestigationStrategy,
        state: HybridInvestigationState,
        current_phase: str,
        domains_completed: List[str]
    ) -> str:
        """Route next action based on selected strategy."""
        
        if strategy == InvestigationStrategy.CRITICAL_PATH:
            return self._route_critical_path(domains_completed)
        
        elif strategy == InvestigationStrategy.MINIMAL:
            return self._route_minimal(domains_completed)
        
        elif strategy == InvestigationStrategy.FOCUSED:
            return await self._route_focused(state, domains_completed)
        
        elif strategy == InvestigationStrategy.ADAPTIVE:
            return self._route_adaptive(current_phase)
        
        else:  # COMPREHENSIVE
            return self._route_comprehensive(current_phase)
    
    def _route_critical_path(self, domains_completed: List[str]) -> str:
        """Route for critical path strategy - direct to risk assessment."""
        if "risk" not in domains_completed:
            return "risk_agent"
        return "summary"
    
    def _route_minimal(self, domains_completed: List[str]) -> str:
        """Route for minimal strategy - just risk assessment."""
        if "risk" not in domains_completed:
            return "risk_agent"
        return "summary"
    
    async def _route_focused(self, state: HybridInvestigationState, domains_completed: List[str]) -> str:
        """Route for focused strategy - priority domains based on evidence."""
        priority_domains = await self._get_priority_domains(state)
        for domain in priority_domains:
            if domain not in domains_completed:
                return f"{domain}_agent"
        return "summary"
    
    def _route_adaptive(self, current_phase: str) -> str:
        """Route for adaptive strategy - AI-driven decisions."""
        if current_phase == "tool_execution":
            return "domain_analysis"  # Let domain routing decide which agent
        elif current_phase == "domain_analysis":
            return "domain_analysis"  # Continue with next domain
        else:
            return "tool_execution"
    
    def _route_comprehensive(self, current_phase: str) -> str:
        """Route for comprehensive strategy - sequential execution."""
        if current_phase == "snowflake_analysis":
            return "tool_execution"
        elif current_phase == "tool_execution":
            return "domain_analysis"
        elif current_phase == "domain_analysis":
            return "domain_analysis"  # Continue with domains
        else:
            return "summary"
    
    async def _get_priority_domains(self, state: HybridInvestigationState) -> List[str]:
        """Get priority domain order based on evidence."""
        snowflake_data = state.get("snowflake_data", {})
        
        priority_domains = ["risk"]  # Always include risk assessment
        
        # Add domains based on evidence
        if snowflake_data.get("network_anomalies"):
            priority_domains.insert(-1, "network")
        
        if snowflake_data.get("device_indicators"):
            priority_domains.insert(-1, "device")
        
        if snowflake_data.get("location_anomalies"):
            priority_domains.insert(-1, "location")
        
        if snowflake_data.get("authentication_issues"):
            priority_domains.insert(-1, "authentication")
        
        if snowflake_data.get("suspicious_activity"):
            priority_domains.insert(-1, "logs")
        
        logger.debug(f"   📋 Priority domains: {priority_domains}")
        return priority_domains
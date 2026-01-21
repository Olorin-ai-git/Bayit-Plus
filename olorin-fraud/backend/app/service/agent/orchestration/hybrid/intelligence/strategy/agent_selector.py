"""
Agent Selector

Determines which agents should be activated based on investigation strategy and evidence.
Optimizes agent resource allocation for efficient investigation execution.
"""

from typing import List

from app.service.logging import get_bridge_logger

from ...state import HybridInvestigationState, InvestigationStrategy

logger = get_bridge_logger(__name__)


class AgentSelector:
    """
    Strategic agent activation engine for investigation orchestration.

    Determines optimal agent activation patterns based on investigation strategy,
    evidence quality, and resource constraints for efficient parallel execution.
    """

    def __init__(self):
        self.all_agents = [
            "network_agent",
            "device_agent",
            "location_agent",
            "logs_agent",
            "authentication_agent",
            "merchant_agent",
            "risk_agent",
        ]

    async def determine_agents_to_activate(
        self,
        state: HybridInvestigationState,
        strategy: InvestigationStrategy,
        confidence: float,
    ) -> List[str]:
        """
        Determine which agents should be activated.

        Args:
            state: Current investigation state
            strategy: Selected investigation strategy
            confidence: Overall AI confidence score

        Returns:
            List of agent identifiers to activate
        """
        agents = self._select_agents_by_strategy(strategy, state)

        logger.debug(f"   🤖 Agents to activate: {agents}")
        return agents

    def _select_agents_by_strategy(
        self, strategy: InvestigationStrategy, state: HybridInvestigationState
    ) -> List[str]:
        """Select agents based on investigation strategy."""

        if strategy == InvestigationStrategy.CRITICAL_PATH:
            return self._select_critical_path_agents()

        elif strategy == InvestigationStrategy.MINIMAL:
            return self._select_minimal_agents()

        elif strategy == InvestigationStrategy.FOCUSED:
            return self._select_focused_agents(state)

        else:  # ADAPTIVE or COMPREHENSIVE
            return self._select_comprehensive_agents()

    def _select_critical_path_agents(self) -> List[str]:
        """Select agents for critical path strategy - minimal essential agents."""
        return ["risk_agent"]

    def _select_minimal_agents(self) -> List[str]:
        """Select agents for minimal strategy - only risk assessment."""
        return ["risk_agent"]

    def _select_focused_agents(self, state: HybridInvestigationState) -> List[str]:
        """Select agents for focused strategy - priority domains plus risk."""
        # Get priority domains from evidence
        priority_domains = self._get_priority_domains_from_state(state)

        # Convert to agent names (excluding risk as it's added separately)
        priority_agents = [
            f"{domain}_agent" for domain in priority_domains if domain != "risk"
        ]

        # Always include risk agent
        return priority_agents + ["risk_agent"]

    def _select_comprehensive_agents(self) -> List[str]:
        """Select agents for comprehensive strategy - all available agents."""
        return self.all_agents.copy()

    def _get_priority_domains_from_state(
        self, state: HybridInvestigationState
    ) -> List[str]:
        """Extract priority domains based on Snowflake evidence."""
        snowflake_data = state.get("snowflake_data", {})
        priority_domains = ["risk"]  # Always include risk

        # Add domains based on evidence indicators
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

        return priority_domains

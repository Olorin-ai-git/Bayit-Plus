"""
Domain Analysis Handler

Handles the domain analysis phase of investigations.
"""

import os
from typing import Any, Dict, List

from langchain_core.messages import SystemMessage

from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    update_phase,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DomainAnalysisHandler:
    """Handles the domain analysis phase of investigations."""

    def __init__(self, create_enhanced_system_prompt_fn):
        """Initialize with enhanced prompt creator."""
        self._create_enhanced_system_prompt = create_enhanced_system_prompt_fn

    async def handle_domain_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle domain analysis phase - route to specialized agents."""
        logger.info(
            f"🎯 ORCHESTRATOR: _handle_domain_analysis called - Domain phase starting"
        )

        # Log mode detection
        self._log_mode_detection()

        # Check for completion conditions
        if self._should_complete_domain_analysis(state):
            return update_phase(state, "summary")

        # Check if all required domains are complete
        if self._all_domains_complete(state):
            logger.info("✅ All domain analyses complete, moving to summary")
            return update_phase(state, "summary")

        # Continue with domain analysis
        return self._initiate_domain_analysis(state)

    def _log_mode_detection(self):
        """Log mode detection for domain analysis."""
        test_mode = os.getenv("TEST_MODE", "").lower()

        logger.debug(
            f"[SAFETY-CHECK-4] 🔒 DOMAIN ANALYSIS SAFETY CHECK (MODE DETECTION)"
        )
        logger.debug(f"[SAFETY-CHECK-4]   Test mode: {test_mode}")
        logger.debug(
            f"[SAFETY-CHECK-4]   Domain agents will run in: {'MOCK' if test_mode == 'mock' else 'LIVE'} mode"
        )
        logger.debug(
            f"[SAFETY-CHECK-4]   Domain agents handle mock behavior internally"
        )

    def _should_complete_domain_analysis(self, state: InvestigationState) -> bool:
        """Check if domain analysis should be completed."""
        domains_completed = state.get("domains_completed", [])
        orchestrator_loops = state.get("orchestrator_loops", 0)
        min_domains_required = 6
        max_orchestrator_loops = 25

        self._log_domain_safety_check(
            domains_completed,
            orchestrator_loops,
            min_domains_required,
            max_orchestrator_loops,
        )

        should_complete = (
            len(domains_completed) >= min_domains_required
            or orchestrator_loops >= max_orchestrator_loops
        )

        if should_complete:
            triggered_conditions = self._get_completion_triggers(
                domains_completed,
                min_domains_required,
                orchestrator_loops,
                max_orchestrator_loops,
            )
            logger.debug(
                f"[SAFETY-CHECK-5]   ✅ TRIGGERED: Domain analysis completion - {', '.join(triggered_conditions)}"
            )
            logger.info(
                f"✅ Domain analysis sufficient: {len(domains_completed)} domains, {orchestrator_loops} loops - moving to summary"
            )
            logger.info(
                f"🎯 ORCHESTRATOR: Force completing domain analysis - reason: {', '.join(triggered_conditions)}"
            )
            return True

        return False

    def _log_domain_safety_check(
        self,
        domains_completed: List[str],
        orchestrator_loops: int,
        min_domains_required: int,
        max_orchestrator_loops: int,
    ):
        """Log domain analysis safety check details."""
        logger.debug(f"[SAFETY-CHECK-5] 🔒 DOMAIN ANALYSIS SAFETY CHECK (LIVE MODE)")
        logger.debug(f"[SAFETY-CHECK-5]   Domains completed: {domains_completed}")
        logger.debug(
            f"[SAFETY-CHECK-5]   Domains completed count: {len(domains_completed)}"
        )
        logger.debug(
            f"[SAFETY-CHECK-5]   Minimum domains required: {min_domains_required}"
        )
        logger.debug(f"[SAFETY-CHECK-5]   Orchestrator loops: {orchestrator_loops}")
        logger.debug(
            f"[SAFETY-CHECK-5]   Maximum orchestrator loops: {max_orchestrator_loops}"
        )
        logger.debug(
            f"[SAFETY-CHECK-5]   Condition 1 (min domains): {len(domains_completed) >= min_domains_required}"
        )
        logger.debug(
            f"[SAFETY-CHECK-5]   Condition 2 (max loops): {orchestrator_loops >= max_orchestrator_loops}"
        )
        logger.debug(
            f"[SAFETY-CHECK-5]   Any condition met: {len(domains_completed) >= min_domains_required or orchestrator_loops >= max_orchestrator_loops}"
        )

    def _get_completion_triggers(
        self,
        domains_completed: List[str],
        min_domains_required: int,
        orchestrator_loops: int,
        max_orchestrator_loops: int,
    ) -> List[str]:
        """Get list of completion triggers."""
        triggered_conditions = []

        if len(domains_completed) >= min_domains_required:
            triggered_conditions.append(
                f"sufficient_domains({len(domains_completed)}>={min_domains_required})"
            )
        if orchestrator_loops >= max_orchestrator_loops:
            triggered_conditions.append(
                f"max_loops({orchestrator_loops}>={max_orchestrator_loops})"
            )

        return triggered_conditions

    def _all_domains_complete(self, state: InvestigationState) -> bool:
        """Check if all required domains are complete."""
        domains_completed = state.get("domains_completed", [])
        required_domains = [
            "network",
            "device",
            "location",
            "logs",
            "authentication",
            "risk",
        ]
        remaining_domains = [d for d in required_domains if d not in domains_completed]

        logger.debug(f"[SAFETY-CHECK-6] 🔒 DOMAIN COMPLETION CHECK")
        logger.debug(f"[SAFETY-CHECK-6]   Required domains: {required_domains}")
        logger.debug(f"[SAFETY-CHECK-6]   Remaining domains: {remaining_domains}")
        logger.debug(
            f"[SAFETY-CHECK-6]   All domains complete: {not remaining_domains}"
        )

        return not remaining_domains

    def _initiate_domain_analysis(self, state: InvestigationState) -> Dict[str, Any]:
        """Initiate domain analysis for remaining domains."""
        domains_completed = state.get("domains_completed", [])
        orchestrator_loops = state.get("orchestrator_loops", 0)
        required_domains = [
            "network",
            "device",
            "location",
            "logs",
            "authentication",
            "risk",
        ]
        remaining_domains = [d for d in required_domains if d not in domains_completed]

        logger.info(
            f"🔄 Domain analysis - completed: {domains_completed}, remaining: {remaining_domains}, loop: {orchestrator_loops}"
        )

        # Create message for domain agents
        base_prompt = f"""Domain analysis phase initiated.
Domains to analyze: {remaining_domains}
Execution mode: Sequential (to prevent conflicts)
Orchestrator loops: {orchestrator_loops}

Each domain agent should analyze their specific area based on:
- Snowflake data ({state.get('date_range_days', 7)}-day analysis)
- Tool execution results
- Cross-domain correlations

Be efficient to prevent timeout issues."""

        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        domain_msg = SystemMessage(content=enhanced_prompt)

        return {
            "messages": [domain_msg],
            "current_phase": "domain_analysis",
            "parallel_execution": False,
        }

"""
Orchestration Debugger - Debug and Fix Investigation Flow Issues

This module provides comprehensive debugging capabilities for the investigation
orchestration system, identifying routing gaps and state transition problems.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
    HybridInvestigationState,
)
from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OrchestrationDebugger:
    """
    Debug orchestration flow issues and provide comprehensive analysis.
    """

    def __init__(self):
        self.debug_results = {}
        self.routing_issues = []
        self.state_issues = []
        self.flow_gaps = []

    def analyze_investigation_failure(
        self,
        investigation_id: str,
        state: Dict[str, Any],
        journey_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a failed investigation to identify root causes.

        Args:
            investigation_id: Investigation ID to analyze
            state: Current investigation state
            journey_data: Journey tracking data if available

        Returns:
            Comprehensive analysis of the failure
        """

        logger.info(f"🔍 Analyzing investigation failure: {investigation_id}")

        analysis = {
            "investigation_id": investigation_id,
            "analysis_timestamp": datetime.now().isoformat(),
            "state_analysis": self._analyze_state(state),
            "routing_analysis": self._analyze_routing_logic(state),
            "flow_analysis": self._analyze_flow_gaps(state, journey_data),
            "recommendations": self._generate_recommendations(state),
        }

        # Log key findings
        self._log_critical_findings(analysis)

        return analysis

    def _analyze_state(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze state schema and field consistency."""

        logger.debug("🗃️ Analyzing state schema consistency")

        state_analysis = {
            "schema_type": (
                "InvestigationState" if "current_phase" in state else "Unknown"
            ),
            "required_fields_present": {},
            "state_field_issues": [],
            "phase_tracking": {},
            "data_flow_status": {},
        }

        # Check required fields for InvestigationState
        required_fields = [
            "investigation_id",
            "entity_id",
            "entity_type",
            "current_phase",
            "snowflake_data",
            "snowflake_completed",
            "tool_results",
            "domain_findings",
            "domains_completed",
        ]

        for field in required_fields:
            state_analysis["required_fields_present"][field] = field in state
            if field not in state:
                state_analysis["state_field_issues"].append(
                    f"Missing required field: {field}"
                )

        # Analyze phase tracking
        current_phase = state.get("current_phase", "unknown")
        state_analysis["phase_tracking"] = {
            "current_phase": current_phase,
            "snowflake_completed": state.get("snowflake_completed", False),
            "tools_used_count": len(state.get("tools_used", [])),
            "domains_completed_count": len(state.get("domains_completed", [])),
            "tool_results_count": len(state.get("tool_results", {})),
            "domain_findings_count": len(state.get("domain_findings", {})),
        }

        # Analyze data flow
        state_analysis["data_flow_status"] = {
            "snowflake_to_tools": bool(state.get("snowflake_data"))
            and len(state.get("tools_used", [])) > 0,
            "tools_to_domains": len(state.get("tool_results", {})) > 0
            and len(state.get("domain_findings", {})) > 0,
            "domains_to_completion": len(state.get("domain_findings", {})) > 0
            and state.get("current_phase") in ["summary", "complete"],
        }

        return state_analysis

    def _analyze_routing_logic(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze routing logic issues."""

        logger.debug("🧭 Analyzing routing logic issues")

        routing_analysis = {
            "state_schema_mismatch": [],
            "routing_conditions": {},
            "expected_vs_actual_flow": {},
            "critical_routing_bugs": [],
        }

        # Check for state schema mismatches
        hybrid_fields = ["domains_completed", "snowflake_completed"]
        state_fields = [
            "domains_completed",
            "snowflake_completed",
        ]  # These should match

        for field in hybrid_fields:
            if field not in state:
                routing_analysis["state_schema_mismatch"].append(
                    f"Routing logic expects '{field}' but not found in state"
                )

        # Analyze routing conditions
        snowflake_completed = state.get("snowflake_completed", False)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))

        routing_analysis["routing_conditions"] = {
            "snowflake_completed": snowflake_completed,
            "tools_used_count": tools_used,
            "domains_completed_count": domains_completed,
            "should_route_to_tools": not snowflake_completed or tools_used < 3,
            "should_route_to_domains": snowflake_completed
            and tools_used >= 3
            and domains_completed < 6,
            "should_route_to_summary": domains_completed >= 6,
        }

        # Expected vs actual flow analysis
        routing_analysis["expected_vs_actual_flow"] = {
            "expected_next_step": self._determine_expected_next_step(state),
            "current_phase": state.get("current_phase", "unknown"),
            "flow_gap_detected": self._detect_flow_gap(state),
        }

        # Critical routing bugs
        if snowflake_completed and tools_used >= 1 and domains_completed == 0:
            routing_analysis["critical_routing_bugs"].append(
                "CRITICAL: Tools executed but no domain agents triggered - routing bypass detected"
            )

        if not snowflake_completed and state.get("current_phase") == "complete":
            routing_analysis["critical_routing_bugs"].append(
                "CRITICAL: Investigation completed without Snowflake data analysis"
            )

        return routing_analysis

    def _analyze_flow_gaps(
        self, state: Dict[str, Any], journey_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze gaps in the investigation flow."""

        logger.debug("🔄 Analyzing investigation flow gaps")

        flow_analysis = {
            "execution_tracking": {},
            "missing_transitions": [],
            "flow_bottlenecks": [],
            "termination_analysis": {},
        }

        # Execution tracking analysis
        if journey_data:
            flow_analysis["execution_tracking"] = {
                "total_nodes_executed": journey_data.get("journey_metadata", {}).get(
                    "total_nodes_executed", 0
                ),
                "total_state_transitions": journey_data.get("journey_metadata", {}).get(
                    "total_state_transitions", 0
                ),
                "execution_path": journey_data.get("journey_metadata", {}).get(
                    "execution_path", []
                ),
                "node_executions": len(journey_data.get("node_executions", [])),
                "agent_coordinations": len(journey_data.get("agent_coordinations", [])),
            }

        # Missing transitions analysis
        expected_transitions = [
            "initialization → snowflake_analysis",
            "snowflake_analysis → tool_execution",
            "tool_execution → domain_analysis",
            "domain_analysis → summary",
            "summary → complete",
        ]

        current_phase = state.get("current_phase", "unknown")
        for i, transition in enumerate(expected_transitions):
            if i == 0 and current_phase != "initialization":
                continue  # Already past first phase
            # Add logic to check missing transitions based on state

        # Flow bottlenecks
        snowflake_data = state.get("snowflake_data")
        tool_results = state.get("tool_results", {})
        domain_findings = state.get("domain_findings", {})

        if snowflake_data and not tool_results:
            flow_analysis["flow_bottlenecks"].append(
                "Snowflake data collected but no tools executed"
            )

        if tool_results and not domain_findings:
            flow_analysis["flow_bottlenecks"].append(
                "Tools executed but no domain analysis performed"
            )

        # Termination analysis
        flow_analysis["termination_analysis"] = {
            "premature_termination": self._detect_premature_termination(state),
            "completion_criteria_met": self._check_completion_criteria(state),
            "investigation_success": bool(domain_findings)
            and len(domain_findings) >= 3,
        }

        return flow_analysis

    def _determine_expected_next_step(self, state: Dict[str, Any]) -> str:
        """Determine what the next step should be based on current state."""

        current_phase = state.get("current_phase", "initialization")
        snowflake_completed = state.get("snowflake_completed", False)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))

        if current_phase == "initialization":
            return "snowflake_analysis"
        elif not snowflake_completed:
            return "tools (Snowflake)"
        elif tools_used == 0:
            return "tools (analysis tools)"
        elif domains_completed == 0:
            return "domain_agents"
        elif domains_completed < 5:  # Need more domain analysis
            return "next_domain_agent"
        else:
            return "summary"

    def _detect_flow_gap(self, state: Dict[str, Any]) -> bool:
        """Detect if there's a gap in the investigation flow."""

        snowflake_data = bool(state.get("snowflake_data"))
        tool_results = len(state.get("tool_results", {})) > 0
        domain_findings = len(state.get("domain_findings", {})) > 0
        current_phase = state.get("current_phase", "unknown")

        # Gap 1: Data collected but not analyzed
        if (
            snowflake_data
            and not tool_results
            and current_phase in ["summary", "complete"]
        ):
            return True

        # Gap 2: Tools executed but domain analysis skipped
        if (
            tool_results
            and not domain_findings
            and current_phase in ["summary", "complete"]
        ):
            return True

        # Gap 3: Premature completion
        if current_phase == "complete" and not domain_findings:
            return True

        return False

    def _detect_premature_termination(self, state: Dict[str, Any]) -> bool:
        """Detect if investigation terminated prematurely."""

        current_phase = state.get("current_phase", "unknown")
        domain_findings = state.get("domain_findings", {})

        # Investigation shouldn't complete without domain analysis
        if current_phase in ["summary", "complete"] and len(domain_findings) == 0:
            return True

        return False

    def _check_completion_criteria(self, state: Dict[str, Any]) -> bool:
        """Check if proper completion criteria are met."""

        required_elements = [
            bool(state.get("snowflake_data")),
            len(state.get("tool_results", {})) > 0,
            len(state.get("domain_findings", {})) >= 3,
            state.get("risk_score", 0) > 0,
        ]

        return all(required_elements)

    def _generate_recommendations(self, state: Dict[str, Any]) -> List[str]:
        """Generate recommendations to fix the identified issues."""

        recommendations = []

        # State schema recommendations
        if "snowflake_completed" not in state:
            recommendations.append(
                "Add snowflake_completed field tracking to state schema"
            )

        if "domains_completed" not in state:
            recommendations.append(
                "Add domains_completed field tracking to state schema"
            )

        # Routing logic recommendations
        if (
            len(state.get("tool_results", {})) > 0
            and len(state.get("domain_findings", {})) == 0
        ):
            recommendations.append(
                "CRITICAL: Fix routing logic to ensure domain agents are triggered after tool execution"
            )

        # Flow control recommendations
        current_phase = state.get("current_phase", "unknown")
        if (
            current_phase in ["summary", "complete"]
            and len(state.get("domain_findings", {})) == 0
        ):
            recommendations.append(
                "CRITICAL: Prevent premature investigation completion - require domain analysis"
            )

        # Data flow recommendations
        if not state.get("snowflake_data") and current_phase != "initialization":
            recommendations.append(
                "Fix Snowflake data collection - ensure data is retrieved before analysis"
            )

        return recommendations

    def _log_critical_findings(self, analysis: Dict[str, Any]) -> None:
        """Log critical findings from the analysis."""

        logger.info("🚨 CRITICAL ORCHESTRATION ANALYSIS FINDINGS:")

        # State issues
        state_issues = analysis["state_analysis"]["state_field_issues"]
        if state_issues:
            logger.error(f"   State Schema Issues: {len(state_issues)}")
            for issue in state_issues:
                logger.error(f"     ❌ {issue}")

        # Routing bugs
        routing_bugs = analysis["routing_analysis"]["critical_routing_bugs"]
        if routing_bugs:
            logger.error(f"   Routing Logic Bugs: {len(routing_bugs)}")
            for bug in routing_bugs:
                logger.error(f"     🐛 {bug}")

        # Flow gaps
        bottlenecks = analysis["flow_analysis"]["flow_bottlenecks"]
        if bottlenecks:
            logger.error(f"   Flow Bottlenecks: {len(bottlenecks)}")
            for bottleneck in bottlenecks:
                logger.error(f"     🚧 {bottleneck}")

        # Recommendations
        recommendations = analysis["recommendations"]
        logger.info(f"   Recommendations: {len(recommendations)}")
        for rec in recommendations:
            logger.info(f"     💡 {rec}")


def debug_failed_investigation(
    investigation_id: str,
    state: Dict[str, Any],
    journey_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Debug a failed investigation and return comprehensive analysis.

    Args:
        investigation_id: Investigation ID to debug
        state: Current investigation state
        journey_data: Journey tracking data if available

    Returns:
        Comprehensive debugging analysis
    """

    debugger = OrchestrationDebugger()
    return debugger.analyze_investigation_failure(investigation_id, state, journey_data)

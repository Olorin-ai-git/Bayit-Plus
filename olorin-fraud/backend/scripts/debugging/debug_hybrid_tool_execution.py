#!/usr/bin/env python3
"""
Hybrid Mode Tool Execution Debug Script

This script provides comprehensive debugging of the Hybrid Intelligence Graph
tool execution system that is failing to execute tools and extract data properly.

Key Issues Identified:
1. Tool execution starts but never completes (tools_used: 0, tool_execution_attempts: 0)
2. Investigation completes prematurely after 2-3 steps
3. Snowflake queries never complete (snowflake_completed: False, snowflake_data: None)
4. Data extraction fails for all domains
5. Graph execution stops after fraud_investigation step without processing tool calls

Usage:
    python debug_hybrid_tool_execution.py --mode mock --investigation-id TEST_DEBUG_001 --verbose
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# CRITICAL: Ensure we're in mock mode for debugging
os.environ["TEST_MODE"] = "mock"

from app.service.agent.orchestration.hybrid.hybrid_graph_builder import (
    HybridGraphBuilder,
)
from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
    create_hybrid_initial_state,
)
from app.service.agent.orchestration.hybrid.migration_utilities import GraphType
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class HybridToolExecutionDebugger:
    """
    Comprehensive debugger for Hybrid Graph tool execution issues.
    """

    def __init__(self, mock_mode: bool = True):
        self.mock_mode = mock_mode
        self.debug_results = {
            "timestamp": datetime.now().isoformat(),
            "test_mode": "mock" if mock_mode else "live",
            "issues_found": [],
            "tool_execution_tracking": {},
            "graph_flow_analysis": {},
            "state_management_issues": [],
        }

    async def debug_tool_execution_flow(
        self,
        investigation_id: str = "TEST_DEBUG_001",
        entity_id: str = "192.168.1.100",
        entity_type: str = "ip",
    ) -> Dict[str, Any]:
        """
        Debug the complete tool execution flow in hybrid mode.
        """

        logger.info(f"🔍 Starting comprehensive tool execution debugging")
        logger.info(f"   Investigation ID: {investigation_id}")
        logger.info(f"   Entity: {entity_id} ({entity_type})")
        logger.info(f"   Mode: {'MOCK' if self.mock_mode else 'LIVE'}")

        try:
            # Step 1: Build the hybrid graph
            logger.info(f"📊 Step 1: Building hybrid graph")
            builder = HybridGraphBuilder(intelligence_mode="adaptive")
            graph = await builder.build_hybrid_investigation_graph(
                use_enhanced_tools=True, enable_streaming=True
            )

            self.debug_results["graph_build_success"] = True
            logger.info(f"✅ Hybrid graph built successfully")

            # Step 2: Create initial state with debugging hooks
            logger.info(f"📊 Step 2: Creating initial state with debug tracking")
            initial_state = await self._create_debug_state(
                investigation_id, entity_id, entity_type
            )

            # Step 3: Execute graph with detailed monitoring
            logger.info(f"📊 Step 3: Executing graph with comprehensive monitoring")
            final_state = await self._execute_with_monitoring(graph, initial_state)

            # Step 4: Analyze results
            logger.info(f"📊 Step 4: Analyzing execution results")
            await self._analyze_execution_results(initial_state, final_state)

            return self.debug_results

        except Exception as e:
            logger.error(f"❌ Debug execution failed: {str(e)}")
            logger.exception("Full traceback:")

            self.debug_results["issues_found"].append(
                {
                    "type": "debug_execution_failure",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

            return self.debug_results

    async def _create_debug_state(
        self, investigation_id: str, entity_id: str, entity_type: str
    ) -> Dict[str, Any]:
        """Create initial state with debugging hooks."""

        initial_state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type,
            user_id="debug_user",
        )

        # Add debug tracking
        initial_state["debug_tracking"] = {
            "tool_calls_initiated": [],
            "tool_results_received": [],
            "state_transitions": [],
            "graph_node_executions": [],
            "phase_changes": [],
        }

        # Inject debug hooks
        initial_state["debug_mode"] = True
        initial_state["debug_timestamp"] = datetime.now().isoformat()

        logger.info(f"🔧 Debug state created with tracking hooks")
        logger.info(
            f"   Initial tools_used: {len(initial_state.get('tools_used', []))}"
        )
        logger.info(
            f"   Initial tool_results: {len(initial_state.get('tool_results', {}))}"
        )

        return initial_state

    async def _execute_with_monitoring(
        self, graph, initial_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute graph with comprehensive monitoring."""

        logger.info(f"🎯 Starting monitored graph execution")

        # Track execution steps
        execution_steps = []
        current_state = initial_state.copy()

        try:
            # Execute graph with step-by-step monitoring
            step_count = 0
            max_steps = 10  # Prevent infinite loops

            config = {"recursion_limit": max_steps}

            # Use ainvoke for single execution
            final_state = await graph.ainvoke(current_state, config)

            self.debug_results["execution_completed"] = True
            self.debug_results["final_step_count"] = step_count

            logger.info(f"✅ Graph execution completed")
            logger.info(f"   Steps executed: {step_count}")

            return final_state

        except Exception as e:
            logger.error(f"❌ Graph execution failed: {str(e)}")
            logger.exception("Execution traceback:")

            self.debug_results["issues_found"].append(
                {
                    "type": "graph_execution_failure",
                    "message": str(e),
                    "step_count": step_count,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            return current_state

    async def _analyze_execution_results(
        self, initial_state: Dict[str, Any], final_state: Dict[str, Any]
    ):
        """Analyze execution results and identify issues."""

        logger.info(f"🔍 Analyzing execution results")

        # 1. Tool execution analysis
        initial_tools = len(initial_state.get("tools_used", []))
        final_tools = len(final_state.get("tools_used", []))
        initial_results = len(initial_state.get("tool_results", {}))
        final_results = len(final_state.get("tool_results", {}))

        self.debug_results["tool_execution_tracking"] = {
            "initial_tools_used": initial_tools,
            "final_tools_used": final_tools,
            "tools_executed": final_tools - initial_tools,
            "initial_tool_results": initial_results,
            "final_tool_results": final_results,
            "results_obtained": final_results - initial_results,
            "tool_execution_attempts": final_state.get("tool_execution_attempts", 0),
        }

        # 2. Data extraction analysis
        snowflake_completed = final_state.get("snowflake_completed", False)
        snowflake_data = final_state.get("snowflake_data")

        self.debug_results["data_extraction_analysis"] = {
            "snowflake_completed": snowflake_completed,
            "snowflake_data_present": snowflake_data is not None,
            "network_data": final_state.get("network_data", {}) != {},
            "device_data": final_state.get("device_data", {}) != {},
            "location_data": final_state.get("location_data", {}) != {},
            "logs_data": final_state.get("logs_data", {}) != {},
        }

        # 3. Phase progression analysis
        initial_phase = initial_state.get("current_phase", "unknown")
        final_phase = final_state.get("current_phase", "unknown")

        self.debug_results["phase_progression"] = {
            "initial_phase": initial_phase,
            "final_phase": final_phase,
            "phase_changed": initial_phase != final_phase,
            "reached_tool_execution": final_phase == "tool_execution",
        }

        # 4. Identify specific issues
        await self._identify_issues(final_state)

        # 5. Log summary
        logger.info(f"📊 Analysis Summary:")
        logger.info(f"   Tools executed: {final_tools - initial_tools}")
        logger.info(f"   Results obtained: {final_results - initial_results}")
        logger.info(
            f"   Tool execution attempts: {final_state.get('tool_execution_attempts', 0)}"
        )
        logger.info(f"   Snowflake completed: {snowflake_completed}")
        logger.info(f"   Phase progression: {initial_phase} → {final_phase}")
        logger.info(f"   Issues found: {len(self.debug_results['issues_found'])}")

    async def _identify_issues(self, final_state: Dict[str, Any]):
        """Identify specific issues with tool execution."""

        # Issue 1: No tools executed despite tool calls
        if final_state.get("tool_execution_attempts", 0) == 0:
            self.debug_results["issues_found"].append(
                {
                    "type": "no_tool_execution_attempts",
                    "message": "No tool execution attempts recorded despite investigation running",
                    "severity": "critical",
                    "recommendation": "Check if tools_condition routing is working properly",
                }
            )

        # Issue 2: Tools used but no results
        tools_used = len(final_state.get("tools_used", []))
        tool_results = len(final_state.get("tool_results", {}))

        if tools_used > 0 and tool_results == 0:
            self.debug_results["issues_found"].append(
                {
                    "type": "tools_executed_no_results",
                    "message": f"Tools were used ({tools_used}) but no results captured",
                    "severity": "critical",
                    "recommendation": "Check enhanced tool node result processing",
                }
            )

        # Issue 3: Snowflake never completed
        if not final_state.get("snowflake_completed", False):
            self.debug_results["issues_found"].append(
                {
                    "type": "snowflake_never_completed",
                    "message": "Snowflake query never completed",
                    "severity": "high",
                    "recommendation": "Check if Snowflake tool is being called and completing",
                }
            )

        # Issue 4: No data extraction
        data_sources = ["network_data", "device_data", "location_data", "logs_data"]
        empty_sources = [
            source for source in data_sources if not final_state.get(source, {})
        ]

        if len(empty_sources) >= 3:
            self.debug_results["issues_found"].append(
                {
                    "type": "insufficient_data_extraction",
                    "message": f"No data extracted from {len(empty_sources)} sources: {empty_sources}",
                    "severity": "high",
                    "recommendation": "Check if domain agents are being executed after tool calls",
                }
            )

        # Issue 5: Phase not progressing past initialization
        if final_state.get("current_phase") == "initialization":
            self.debug_results["issues_found"].append(
                {
                    "type": "phase_stuck_in_initialization",
                    "message": "Investigation phase never progressed beyond initialization",
                    "severity": "critical",
                    "recommendation": "Check if fraud_investigation node is calling tools properly",
                }
            )

    def print_debug_report(self):
        """Print comprehensive debug report."""

        print("\n" + "=" * 80)
        print("🔍 HYBRID TOOL EXECUTION DEBUG REPORT")
        print("=" * 80)

        print(f"\n📊 Test Configuration:")
        print(f"   Timestamp: {self.debug_results['timestamp']}")
        print(f"   Test Mode: {self.debug_results['test_mode']}")
        print(
            f"   Graph Build: {'✅ SUCCESS' if self.debug_results.get('graph_build_success') else '❌ FAILED'}"
        )
        print(
            f"   Execution: {'✅ COMPLETED' if self.debug_results.get('execution_completed') else '❌ FAILED'}"
        )

        # Tool execution summary
        tool_tracking = self.debug_results.get("tool_execution_tracking", {})
        print(f"\n🔧 Tool Execution Analysis:")
        print(f"   Tools executed: {tool_tracking.get('tools_executed', 0)}")
        print(f"   Results obtained: {tool_tracking.get('results_obtained', 0)}")
        print(
            f"   Execution attempts: {tool_tracking.get('tool_execution_attempts', 0)}"
        )

        # Data extraction summary
        data_analysis = self.debug_results.get("data_extraction_analysis", {})
        print(f"\n📊 Data Extraction Analysis:")
        print(
            f"   Snowflake completed: {'✅' if data_analysis.get('snowflake_completed') else '❌'}"
        )
        print(f"   Network data: {'✅' if data_analysis.get('network_data') else '❌'}")
        print(f"   Device data: {'✅' if data_analysis.get('device_data') else '❌'}")
        print(
            f"   Location data: {'✅' if data_analysis.get('location_data') else '❌'}"
        )
        print(f"   Logs data: {'✅' if data_analysis.get('logs_data') else '❌'}")

        # Phase progression
        phase_progression = self.debug_results.get("phase_progression", {})
        print(f"\n📈 Phase Progression:")
        print(f"   Initial phase: {phase_progression.get('initial_phase')}")
        print(f"   Final phase: {phase_progression.get('final_phase')}")
        print(
            f"   Reached tool execution: {'✅' if phase_progression.get('reached_tool_execution') else '❌'}"
        )

        # Issues found
        issues = self.debug_results.get("issues_found", [])
        print(f"\n🚨 Issues Found ({len(issues)}):")

        if not issues:
            print("   ✅ No critical issues detected")
        else:
            for i, issue in enumerate(issues, 1):
                severity_icon = {
                    "critical": "🔴",
                    "high": "🟠",
                    "medium": "🟡",
                    "low": "🟢",
                }.get(issue.get("severity", "medium"), "⚪")

                print(f"   {i}. {severity_icon} {issue['type']}")
                print(f"      Message: {issue['message']}")
                print(
                    f"      Recommendation: {issue.get('recommendation', 'No recommendation')}"
                )

        print("\n" + "=" * 80)


async def main():
    parser = argparse.ArgumentParser(description="Debug Hybrid Tool Execution")
    parser.add_argument(
        "--mode",
        choices=["mock", "live"],
        default="mock",
        help="Execution mode (default: mock)",
    )
    parser.add_argument(
        "--investigation-id",
        default="TEST_DEBUG_001",
        help="Investigation ID for testing",
    )
    parser.add_argument(
        "--entity-id", default="192.168.1.100", help="Entity ID to investigate"
    )
    parser.add_argument("--entity-type", default="ip", help="Entity type")
    parser.add_argument("--verbose", action="store_true", help="Verbose logging")
    parser.add_argument(
        "--output-json", action="store_true", help="Output results as JSON"
    )

    args = parser.parse_args()

    # Ensure mock mode for safety
    if args.mode != "mock":
        print("⚠️ WARNING: Only mock mode is allowed for debugging")
        print("   Forcing mock mode for safety")
        args.mode = "mock"

    # Set up logging level
    if args.verbose:
        import logging

        logging.getLogger().setLevel(logging.DEBUG)

    print(f"🔍 Starting Hybrid Tool Execution Debug")
    print(f"   Mode: {args.mode}")
    print(f"   Investigation: {args.investigation_id}")
    print(f"   Entity: {args.entity_id} ({args.entity_type})")

    # Create debugger and run analysis
    debugger = HybridToolExecutionDebugger(mock_mode=(args.mode == "mock"))

    results = await debugger.debug_tool_execution_flow(
        investigation_id=args.investigation_id,
        entity_id=args.entity_id,
        entity_type=args.entity_type,
    )

    # Output results
    if args.output_json:
        print(json.dumps(results, indent=2))
    else:
        debugger.print_debug_report()

    # Return exit code based on issues found
    issues_found = len(results.get("issues_found", []))
    if issues_found > 0:
        print(f"\n❌ Debug completed with {issues_found} issues found")
        return 1
    else:
        print(f"\n✅ Debug completed successfully - no critical issues found")
        return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

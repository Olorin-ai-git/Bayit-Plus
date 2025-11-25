#!/usr/bin/env python3
"""
Debug script to trace graph execution path and identify why domain agents are being skipped.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict

# Add the project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.service.agent.orchestration.clean_graph_builder import (
    build_clean_investigation_graph,
)
from app.service.agent.orchestration.state_schema import create_initial_state
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def debug_graph_execution():
    """Debug graph execution step by step."""
    logger.info("🔍 Starting graph execution debugging...")

    # Set up test environment
    os.environ["TEST_MODE"] = "mock"

    # Create initial state
    investigation_id = f"debug_trace_{int(datetime.now().timestamp())}"
    initial_state = create_initial_state(
        investigation_id=investigation_id,
        entity_id="192.168.1.1",
        entity_type="ip",
        custom_user_prompt="Debug investigation to trace execution path",
        date_range_days=7,
        parallel_execution=True,
        max_tools=52,
    )

    logger.info(f"📊 Initial state created:")
    logger.info(f"   Investigation ID: {initial_state['investigation_id']}")
    logger.info(
        f"   Entity: {initial_state['entity_type']} - {initial_state['entity_id']}"
    )
    logger.info(f"   Current phase: {initial_state['current_phase']}")
    logger.info(f"   State keys: {list(initial_state.keys())}")

    try:
        # Build the graph
        logger.info("🏗️ Building clean graph...")
        graph = build_clean_investigation_graph()
        logger.info("✅ Graph built successfully")

        # Add execution tracing
        logger.info("🚀 Starting graph execution with tracing...")

        # Execute with higher recursion limit to see where it stops
        config = {"recursion_limit": 60}

        # Trace each step
        result = None
        try:
            logger.info("📍 About to call graph.ainvoke...")
            result = await graph.ainvoke(initial_state, config=config)
            logger.info("✅ Graph execution completed")

        except Exception as e:
            logger.error(f"❌ Graph execution failed: {e}")
            logger.error(f"   Error type: {type(e).__name__}")
            logger.error(f"   Error details: {str(e)}")
            import traceback

            logger.error(f"   Traceback: {traceback.format_exc()}")
            return

        # Analyze result
        logger.info("📊 Graph execution results:")
        logger.info(f"   Final phase: {result.get('current_phase', 'unknown')}")
        logger.info(f"   Tools used: {len(result.get('tools_used', []))}")
        logger.info(f"   Domains completed: {result.get('domains_completed', [])}")
        logger.info(f"   Risk score: {result.get('risk_score', 'N/A')}")
        logger.info(f"   Confidence score: {result.get('confidence_score', 'N/A')}")
        logger.info(f"   Messages count: {len(result.get('messages', []))}")
        logger.info(f"   Errors: {result.get('errors', [])}")

        # Check for routing decisions
        routing_decisions = result.get("routing_decisions", [])
        logger.info(f"📈 Routing decisions made: {len(routing_decisions)}")
        for i, decision in enumerate(routing_decisions):
            logger.info(f"   Decision {i+1}: {decision}")

        # Check orchestrator loops
        orchestrator_loops = result.get("orchestrator_loops", 0)
        logger.info(f"🔄 Orchestrator loops: {orchestrator_loops}")

        # Save detailed results
        debug_results = {
            "investigation_id": investigation_id,
            "initial_state": {k: str(v) for k, v in initial_state.items()},
            "final_state": {k: str(v) for k, v in result.items()},
            "execution_summary": {
                "final_phase": result.get("current_phase"),
                "tools_used_count": len(result.get("tools_used", [])),
                "domains_completed": result.get("domains_completed", []),
                "orchestrator_loops": orchestrator_loops,
                "routing_decisions_count": len(routing_decisions),
                "has_errors": len(result.get("errors", [])) > 0,
            },
        }

        debug_file = f"/tmp/graph_debug_{investigation_id}.json"
        with open(debug_file, "w") as f:
            json.dump(debug_results, f, indent=2)
        logger.info(f"💾 Debug results saved to: {debug_file}")

        # Identify the problem
        if (
            result.get("current_phase") == "complete"
            and len(result.get("domains_completed", [])) == 0
        ):
            logger.error(
                "🚨 PROBLEM IDENTIFIED: Investigation completed without executing domain agents!"
            )
            logger.error(
                "   This indicates the orchestrator is skipping domain analysis phase"
            )

            if orchestrator_loops == 0:
                logger.error("🚨 CRITICAL: Orchestrator was never executed!")
                logger.error("   The graph is bypassing the orchestrator node entirely")
            else:
                logger.error(
                    f"🚨 Orchestrator executed {orchestrator_loops} times but didn't progress to domain analysis"
                )

        logger.info("🔍 Debug analysis complete")

    except Exception as e:
        logger.error(f"❌ Debug execution failed: {e}")
        import traceback

        logger.error(f"   Traceback: {traceback.format_exc()}")


if __name__ == "__main__":
    asyncio.run(debug_graph_execution())

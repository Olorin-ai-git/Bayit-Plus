#!/usr/bin/env python3
"""
Debug script to trace orchestrator execution and domain analysis flow.
This script will run a minimal investigation and trace every node execution
to understand why domain analysis is never triggered.
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Set environment for debugging
os.environ["TEST_MODE"] = "mock"
os.environ["USE_SNOWFLAKE"] = "false"

async def debug_orchestrator_execution():
    """Run a simple investigation with detailed logging to trace execution."""

    print("🔍 DEBUG: Starting orchestrator execution debugging")
    print("=" * 60)

    try:
        # Import required modules
        from app.service.agent.orchestration.clean_graph_builder import build_clean_investigation_graph
        from app.service.agent.orchestration.state_schema import create_initial_state
        from app.service.logging import get_bridge_logger

        logger = get_bridge_logger(__name__)

        # Create investigation state
        investigation_id = "debug_orchestrator_test"
        entity_id = "192.168.1.1"
        entity_type = "ip"

        print(f"📝 Creating initial state for {entity_type}: {entity_id}")
        initial_state = create_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type,
            parallel_execution=True,
            max_tools=52
        )

        print(f"✅ Initial state created with {len(initial_state)} keys")
        print(f"   Current phase: {initial_state.get('current_phase', 'unknown')}")
        print(f"   Investigation ID: {initial_state.get('investigation_id')}")

        # Build the clean graph
        print(f"\n🏗️ Building clean investigation graph...")
        graph = build_clean_investigation_graph()
        print(f"✅ Graph built successfully")

        # Configure execution
        config = {"recursion_limit": 100}  # Increased to see full execution

        print(f"\n🚀 Starting graph execution with recursion limit: 50")
        print(f"   This should trace every node execution...")

        start_time = time.time()

        # Execute the graph
        result = await graph.ainvoke(initial_state, config=config)

        duration = time.time() - start_time

        print(f"\n📊 EXECUTION COMPLETED in {duration:.2f}s")
        print("=" * 60)
        print(f"🔍 Final result analysis:")
        print(f"   Current phase: {result.get('current_phase', 'unknown')}")
        print(f"   Tools used: {len(result.get('tools_used', []))} ({result.get('tools_used', [])})")
        print(f"   Domains completed: {len(result.get('domains_completed', []))} ({result.get('domains_completed', [])})")
        print(f"   Snowflake completed: {result.get('snowflake_completed', False)}")
        print(f"   Orchestrator loops: {result.get('orchestrator_loops', 0)}")
        print(f"   Messages count: {len(result.get('messages', []))}")

        # Check for routing decisions
        routing_decisions = result.get('routing_decisions', [])
        if routing_decisions:
            print(f"\n🔀 Routing decisions ({len(routing_decisions)}):")
            for i, decision in enumerate(routing_decisions[-5:]):  # Show last 5
                print(f"   {i+1}. {decision.get('decision', 'unknown')} - {decision.get('reason', 'no reason')}")
        else:
            print(f"\n⚠️ No routing decisions found - this indicates orchestrator may not have been called")

        # Check phase changes
        phase_changes = result.get('phase_changes', [])
        if phase_changes:
            print(f"\n🔄 Phase changes ({len(phase_changes)}):")
            for i, change in enumerate(phase_changes):
                print(f"   {i+1}. {change}")
        else:
            print(f"\n⚠️ No phase changes recorded")

        print("\n" + "=" * 60)

        if result.get('current_phase') == 'complete' and len(result.get('domains_completed', [])) == 0:
            print("🚨 ISSUE CONFIRMED: Investigation completed without executing domain agents")
            print("   This indicates the orchestrator routing logic has an issue")
            return False
        else:
            print("✅ Investigation executed domain agents successfully")
            return True

    except Exception as e:
        print(f"❌ Error during debugging: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🐛 Orchestrator Execution Debugging Script")
    print("This script traces LangGraph execution to find why domain analysis is skipped")
    print()

    success = asyncio.run(debug_orchestrator_execution())

    if success:
        print("\n🎉 Debugging successful - domain agents executed")
        sys.exit(0)
    else:
        print("\n🚨 Debugging confirmed the issue - domain agents were not executed")
        sys.exit(1)
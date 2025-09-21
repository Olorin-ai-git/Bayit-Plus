#!/usr/bin/env python
"""
Simple test to debug the clean graph step by step.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set environment variables
os.environ["TEST_MODE"] = "mock"
os.environ["USE_SNOWFLAKE"] = "false"

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.clean_graph_builder import (
    build_clean_investigation_graph,
    get_all_tools
)
from app.service.agent.orchestration.state_schema import create_initial_state

logger = get_bridge_logger(__name__)


async def test_step_by_step():
    """Test the graph execution step by step."""
    
    print("\n" + "="*60)
    print("STEP-BY-STEP GRAPH TEST")
    print("="*60 + "\n")
    
    # Step 1: Create initial state
    print("1. Creating initial state...")
    state = create_initial_state(
        investigation_id="test-001",
        entity_id="192.168.1.100",
        entity_type="ip"
    )
    print(f"   ✓ State created with phase: {state['current_phase']}")
    print(f"   ✓ Snowflake completed: {state['snowflake_completed']}")
    
    # Step 2: Load tools
    print("\n2. Loading tools...")
    tools = get_all_tools()
    print(f"   ✓ Loaded {len(tools)} tools")
    snowflake_tools = [t for t in tools if 'snowflake' in t.name.lower()]
    print(f"   ✓ Snowflake tools found: {len(snowflake_tools)}")
    
    # Step 3: Build graph
    print("\n3. Building graph...")
    graph = build_clean_investigation_graph()
    print(f"   ✓ Graph built with nodes: {list(graph.nodes.keys())}")
    
    # Step 4: Run just the data ingestion step
    print("\n4. Testing data ingestion...")
    try:
        result = await asyncio.wait_for(
            graph.ainvoke(state, config={"recursion_limit": 3}),
            timeout=5.0
        )
        print(f"   ✓ Current phase after 3 iterations: {result.get('current_phase')}")
        print(f"   ✓ Snowflake completed: {result.get('snowflake_completed')}")
        print(f"   ✓ Tools used: {result.get('tools_used', [])}")
        print(f"   ✓ Messages count: {len(result.get('messages', []))}")
        
        # Check message types
        messages = result.get('messages', [])
        for i, msg in enumerate(messages[-5:]):  # Last 5 messages
            msg_type = type(msg).__name__
            print(f"   Message {i}: {msg_type}")
            if hasattr(msg, 'tool_calls'):
                print(f"     - Has tool_calls: {len(msg.tool_calls) if msg.tool_calls else 0}")
            if hasattr(msg, 'name'):
                print(f"     - Tool name: {msg.name}")
        
    except asyncio.TimeoutError:
        print("   ✗ Timed out after 5 seconds")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        
        # Try to get partial state
        try:
            # Use stream to see partial progress
            print("\n5. Checking partial progress...")
            events = []
            async for event in graph.astream(state, config={"recursion_limit": 3}):
                events.append(event)
                for key, value in event.items():
                    print(f"   Event: {key}")
                    if key == "orchestrator" and isinstance(value, dict):
                        print(f"     - Phase: {value.get('current_phase')}")
                    elif key == "tools" and isinstance(value, dict):
                        print(f"     - Tools executed")
        except Exception as e2:
            print(f"   ✗ Stream error: {str(e2)}")


async def main():
    """Main entry point."""
    await test_step_by_step()


if __name__ == "__main__":
    asyncio.run(main())
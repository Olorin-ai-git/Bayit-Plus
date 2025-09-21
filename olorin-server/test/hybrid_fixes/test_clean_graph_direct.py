#!/usr/bin/env python3
"""
Simple Test of Clean Graph Direct Execution

This script provides a simple way to test tool execution in the clean graph
to establish a baseline comparison for debugging the hybrid graph issues.
"""

import asyncio
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# CRITICAL: Ensure we're in mock mode
os.environ["TEST_MODE"] = "mock"

async def test_clean_graph_simple():
    """Simple test of clean graph execution."""
    
    print("🧪 Testing Clean Graph Tool Execution")
    print("   Mode: MOCK")
    
    try:
        # Import after setting test mode
        from app.service.agent.orchestration.clean_graph_builder import build_clean_investigation_graph
        from app.service.agent.orchestration.state_schema import create_initial_state
        
        print("✅ Clean graph imports successful")
        
        # Build graph
        graph = build_clean_investigation_graph()
        print("✅ Clean graph built successfully")
        
        # Create initial state
        initial_state = create_initial_state(
            investigation_id="TEST_CLEAN_001",
            entity_id="192.168.1.100",
            entity_type="ip"
        )
        print("✅ Initial state created")
        print(f"   Initial tools_used: {len(initial_state.get('tools_used', []))}")
        print(f"   Initial tool_results: {len(initial_state.get('tool_results', {}))}")
        
        # Execute graph with increased limit
        print("🎯 Executing clean graph...")
        config = {"recursion_limit": 25}
        
        # Try step-by-step execution first
        try:
            # Use astream to see what nodes are executing
            print("📊 Attempting step-by-step execution...")
            step_count = 0
            async for chunk in graph.astream(initial_state, config):
                step_count += 1
                print(f"   Step {step_count}: {list(chunk.keys())}")
                if step_count >= 20:  # Safety limit
                    print("   ⚠️ Stopping after 20 steps to prevent infinite loop")
                    break
            
            print(f"✅ Graph streaming completed after {step_count} steps")
            
            # Now try regular execution with higher limit
            config = {"recursion_limit": 50}
            final_state = await graph.ainvoke(initial_state, config)
            
        except Exception as stream_e:
            print(f"⚠️ Streaming failed: {stream_e}")
            print("   Trying direct execution with high limit...")
            config = {"recursion_limit": 50}
            final_state = await graph.ainvoke(initial_state, config)
        
        print("✅ Clean graph execution completed")
        print(f"   Final tools_used: {len(final_state.get('tools_used', []))}")
        print(f"   Final tool_results: {len(final_state.get('tool_results', {}))}")
        print(f"   Tool execution attempts: {final_state.get('tool_execution_attempts', 0)}")
        print(f"   Current phase: {final_state.get('current_phase', 'unknown')}")
        print(f"   Snowflake completed: {final_state.get('snowflake_completed', False)}")
        
        # Check for issues
        tools_used = len(final_state.get('tools_used', []))
        tool_results = len(final_state.get('tool_results', {}))
        tool_attempts = final_state.get('tool_execution_attempts', 0)
        
        if tools_used == 0 and tool_attempts == 0:
            print("❌ ISSUE: No tools executed in clean graph either")
            print("   This suggests a fundamental tool execution problem")
        elif tools_used > 0 and tool_results > 0:
            print("✅ Clean graph tool execution working properly")
            print("   Issue is likely specific to hybrid graph")
        else:
            print("⚠️ Partial tool execution in clean graph")
            print(f"   Tools used: {tools_used}, Results: {tool_results}, Attempts: {tool_attempts}")
        
        return {
            "success": True,
            "tools_used": tools_used,
            "tool_results": tool_results,
            "tool_attempts": tool_attempts,
            "final_state": final_state
        }
        
    except Exception as e:
        print(f"❌ Clean graph test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def main():
    print("🔍 Starting Clean Graph Baseline Test")
    
    result = await test_clean_graph_simple()
    
    if result["success"]:
        print("\n✅ Clean graph test completed successfully")
        if result["tools_used"] > 0:
            print("   Clean graph tool execution is working")
            print("   Hybrid graph issue is likely in the enhanced tool node or routing")
        else:
            print("   Clean graph also has tool execution issues")
            print("   Problem may be in base tool implementation or mock mode")
    else:
        print(f"\n❌ Clean graph test failed: {result['error']}")
    
    return 0 if result["success"] else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
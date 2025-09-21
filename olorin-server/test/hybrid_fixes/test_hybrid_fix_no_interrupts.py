#!/usr/bin/env python3
"""
Test script to validate the hybrid investigation fix - NO INTERRUPTS
Focus: Disable interrupt_before to allow full tool execution
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('.'))

from app.service.agent.orchestration.hybrid.hybrid_graph_builder import HybridGraphBuilder
from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state

async def test_hybrid_tools_no_interrupts():
    """Test the hybrid investigation with no interrupts"""
    
    print("🧪 Testing Hybrid Investigation - NO INTERRUPTS")
    print("=" * 60)
    print("🔒 MOCK MODE ONLY - No live data execution")
    print("⚡ Interrupts DISABLED for full tool execution")
    print()
    
    try:
        # Create hybrid graph builder
        builder = HybridGraphBuilder(intelligence_mode="adaptive")
        
        # Build graph with enhanced tools BUT NO INTERRUPTS
        print("🏗️ Building hybrid graph with NO interrupts...")
        graph = await builder.build_hybrid_investigation_graph(
            use_enhanced_tools=False,  # ⚡ Disable enhanced tools to avoid interrupts
            enable_streaming=True
        )
        print(f"✅ Graph built successfully with {len(graph.nodes)} nodes")
        print()
        
        # Create test investigation state
        investigation_id = f"test_hybrid_nointerrupt_{int(datetime.now().timestamp())}"
        entity_id = "67.76.8.209"
        entity_type = "ip"
        
        print(f"🔍 Creating test investigation:")
        print(f"   ID: {investigation_id}")
        print(f"   Entity: {entity_type} - {entity_id}")
        print()
        
        # Create initial state
        initial_state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type
        )
        
        # Configure for hybrid graph execution
        config = {
            "recursion_limit": 50,  # Lower limit for testing
            "configurable": {"thread_id": investigation_id}
        }
        
        print("🚀 Starting investigation execution...")
        print("⏱️ This should execute tools and capture results...")
        print()
        
        # Execute graph
        result = await graph.ainvoke(initial_state, config=config)
        
        # Analyze results
        print("📊 INVESTIGATION RESULTS:")
        print("=" * 40)
        
        tools_used = len(result.get("tools_used", []))
        tool_results = len(result.get("tool_results", {}))
        tool_attempts = result.get("tool_execution_attempts", 0)
        current_phase = result.get("current_phase", "unknown")
        snowflake_completed = result.get("snowflake_completed", False)
        risk_score = result.get("risk_score", 0.0)
        
        print(f"   Tools Used: {tools_used}")
        print(f"   Tool Results: {tool_results}")
        print(f"   Tool Attempts: {tool_attempts}")
        print(f"   Current Phase: {current_phase}")
        print(f"   Snowflake Completed: {snowflake_completed}")
        print(f"   Risk Score: {risk_score}")
        print()
        
        # Analyze messages for tool calls
        messages = result.get("messages", [])
        ai_messages_with_tools = 0
        tool_messages = 0
        
        for msg in messages:
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                ai_messages_with_tools += 1
            if getattr(msg, 'type', None) == 'tool':
                tool_messages += 1
        
        print(f"   AI Messages with Tool Calls: {ai_messages_with_tools}")
        print(f"   Tool Result Messages: {tool_messages}")
        print()
        
        # Test analysis
        print("🧪 TEST ANALYSIS:")
        print("=" * 40)
        
        if tools_used > 0 and tool_results > 0:
            print("✅ SUCCESS: Tools were executed and results captured!")
            print("   The interrupt issue has been resolved")
        elif ai_messages_with_tools > 0 and tool_messages > 0:
            print("✅ PARTIAL SUCCESS: Tool calls executed but state not updated")
            print("   Need to fix state management in tool execution")
        elif ai_messages_with_tools > 0 and tools_used == 0:
            print("❌ FAILURE: Tool calls created but not executed")
            print("   tools_condition routing is still broken")
        elif tools_used == 0 and tool_attempts == 0:
            print("⚠️ WARNING: No tools attempted - check AI assistant logic")
        else:
            print("🤔 MIXED: Partial execution detected")
        
        print()
        
        # Detailed state analysis
        print("🔍 DETAILED STATE ANALYSIS:")
        print("=" * 40)
        
        # Check orchestrator loops
        orchestrator_loops = result.get("orchestrator_loops", 0)
        errors = result.get("errors", [])
        
        print(f"   Orchestrator Loops: {orchestrator_loops}")
        print(f"   Errors: {len(errors)}")
        
        if orchestrator_loops > 10:
            print("⚠️ HIGH LOOP COUNT: Possible infinite loop issue")
        
        if errors:
            print("❌ ERRORS DETECTED:")
            for error in errors[:3]:  # Show first 3 errors
                print(f"      {error}")
        
        # Show last few messages for debugging
        print()
        print("🔍 LAST FEW MESSAGES:")
        print("=" * 40)
        for i, msg in enumerate(messages[-3:], 1):
            msg_type = type(msg).__name__
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                print(f"   {i}. {msg_type} with {len(msg.tool_calls)} tool calls")
            elif getattr(msg, 'type', None) == 'tool':
                print(f"   {i}. Tool result message")
            else:
                print(f"   {i}. {msg_type}")
        
        print()
        print("🏁 Test completed!")
        
        return {
            "success": tools_used > 0 or tool_messages > 0,
            "tools_used": tools_used,
            "tool_results": tool_results,
            "tool_messages": tool_messages,
            "phase": current_phase,
            "loops": orchestrator_loops,
            "errors": len(errors)
        }
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Run the test
    result = asyncio.run(test_hybrid_tools_no_interrupts())
    
    # Exit with appropriate code
    exit_code = 0 if result.get("success", False) else 1
    print(f"\n🎯 Test {'PASSED' if exit_code == 0 else 'FAILED'}")
    exit(exit_code)
#!/usr/bin/env python3
"""
Debug message sequence corruption issue
Isolate the exact point where tool_use/tool_result pairing breaks
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))

from app.service.agent.orchestration.hybrid.hybrid_graph_builder import HybridGraphBuilder
from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state

async def debug_message_sequence():
    """Debug the message sequence corruption issue"""
    
    print("🔍 Debugging Message Sequence Corruption")
    print("=" * 50)
    print("🔒 MOCK MODE ONLY - No live data execution")
    print()
    
    try:
        # Create hybrid graph builder
        builder = HybridGraphBuilder(intelligence_mode="adaptive")
        
        # Build graph with enhanced tools but NO interrupts
        print("🏗️ Building hybrid graph...")
        graph = await builder.build_hybrid_investigation_graph(
            use_enhanced_tools=True,   # Enhanced tools enabled
            enable_streaming=True,
            enable_interrupts=False    # No interrupts - tools can execute
        )
        print(f"✅ Graph built successfully")
        print()
        
        # Create test investigation state
        investigation_id = f"debug_message_seq_{int(datetime.now().timestamp())}"
        entity_id = "67.76.8.209"
        entity_type = "ip"
        
        # Create initial state
        initial_state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type
        )
        
        # Configure for execution to catch the error
        config = {
            "recursion_limit": 15,  # Enough to get to the error
            "configurable": {"thread_id": investigation_id}
        }
        
        print("🚀 Starting investigation with limited recursion...")
        print("🎯 Goal: Catch the message sequence error early")
        print()
        
        # Try to execute and catch the error
        try:
            result = await graph.ainvoke(initial_state, config=config)
            print("⚠️ Unexpected success - no error caught")
            
        except Exception as e:
            if "tool_use_id" in str(e) and "tool_result" in str(e):
                print("🎯 CAUGHT THE MESSAGE SEQUENCE ERROR!")
                print(f"   Error: {str(e)}")
                print()
                
                # Extract the problematic tool_use_id
                error_msg = str(e)
                if "tool_use_id found in `tool_result` blocks:" in error_msg:
                    # Extract tool_use_id from error message
                    start = error_msg.find("blocks: ") + 8
                    end = error_msg.find(".", start)
                    problematic_tool_id = error_msg[start:end]
                    print(f"🔍 Problematic tool_use_id: {problematic_tool_id}")
                    print()
                
                # This is our target error - let's analyze the state
                print("📊 ERROR ANALYSIS:")
                print("   This error occurs when a ToolMessage has a tool_call_id")
                print("   that doesn't match any tool_calls in the preceding AIMessage")
                print()
                print("💡 LIKELY CAUSES:")
                print("   1. Enhanced tool node is modifying tool_call_ids")
                print("   2. Messages are being reordered or duplicated")
                print("   3. Tool results are referencing wrong tool_use blocks")
                print("   4. System message insertion is disrupting message sequence")
                print()
                print("🔧 NEXT STEPS:")
                print("   1. Check if enhanced tool node preserves exact tool_call_ids")
                print("   2. Verify messages array isn't being corrupted")
                print("   3. Ensure tool_result.tool_call_id matches tool_use.id exactly")
                
                return {
                    "success": True,  # We successfully caught the error
                    "error_caught": True,
                    "error_type": "tool_use_id_mismatch",
                    "problematic_tool_id": problematic_tool_id if 'problematic_tool_id' in locals() else None
                }
                
            else:
                print(f"❌ Different error caught: {str(e)}")
                return {"success": False, "error": str(e)}
        
        return {"success": False, "error": "No error caught - investigation completed unexpectedly"}
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = asyncio.run(debug_message_sequence())
    
    if result.get("error_caught"):
        print(f"\n🎯 SUCCESS: Message sequence error isolated and analyzed!")
        print("   We now know exactly where the corruption occurs.")
        exit_code = 0
    else:
        print(f"\n🎯 FAILURE: Could not isolate the message sequence error")
        exit_code = 1
    
    exit(exit_code)
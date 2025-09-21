#!/usr/bin/env python3
"""
Pinpoint the exact corruption moment by patching the assistant function
and logging every message sequence that goes to the Anthropic API
"""

import asyncio
import sys
import os
from datetime import datetime
import json

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))

from langchain_core.messages import AIMessage, ToolMessage, HumanMessage, SystemMessage
from app.service.agent.orchestration.hybrid.hybrid_graph_builder import HybridGraphBuilder
from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state

# Monkey patch the assistant function to log messages before API call
original_assistant = None

def patched_assistant(state, config):
    """Patched assistant that logs messages before sending to Anthropic API"""
    global original_assistant
    
    print(f"\n🔍 ASSISTANT CALLED - Analyzing message sequence before API call")
    
    messages = state["messages"]
    print(f"   📊 Total messages: {len(messages)}")
    
    tool_uses = {}
    tool_results = {}
    
    for i, msg in enumerate(messages):
        msg_type = type(msg).__name__
        if hasattr(msg, 'tool_calls') and msg.tool_calls:
            print(f"   {i+1}. {msg_type} with {len(msg.tool_calls)} tool_calls")
            for j, tc in enumerate(msg.tool_calls):
                tool_id = tc.get('id', 'NO_ID')
                tool_uses[tool_id] = i
                print(f"      Tool call {j+1}: id={tool_id}")
        elif hasattr(msg, 'tool_call_id'):
            tool_results[msg.tool_call_id] = i
            print(f"   {i+1}. {msg_type} with tool_call_id: {msg.tool_call_id}")
        else:
            content_preview = str(msg.content)[:50] + "..." if len(str(msg.content)) > 50 else str(msg.content)
            print(f"   {i+1}. {msg_type}: {content_preview}")
    
    # Check for orphaned tool_results
    orphaned_results = []
    for tool_call_id, result_pos in tool_results.items():
        if tool_call_id not in tool_uses:
            orphaned_results.append((tool_call_id, result_pos))
            print(f"   ❌ ORPHANED tool_result: {tool_call_id} at position {result_pos}")
    
    if orphaned_results:
        print(f"🚨 CORRUPTION DETECTED! About to send corrupted sequence to Anthropic API")
        print(f"   Orphaned tool_results: {len(orphaned_results)}")
        for tool_id, pos in orphaned_results:
            print(f"   - {tool_id} at position {pos}")
        
        # Don't send to API, just return error simulation
        raise Exception(f"CORRUPTION DETECTED: tool_result {orphaned_results[0][0]} has no corresponding tool_use")
    
    print(f"   ✅ Message sequence is valid - proceeding to Anthropic API")
    
    # Call original assistant function
    return original_assistant(state, config)

async def pinpoint_corruption():
    """Pinpoint exactly where corruption occurs"""
    
    global original_assistant
    
    print("🔍 Pinpointing Message Corruption Location")
    print("=" * 60)
    print("🔒 MOCK MODE - Patching assistant to detect corruption")
    print()
    
    try:
        # Patch the assistant function
        import app.service.agent.orchestration.assistant as assistant_module
        original_assistant = getattr(assistant_module, 'assistant')
        setattr(assistant_module, 'assistant', patched_assistant)
        
        print("✅ Assistant function patched - will detect corruption before API call")
        print()
        
        # Create hybrid graph builder
        builder = HybridGraphBuilder(intelligence_mode="adaptive")
        
        # Build graph 
        print("🏗️ Building hybrid graph...")
        graph = await builder.build_hybrid_investigation_graph(
            use_enhanced_tools=True,
            enable_streaming=True,
            enable_interrupts=False
        )
        print("✅ Graph built successfully")
        print()
        
        # Create test state
        investigation_id = f"pinpoint_corruption_{int(datetime.now().timestamp())}"
        entity_id = "67.76.8.209"
        entity_type = "ip"
        
        initial_state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type
        )
        
        # Configure for execution
        config = {
            "recursion_limit": 15,
            "configurable": {"thread_id": investigation_id}
        }
        
        print(f"🚀 Starting investigation with corruption detection...")
        print()
        
        # Execute and catch corruption
        try:
            result = await graph.ainvoke(initial_state, config=config)
            print("⚠️ No corruption detected - investigation completed unexpectedly")
            return {"success": False, "analysis": "No corruption detected"}
            
        except Exception as e:
            if "CORRUPTION DETECTED" in str(e):
                print(f"🎯 FOUND THE EXACT CORRUPTION POINT!")
                print(f"   Error: {str(e)}")
                
                # Extract the problematic tool_call_id
                error_msg = str(e)
                if "tool_result" in error_msg:
                    return {
                        "success": True,
                        "corruption_detected": True,
                        "error_message": str(e),
                        "analysis": "Corruption occurs just before Anthropic API call in assistant function"
                    }
            elif "tool_use_id" in str(e):
                print(f"🎯 CAUGHT ORIGINAL ERROR!")
                print(f"   Error: {str(e)}")
                return {
                    "success": True,
                    "original_error_caught": True,
                    "error_message": str(e),
                    "analysis": "Original Anthropic API error - corruption passed through undetected"
                }
            else:
                print(f"❌ Different error: {str(e)}")
                return {"success": False, "error": str(e)}
        
    except Exception as e:
        print(f"❌ Pinpointing failed: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}
    
    finally:
        # Restore original assistant function
        if original_assistant:
            import app.service.agent.orchestration.assistant as assistant_module
            setattr(assistant_module, 'assistant', original_assistant)
            print("✅ Assistant function restored")

if __name__ == "__main__":
    result = asyncio.run(pinpoint_corruption())
    
    print(f"\n🎯 CORRUPTION PINPOINTING RESULT:")
    if result.get("corruption_detected"):
        print("✅ Found corruption before API call - our patch caught it!")
    elif result.get("original_error_caught"):
        print("❌ Corruption passed through undetected - reached Anthropic API")
    else:
        print("❓ Could not pinpoint corruption source")
    
    print(f"Analysis: {result.get('analysis', 'Unknown')}")
    
    exit(0 if result.get("success") else 1)
#!/usr/bin/env python3
"""
Trace the hybrid system message flow to find where tool_use/tool_result corruption occurs
Focus on finding the exact point where message sequence breaks
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

def analyze_message_sequence(messages, step_name):
    """Analyze and print detailed message sequence information"""
    print(f"   📊 {step_name}: {len(messages)} messages")
    
    tool_uses = {}
    tool_results = {}
    
    for i, msg in enumerate(messages):
        msg_type = type(msg).__name__
        if hasattr(msg, 'tool_calls') and msg.tool_calls:
            print(f"   {i+1}. {msg_type} with {len(msg.tool_calls)} tool_calls")
            for j, tc in enumerate(msg.tool_calls):
                tool_id = tc.get('id', 'NO_ID')
                tool_uses[tool_id] = i
                print(f"      Tool call {j+1}: id={tool_id}, name={tc.get('name', 'NO_NAME')}")
        elif hasattr(msg, 'tool_call_id'):
            tool_results[msg.tool_call_id] = i
            print(f"   {i+1}. {msg_type} with tool_call_id: {msg.tool_call_id}")
        else:
            content_preview = str(msg.content)[:100] + "..." if len(str(msg.content)) > 100 else str(msg.content)
            print(f"   {i+1}. {msg_type}: {content_preview}")
    
    # Validate tool_use/tool_result pairing
    orphaned_results = []
    for tool_call_id, result_pos in tool_results.items():
        if tool_call_id not in tool_uses:
            orphaned_results.append((tool_call_id, result_pos))
            print(f"   ❌ ORPHANED tool_result: {tool_call_id} at position {result_pos}")
        else:
            use_pos = tool_uses[tool_call_id]
            print(f"   ✅ Valid pair: tool_use at {use_pos} → tool_result at {result_pos}")
    
    return len(orphaned_results) == 0, orphaned_results

async def trace_hybrid_flow():
    """Trace the hybrid system flow step by step"""
    
    print("🔍 Tracing Hybrid System Message Flow")
    print("=" * 60)
    print("🔒 MOCK MODE ONLY - Finding corruption point")
    print()
    
    try:
        # Create hybrid graph builder with detailed tracing
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
        investigation_id = f"trace_hybrid_{int(datetime.now().timestamp())}"
        entity_id = "67.76.8.209"
        entity_type = "ip_address"
        
        initial_state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type
        )
        
        # Configure for minimal execution to catch the error early
        config = {
            "recursion_limit": 8,  # Just enough to get to the error
            "configurable": {"thread_id": investigation_id}
        }
        
        print(f"🚀 Starting hybrid investigation trace...")
        print(f"   Investigation ID: {investigation_id}")
        print(f"   Entity: {entity_type} - {entity_id}")
        print()
        
        # Execute with step-by-step tracing
        step_count = 0
        try:
            async for step in graph.astream(initial_state, config=config):
                step_count += 1
                print(f"🔧 STEP {step_count}: {list(step.keys())}")
                
                for node_name, node_result in step.items():
                    print(f"   📍 Node: {node_name}")
                    
                    # Extract messages from result
                    messages = []
                    if isinstance(node_result, dict):
                        messages = node_result.get("messages", [])
                    elif hasattr(node_result, 'messages'):
                        messages = node_result.messages
                    
                    if messages:
                        is_valid, orphaned = analyze_message_sequence(messages, f"After {node_name}")
                        
                        if not is_valid:
                            print(f"🚨 CORRUPTION DETECTED IN NODE: {node_name}")
                            print(f"   Step: {step_count}")
                            print(f"   Orphaned tool_results: {orphaned}")
                            
                            # This is where the corruption happens!
                            return {
                                "success": True,  # We found the issue
                                "corruption_detected": True,
                                "corruption_node": node_name,
                                "corruption_step": step_count,
                                "orphaned_results": orphaned,
                                "analysis": f"Message sequence corruption occurs in {node_name} node"
                            }
                    else:
                        print(f"   📊 After {node_name}: No messages")
                    
                    print()
                
                # Stop if we reach the limit without error (this means corruption is elsewhere)
                if step_count >= 7:
                    print("⚠️ Reached step limit without finding corruption")
                    print("   The corruption might occur during LLM invocation, not in graph steps")
                    break
                    
        except Exception as e:
            if "tool_use_id" in str(e) and "tool_result" in str(e):
                print(f"🎯 CAUGHT THE ERROR!")
                print(f"   Error: {str(e)}")
                print(f"   Step: {step_count}")
                
                # Extract the problematic tool_use_id from error
                error_msg = str(e)
                if "tool_use_id found in `tool_result` blocks:" in error_msg:
                    start = error_msg.find("blocks: ") + 8
                    end = error_msg.find(".", start)
                    problematic_tool_id = error_msg[start:end]
                    
                    return {
                        "success": True,  # We caught the error
                        "error_caught": True,
                        "error_step": step_count,
                        "problematic_tool_id": problematic_tool_id,
                        "analysis": f"Error occurs at step {step_count} with tool_id {problematic_tool_id}"
                    }
            else:
                print(f"❌ Unexpected error: {str(e)}")
                return {"success": False, "error": str(e)}
        
        print("🤔 No corruption found in graph steps")
        print("   The issue might be in the LLM invocation itself")
        
        return {
            "success": False,
            "analysis": "No corruption detected in graph steps - issue may be in LLM processing"
        }
        
    except Exception as e:
        print(f"❌ Tracing failed: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = asyncio.run(trace_hybrid_flow())
    
    print(f"\n🎯 HYBRID TRACING RESULT:")
    if result.get("corruption_detected"):
        print(f"✅ Found corruption source: {result['corruption_node']} at step {result['corruption_step']}")
    elif result.get("error_caught"):
        print(f"✅ Caught error at step {result['error_step']} with tool_id {result.get('problematic_tool_id')}")
    else:
        print("❌ Could not pinpoint the exact corruption source")
    
    print(f"Analysis: {result.get('analysis', 'Unknown')}")
    
    exit(0 if result.get("success") else 1)
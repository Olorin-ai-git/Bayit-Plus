#!/usr/bin/env python3
"""
Trace complete message flow to find tool_use/tool_result mismatch
Focus on mock mode for cost-effective debugging
"""

import asyncio
import sys
import os
from datetime import datetime
import json

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))

from langchain_core.messages import AIMessage, ToolMessage, HumanMessage, SystemMessage
from langgraph.prebuilt import ToolNode
from app.service.agent.tools.snowflake_tool import SnowflakeQueryTool

async def trace_message_flow():
    """Trace the complete message flow to find where tool_use/tool_result breaks"""
    
    print("🔍 Tracing Message Flow for tool_use/tool_result Mismatch")
    print("=" * 60)
    print("🔒 MOCK MODE ONLY - Cost-effective debugging")
    print()
    
    try:
        # Step 1: Create a tool and simulate AI message with tool calls
        print("🔧 STEP 1: Create standard tool execution scenario")
        snowflake_tool = SnowflakeQueryTool()
        tool_node = ToolNode([snowflake_tool])
        
        # Create an AI message with tool calls (this simulates what the LLM would generate)
        ai_message = AIMessage(
            content="I need to query the database for IP information",
            tool_calls=[{
                'name': 'snowflake_query_tool',
                'args': {'query': 'SELECT * FROM TRANSACTIONS WHERE IP = \'67.76.8.209\' LIMIT 5'},
                'id': 'test_tool_call_12345',  # This is the critical ID
                'type': 'tool_call'
            }]
        )
        
        print(f"   📝 AI Message created with tool_call id: {ai_message.tool_calls[0]['id']}")
        print(f"   📝 Tool call name: {ai_message.tool_calls[0]['name']}")
        print()
        
        # Step 2: Execute tool node and inspect result
        print("🔧 STEP 2: Execute ToolNode and inspect message sequence")
        initial_state = {"messages": [ai_message]}
        
        tool_result = await tool_node.ainvoke(initial_state)
        print(f"   📊 Tool result type: {type(tool_result)}")
        
        if isinstance(tool_result, dict) and "messages" in tool_result:
            tool_messages = tool_result["messages"]
            print(f"   📊 Tool returned {len(tool_messages)} messages")
            
            for i, msg in enumerate(tool_messages):
                msg_type = type(msg).__name__
                if hasattr(msg, 'tool_call_id'):
                    print(f"   📝 Message {i+1}: {msg_type} with tool_call_id: {msg.tool_call_id}")
                    
                    # CRITICAL CHECK: Does tool_call_id match the original?
                    if msg.tool_call_id == ai_message.tool_calls[0]['id']:
                        print(f"   ✅ tool_call_id MATCHES: {msg.tool_call_id}")
                    else:
                        print(f"   ❌ tool_call_id MISMATCH!")
                        print(f"      Expected: {ai_message.tool_calls[0]['id']}")
                        print(f"      Got: {msg.tool_call_id}")
                else:
                    print(f"   📝 Message {i+1}: {msg_type} (no tool_call_id)")
        print()
        
        # Step 3: Simulate complete message sequence
        print("🔧 STEP 3: Simulate complete message sequence as it would appear to LLM")
        
        # This is the sequence that gets passed to the Anthropic API
        complete_sequence = [ai_message] + tool_result["messages"]
        
        print(f"   📊 Complete sequence has {len(complete_sequence)} messages:")
        for i, msg in enumerate(complete_sequence):
            msg_type = type(msg).__name__
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                print(f"   {i+1}. {msg_type} with {len(msg.tool_calls)} tool_calls")
                for j, tc in enumerate(msg.tool_calls):
                    print(f"      Tool call {j+1}: id={tc['id']}, name={tc['name']}")
            elif hasattr(msg, 'tool_call_id'):
                print(f"   {i+1}. {msg_type} with tool_call_id: {msg.tool_call_id}")
            else:
                print(f"   {i+1}. {msg_type}")
        print()
        
        # Step 4: Validate message sequence correctness
        print("🔧 STEP 4: Validate message sequence correctness")
        
        # Find all tool_use and tool_result pairs
        tool_uses = {}  # id -> message_index
        tool_results = {}  # tool_call_id -> message_index
        
        for i, msg in enumerate(complete_sequence):
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_uses[tc['id']] = i
                    print(f"   📝 Found tool_use: {tc['id']} at position {i}")
            elif hasattr(msg, 'tool_call_id'):
                tool_results[msg.tool_call_id] = i
                print(f"   📝 Found tool_result: {msg.tool_call_id} at position {i}")
        
        print()
        print("🔍 VALIDATION RESULTS:")
        
        # Check for orphaned tool_results
        orphaned_results = []
        for tool_call_id, result_pos in tool_results.items():
            if tool_call_id not in tool_uses:
                orphaned_results.append((tool_call_id, result_pos))
                print(f"   ❌ ORPHANED tool_result: {tool_call_id} at position {result_pos}")
            else:
                use_pos = tool_uses[tool_call_id]
                if use_pos < result_pos:
                    print(f"   ✅ Valid pair: tool_use at {use_pos} → tool_result at {result_pos}")
                else:
                    print(f"   ❌ INVALID ORDER: tool_result at {result_pos} before tool_use at {use_pos}")
        
        # Check for orphaned tool_uses
        orphaned_uses = []
        for tool_call_id, use_pos in tool_uses.items():
            if tool_call_id not in tool_results:
                orphaned_uses.append((tool_call_id, use_pos))
                print(f"   ⚠️ ORPHANED tool_use: {tool_call_id} at position {use_pos} (no result)")
        
        print()
        
        # Final assessment
        if orphaned_results:
            print("🚨 PROBLEM IDENTIFIED: Orphaned tool_result messages!")
            print("   This will cause the Anthropic API error we're seeing.")
            print("   The tool_result references a tool_use_id that doesn't exist in the sequence.")
            return {
                "success": False,
                "issue": "orphaned_tool_results",
                "orphaned_results": orphaned_results,
                "complete_sequence": len(complete_sequence),
                "analysis": "tool_result messages reference tool_use_ids that are not present"
            }
        elif orphaned_uses:
            print("⚠️ INCOMPLETE: tool_use without tool_result")
            print("   This is less critical but indicates incomplete tool execution.")
            return {
                "success": False,
                "issue": "orphaned_tool_uses", 
                "orphaned_uses": orphaned_uses,
                "complete_sequence": len(complete_sequence),
                "analysis": "tool_use messages without corresponding tool_results"
            }
        else:
            print("✅ Message sequence is VALID!")
            print("   All tool_use/tool_result pairs are correctly matched.")
            return {
                "success": True,
                "complete_sequence": len(complete_sequence),
                "tool_pairs": len(tool_uses),
                "analysis": "All tool_use/tool_result pairs are correctly matched"
            }
            
    except Exception as e:
        print(f"❌ Tracing failed: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = asyncio.run(trace_message_flow())
    
    print(f"\n🎯 TRACING RESULT:")
    if result.get("success"):
        print("✅ Standard ToolNode produces valid message sequences")
        print("   The issue must be elsewhere in the hybrid system")
    else:
        print("❌ Found the root cause of the tool_use/tool_result mismatch!")
        print(f"   Issue: {result.get('issue', 'unknown')}")
        print(f"   Analysis: {result.get('analysis', 'unknown')}")
    
    exit(0 if result.get("success") else 1)
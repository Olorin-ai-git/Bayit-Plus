#!/usr/bin/env python3
"""
Test to understand how standard ToolNode handles messages
Compare with our enhanced tool node to identify the message sequence issue
"""

import asyncio
import os
import sys

# Add the project root to Python path
sys.path.insert(0, os.path.abspath("../.."))

from langchain_core.messages import AIMessage, ToolMessage
from langgraph.prebuilt import ToolNode

from app.service.agent.tools.snowflake_tool import SnowflakeQueryTool


async def test_standard_tool_node():
    """Test standard ToolNode message handling"""

    print("🔧 Testing Standard ToolNode Message Handling")
    print("=" * 50)

    # Create a tool
    snowflake_tool = SnowflakeQueryTool()
    tool_node = ToolNode([snowflake_tool])

    # Create a state with AI message containing tool calls
    ai_message = AIMessage(
        content="Let me query the database",
        tool_calls=[
            {
                "name": "snowflake_query_tool",
                "args": {"query": "SELECT 1 as test"},
                "id": "test_tool_call_123",
                "type": "tool_call",
            }
        ],
    )

    initial_state = {"messages": [ai_message]}

    print("📝 Initial state:")
    print(f"   Messages: {len(initial_state['messages'])}")
    print(f"   AI message tool calls: {len(ai_message.tool_calls)}")
    print()

    try:
        # Execute tool node
        print("🚀 Executing standard ToolNode...")
        result = await tool_node.ainvoke(initial_state)

        print("📊 Tool execution result:")
        print(f"   Result type: {type(result)}")

        if isinstance(result, dict) and "messages" in result:
            messages = result["messages"]
            print(f"   Messages returned: {len(messages)}")

            for i, msg in enumerate(messages):
                msg_type = type(msg).__name__
                if hasattr(msg, "tool_call_id"):
                    print(f"   {i+1}. {msg_type} (tool_call_id: {msg.tool_call_id})")
                else:
                    print(f"   {i+1}. {msg_type}")

        print()
        print("🔍 Message sequence analysis:")

        # Check if we now have proper tool_use -> tool_result pairing
        original_messages = initial_state["messages"]
        new_messages = result.get("messages", [])

        print(f"   Original messages: {len(original_messages)}")
        print(f"   New messages: {len(new_messages)}")

        # Analyze the complete message sequence
        all_messages = original_messages + new_messages
        print(f"   Total message sequence: {len(all_messages)}")

        for i, msg in enumerate(all_messages):
            msg_type = type(msg).__name__
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                print(f"   {i+1}. {msg_type} with {len(msg.tool_calls)} tool calls")
            elif hasattr(msg, "tool_call_id"):
                print(f"   {i+1}. {msg_type} (tool_call_id: {msg.tool_call_id})")
            else:
                print(f"   {i+1}. {msg_type}")

        print()
        print("✅ Standard ToolNode test complete")

        return {
            "success": True,
            "original_messages": len(original_messages),
            "new_messages": len(new_messages),
            "total_messages": len(all_messages),
        }

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        print("Traceback:")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    result = asyncio.run(test_standard_tool_node())

    if result.get("success"):
        print("\n🎯 SUCCESS: Standard ToolNode behavior understood")
    else:
        print("\n🎯 FAILURE: Could not analyze standard ToolNode")
